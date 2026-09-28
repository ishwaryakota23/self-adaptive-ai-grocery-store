declare const process: any;

import { GROQ_TOOL_DEFINITIONS, executeCustomerAgentTool, ToolExecutionResult } from '../services/customerAgentTools';
import { languageDetector, LanguageDetectionResult } from '../services/languageDetector';
import { hindsightService } from '../services/hindsightService';
import { db } from '../services/db';
import { Product, ShoppingMission, CartItem } from '../types';

export interface GroqAgentRequest {
  sessionId: string;
  customerId?: string;
  input: string;
  language?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  activeProductContext?: { productId?: string; productName?: string };
}

export interface GroqAgentResponse {
  success: boolean;
  groqConfigured: boolean;
  message: string;
  detected_language: string;
  response_language: string;
  is_code_mixed: boolean;
  intent?: string;
  productFound?: Product;
  isAvailable?: boolean;
  alternatives?: Product[];
  aisle?: string;
  quickActions?: Array<{ label: string; action: string; route?: string }>;
  toolExecutions?: ToolExecutionResult[];
  activeProductContext?: { productId?: string; productName?: string };
  recalledMemories?: string[];
  retainedMemoryId?: string;
  error?: string;
}

export class GroqCustomerAgentServer {
  private getApiKey(): string | undefined {
    return process.env.GROQ_API_KEY?.trim();
  }

  private getModel(): string {
    return process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 5 && !key.includes('placeholder');
  }

  public async processRequest(req: GroqAgentRequest): Promise<GroqAgentResponse> {
    const sessionId = req.sessionId || 'USER00001';
    const customerId = req.customerId || sessionId;
    const input = req.input.trim();

    // 1. Language Detection & Context
    const langResult: LanguageDetectionResult = languageDetector.detectLanguage(input, sessionId);

    // 2. Check Groq Configuration (Section 2, 3, 21, 23)
    if (!this.isConfigured()) {
      return {
        success: false,
        groqConfigured: false,
        message: "Groq AI service is currently unavailable because GROQ_API_KEY is not configured in the backend environment. Please configure GROQ_API_KEY in your .env file to enable multilingual AI reasoning.",
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        error: "GROQ_API_KEY_NOT_CONFIGURED"
      };
    }

    const apiKey = this.getApiKey()!;
    const model = this.getModel();

    // 3. Load Current Session Context (Section 9)
    const mission = db.getActiveMission(customerId);
    const cart = db.getCart(customerId);
    const cartTotals = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const prefs = db.getCustomerPreferences(customerId);

    // 3b. Recall Experiential Memories from Hindsight Customer Bank (Section 10, 11)
    let memoryPromptInjection = '';
    let recalledMemoriesList: string[] = [];
    try {
      const hsRecall = await hindsightService.recallCustomerMemories(customerId, input);
      if (hsRecall.success && hsRecall.results.length > 0) {
        recalledMemoriesList = hsRecall.results.map(r => r.text);
        if (hsRecall.promptString) {
          memoryPromptInjection = `\nPAST EXPERIENCES & PREFERENCES FROM PREVIOUS VISITS (Hindsight Memory):\n${hsRecall.promptString}\nCRITICAL: Personalize suggestions, adhere to dietary bounds, and respect past preferences.\n`;
        } else {
          memoryPromptInjection = `\nPAST EXPERIENCES & PREFERENCES FROM PREVIOUS VISITS (Hindsight Memory):\n` +
            hsRecall.results.map(r => `- ${r.text}`).join('\n') +
            `\nCRITICAL: Personalize suggestions, adhere to dietary bounds, and respect past preferences.\n`;
        }
      }
    } catch (err: any) {
      console.warn('[CustomerAgent] Hindsight recall failed gracefully:', err?.message || err);
    }

    // Build comprehensive System Prompt
    const systemPrompt = `You are GrocerAI, an intelligent grocery shopping assistant for customer session ${sessionId}.
Context: Session=${sessionId}, Lang=${langResult.detected_language}, Cart=${cart.length} items (₹${cartTotals}), PrevProduct=${req.activeProductContext?.productName || 'None'}.${memoryPromptInjection}
Rules:
1. Multilingual: If customer speaks Telugu/Hindi or code-mixes (e.g. "Curd stock lo undha?", "Paneer kidhar hai?", "Naku bread cart lo add chey"), reply naturally in that language/code-mix. If English, reply in English.
2. Context: For follow-ups like "How much?", "Where is it?", "Add two", use prior product (${req.activeProductContext?.productName || 'active product'}).
3. Tools: ALWAYS call tools to check inventory availability, aisle location, price, cart, or substitutes for out-of-stock items. Keep replies concise (under 2 sentences).
4. Memory Alignment: If recalled past experiences indicate a preference or dietary restriction (e.g. lactose intolerance, bread preference, favorite brand), proactively incorporate it in recommendations or substitution advice.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content?: string; tool_calls?: any[]; tool_call_id?: string; name?: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Append prior conversational turns
    if (req.history && req.history.length > 0) {
      for (const h of req.history.slice(-4)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Append current user message
    messages.push({ role: 'user', content: input });

    const toolExecutions: ToolExecutionResult[] = [];
    let updatedProductContext = req.activeProductContext;
    let identifiedProduct: Product | undefined;
    let isAvailableResult: boolean | undefined;
    let dynamicSubstitutes: Product[] = [];
    let detectedAisle: string | undefined;

    try {
      // 4. First Groq LLM Call (Tool Selection)
      let activeModel = model;
      let firstResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
          tools: GROQ_TOOL_DEFINITIONS,
          tool_choice: 'auto',
          temperature: 0.2,
          max_tokens: 500
        })
      });

      // If the specific model is not available in this Groq account/tier, fallback to available Groq model
      if (firstResponse.status === 404) {
        const errText = await firstResponse.text();
        if (errText.includes('model_not_found') || errText.includes('does not exist')) {
          console.warn(`Groq model "${activeModel}" is not enabled on this account. Trying available Groq model "qwen/qwen3.8-27b"...`);
          activeModel = 'qwen/qwen3.8-27b';
          firstResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: activeModel,
              messages,
              tools: GROQ_TOOL_DEFINITIONS,
              tool_choice: 'auto',
              temperature: 0.2,
              max_tokens: 500
            })
          });
        }
      }

      // Handle 429 rate limit with automatic backoff
      if (firstResponse.status === 429) {
        console.warn('Groq 429 rate limit reached. Waiting 10 seconds for window reset...');
        await new Promise(r => setTimeout(r, 10000));
        firstResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: activeModel,
            messages,
            tools: GROQ_TOOL_DEFINITIONS,
            tool_choice: 'auto',
            temperature: 0.2,
            max_tokens: 500
          })
        });
      }

      if (!firstResponse.ok) {
        const errText = await firstResponse.text();
        console.error('Groq API Error:', firstResponse.status, errText);
        return {
          success: false,
          groqConfigured: true,
          message: `Groq AI service error (${firstResponse.status}). Please verify your GROQ_API_KEY.`,
          detected_language: langResult.detected_language,
          response_language: langResult.response_language,
          is_code_mixed: langResult.is_code_mixed,
          error: `GROQ_HTTP_${firstResponse.status}: ${errText}`
        };
      }

      const firstData = await firstResponse.json();
      const choice = firstData.choices?.[0];
      const assistantMessage = choice?.message;

      // 5. Handle Tool Calls if Groq requested them
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            console.warn('Failed to parse tool call arguments:', toolCall.function.arguments);
          }

          // Automatically inject active product if parameter is missing in follow-up
          if (!fnArgs.productId && !fnArgs.productIdOrName && updatedProductContext?.productId) {
            fnArgs.productId = updatedProductContext.productId;
            fnArgs.productIdOrName = updatedProductContext.productId;
          }

          // Execute tool against real backend
          const execRes = await executeCustomerAgentTool(fnName, fnArgs, sessionId);
          toolExecutions.push(execRes);

          // Update product context from tool execution
          if (execRes.result?.productId) {
            updatedProductContext = {
              productId: execRes.result.productId,
              productName: execRes.result.name || execRes.result.productName
            };
            identifiedProduct = db.getProductById(execRes.result.productId);
          }
          if (execRes.result?.available !== undefined) {
            isAvailableResult = execRes.result.available;
          }
          if (execRes.result?.aisle) {
            detectedAisle = execRes.result.aisle;
          }
          if (execRes.result?.substitutes && execRes.result.substitutes.length > 0) {
            dynamicSubstitutes = execRes.result.substitutes;
          }

          // Feed tool result back to Groq
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(execRes.result || { error: execRes.error })
          });
        }

        // 6. Second Groq LLM Call (Natural Language Reply from Tool Results)
        let secondResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: activeModel,
            messages,
            temperature: 0.3,
            max_tokens: 500
          })
        });

        if (secondResponse.status === 429) {
          console.warn('Groq 429 rate limit reached on second response. Waiting 10s...');
          await new Promise(r => setTimeout(r, 10000));
          secondResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: activeModel,
              messages,
              temperature: 0.3,
              max_tokens: 500
            })
          });
        }

        if (secondResponse.ok) {
          const secondData = await secondResponse.json();
          const finalReply = secondData.choices?.[0]?.message?.content || "I've checked the store inventory for you.";

          // Build dynamic quick actions based on tool results
          const quickActions = this.buildQuickActions(toolExecutions, identifiedProduct, dynamicSubstitutes, sessionId);

          // Automatic preference / dietary retention
          let retainedDocId: string | undefined;
          try {
            const lower = input.toLowerCase();
            const isPref =
              lower.includes('prefer') || lower.includes('like') || lower.includes('love') ||
              lower.includes('hate') || lower.includes('dislike') || lower.includes('allergic') ||
              lower.includes('intolerant') || lower.includes('vegan') || lower.includes('vegetarian') ||
              lower.includes('remember') || lower.includes('gurtunchuko') || lower.includes('istam') ||
              lower.includes('nachuthundi') || lower.includes('pasand') || lower.includes('yaad rakhna');

            if (isPref) {
              const ret = await hindsightService.retainCustomerExperience({
                customerId,
                observation: input,
                context: `Customer preference declared during session ${sessionId}`,
                tags: ['preference', langResult.detected_language]
              });
              if (ret.success) {
                retainedDocId = ret.memoryId;
              }
            }
          } catch (err: any) {
            console.warn('[CustomerAgent] Hindsight retention failed gracefully:', err?.message || err);
          }

          return {
            success: true,
            groqConfigured: true,
            message: finalReply,
            detected_language: langResult.detected_language,
            response_language: langResult.response_language,
            is_code_mixed: langResult.is_code_mixed,
            productFound: identifiedProduct,
            isAvailable: isAvailableResult,
            alternatives: dynamicSubstitutes.length > 0 ? dynamicSubstitutes : undefined,
            aisle: detectedAisle || identifiedProduct?.aisle,
            quickActions,
            toolExecutions,
            activeProductContext: updatedProductContext,
            recalledMemories: recalledMemoriesList,
            retainedMemoryId: retainedDocId
          };
        }
      }

      // If no tool call was required (e.g. general greeting or explanation)
      const directReply = assistantMessage?.content || "How can I assist your shopping trip today?";

      let retainedDocId: string | undefined;
      try {
        const lower = input.toLowerCase();
        const isPref =
          lower.includes('prefer') || lower.includes('like') || lower.includes('love') ||
          lower.includes('hate') || lower.includes('dislike') || lower.includes('allergic') ||
          lower.includes('intolerant') || lower.includes('vegan') || lower.includes('vegetarian') ||
          lower.includes('remember') || lower.includes('gurtunchuko') || lower.includes('istam') ||
          lower.includes('nachuthundi') || lower.includes('pasand') || lower.includes('yaad rakhna');

        if (isPref) {
          const ret = await hindsightService.retainCustomerExperience({
            customerId,
            observation: input,
            context: `Customer preference declared during session ${sessionId}`,
            tags: ['preference', langResult.detected_language]
          });
          if (ret.success) {
            retainedDocId = ret.memoryId;
          }
        }
      } catch (err: any) {
        console.warn('[CustomerAgent] Hindsight retention failed gracefully:', err?.message || err);
      }

      return {
        success: true,
        groqConfigured: true,
        message: directReply,
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        quickActions: [
          { label: 'View Shopping Mission', action: 'view_mission', route: '/customer/mission' },
          { label: 'Open Store Map', action: 'map', route: '/customer/map' }
        ],
        activeProductContext: updatedProductContext,
        recalledMemories: recalledMemoriesList,
        retainedMemoryId: retainedDocId
      };
    } catch (err: any) {
      console.error('Groq agent execution failure:', err);
      return {
        success: false,
        groqConfigured: true,
        message: "I encountered a network issue while contacting the Groq AI service. Please try again.",
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        error: err?.message || 'Network error'
      };
    }
  }

  private buildQuickActions(
    executions: ToolExecutionResult[],
    product?: Product,
    substitutes?: Product[],
    sessionId = 'USER00001'
  ): Array<{ label: string; action: string; route?: string }> {
    const actions: Array<{ label: string; action: string; route?: string }> = [];

    // If substitution was found
    if (substitutes && substitutes.length > 0) {
      const topSub = substitutes[0];
      actions.push({
        label: `Accept ${topSub.name.split(' ')[0]} Substitute`,
        action: 'accept_substitute',
        route: `/customer/products/${topSub.id}`
      });
      actions.push({
        label: 'Decline Substitution',
        action: 'reject_substitute'
      });
    } else if (product) {
      const isStocked = (db.getInventoryByProductId(product.id)?.quantity || 0) > 0;
      if (isStocked) {
        actions.push({
          label: `Add to Cart (₹${product.price})`,
          action: 'add_to_cart'
        });
        actions.push({
          label: `Navigate to ${product.aisle}`,
          action: 'map',
          route: `/customer/map?product=${product.id}`
        });
      } else {
        actions.push({
          label: 'Find Substitutes',
          action: 'find_substitutes'
        });
        actions.push({
          label: 'Request Store Restock',
          action: 'request_restock'
        });
      }
    }

    // If cart was queried or updated
    const hasCartTool = executions.some(e => e.tool_name === 'addToCart' || e.tool_name === 'getCart');
    if (hasCartTool) {
      actions.push({
        label: 'View Cart & Checkout',
        action: 'view_cart',
        route: '/customer/cart'
      });
    }

    // Default navigation fallback
    if (actions.length === 0) {
      actions.push({ label: 'Open Store Map', action: 'map', route: '/customer/map' });
      actions.push({ label: 'View Shopping Mission', action: 'view_mission', route: '/customer/mission' });
    }

    return actions;
  }
}

export const groqCustomerAgentServer = new GroqCustomerAgentServer();
