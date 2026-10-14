declare const process: any;

import { GROQ_TOOL_DEFINITIONS, executeCustomerAgentTool, ToolExecutionResult } from '../services/customerAgentTools.js';
import { languageDetector, LanguageDetectionResult } from '../services/languageDetector.js';
import { hindsightService } from '../services/hindsightService.js';
import { db } from '../services/db.js';
import { Product, ShoppingMission, CartItem } from '../types/index.js';

export interface GroqAgentRequest {
  sessionId: string;
  customerId?: string;
  verifiedCustomerId?: string;
  input: string;
  language?: string;
  preferredLanguage?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  activeProductContext?: CustomerProductContext;
}

export interface CustomerProductOption {
  productId: string;
  name: string;
  brand: string;
  skuId?: string;
}

export interface CustomerProductContext {
  productId?: string;
  productName?: string;
  productOptions?: CustomerProductOption[];
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (left.length > right.length) i++;
    else if (right.length > left.length) j++;
    else { i++; j++; }
  }
  return edits + Number(i < left.length || j < right.length) <= 1;
}

/** Resolve a follow-up against products actually returned and shown earlier. */
export function resolveOfferedProductSelection(input: string, context?: CustomerProductContext): Product | undefined {
  const options = (context?.productOptions || []).filter(option => db.getProductById(option.productId));
  if (!options.length) return undefined;
  const clean = input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const ordinal = clean.match(/\b(first|1st|one|1|second|2nd|two|2|third|3rd|three|3|fourth|4th|four|4)\s*(?:option|choice|one)?\b/);
  if (ordinal) {
    const number = /^(first|1st|one|1)$/.test(ordinal[1]) ? 1 : /^(second|2nd|two|2)$/.test(ordinal[1]) ? 2 : /^(third|3rd|three|3)$/.test(ordinal[1]) ? 3 : 4;
    const selected = options[number - 1];
    return selected ? db.getProductById(selected.productId) : undefined;
  }
  const selection = clean.replace(/\b(add|put|place|buy|cart|basket|to|my|the|please|item|lo|ki|veyi|veyyi|vey|vesuko|cheyyi|chey|addcheyyi|addchey|can|you|would|like|i|prefer)\\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!selection) return undefined;
  const tokens = selection.split(' ').filter(token => token.length > 1);
  const matches = options.filter(option => {
    const brand = option.brand.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const brandWords = brand.split(/\\s+/).filter(Boolean);
    const brandMatch = brandWords.some(brandWord => tokens.some(token => token === brandWord || (brandWord.length >= 6 && editDistanceAtMostOne(token, brandWord))));
    const name = option.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
    const nameMatch = tokens.length > 0 && tokens.every(token => name.includes(token));
    return brandMatch || nameMatch;
  });
  return matches.length === 1 ? db.getProductById(matches[0].productId) : undefined;
}

function isAddIntent(text: string): boolean {
  return /\b(add|put|place|buy)\b|\b(cart|basket)\s+lo\s+(?:veyi|veyyi|vesuko)|\b(?:veyi|veyyi|vesuko|addcheyyi)\b/i.test(text);
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
  activeProductContext?: CustomerProductContext;
  recalledMemories?: string[];
  memoryStatus?: 'retrieved' | 'empty' | 'unavailable' | 'not_attempted';
  identityStatus?: 'verified' | 'missing' | 'invalid_or_revoked' | 'verification_unavailable';
  retainedMemoryId?: string;
  error?: string;
}

export class GroqCustomerAgentServer {
  private getApiKey(): string | undefined {
    return process.env.GROQ_API_KEY?.trim();
  }

  private getModel(): string {
    return process.env.GROQ_MODEL?.trim() || 'qwen/qwen3.8-27b';
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 5 && !key.includes('placeholder');
  }

  public async processRequest(req: GroqAgentRequest): Promise<GroqAgentResponse> {
    const sessionId = req.sessionId || 'USER00001';
    const resolvedCustomerId = req.customerId || '';
    const customerId = resolvedCustomerId;
    const rawInput = req.input || (req as any).message || (req as any).query || '';
    const input = rawInput.trim();

    // 1. Language Detection & Context
    const langResult: LanguageDetectionResult = languageDetector.detectLanguage(input, sessionId);
    const activeLang = req.preferredLanguage || langResult.response_language || langResult.detected_language || 'en';

    // Retain a durable customer preference before calling the model so a Groq
    // outage cannot silently discard it. The API authenticates this customer ID.
    const retainedMemoryId = customerId
      ? await Promise.race([
          this.retainPreferences(customerId, sessionId, input, langResult.detected_language),
          new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 2500))
        ])
      : undefined;

    // 3. Load Current Session Context (Section 9)
    const mission = resolvedCustomerId ? db.getActiveMission(resolvedCustomerId) : db.getActiveMission(sessionId);
    const cart = db.getCart(sessionId).length > 0 ? db.getCart(sessionId) : (resolvedCustomerId ? db.getCart(resolvedCustomerId) : []);
    const cartTotals = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    // Recall only memories actually stored in this authenticated customer's Hindsight bank.
    let memoryPromptInjection = '';
    let recalledMemoriesList: string[] = [];
    let memoryRecallError = '';
    let memoryStatus: 'retrieved' | 'empty' | 'unavailable' | 'not_attempted' = 'not_attempted';
    if (resolvedCustomerId) {
      try {
        const recallPromise = hindsightService.recallCustomerMemories(resolvedCustomerId, input);
        const timeoutPromise = new Promise<{ success: boolean; results: any[]; promptString: string; error?: string }>(
          resolve => setTimeout(() => resolve({ success: false, results: [], promptString: '', error: 'Hindsight recall timed out after 2.5 seconds.' }), 2500)
        );
        const hsRecall = await Promise.race([recallPromise, timeoutPromise]);
        if (hsRecall.success && hsRecall.results.length > 0) {
          recalledMemoriesList = hsRecall.results.map(r => r.text);
          memoryStatus = 'retrieved';
          const reflection = await Promise.race([
            hindsightService.reflect(
              hindsightService.getCustomerBank(resolvedCustomerId),
              input,
              { context: `Use only these recalled customer memories; current request: ${input}` }
            ),
            new Promise<{ success: boolean; answer: string }>(resolve => setTimeout(() => resolve({ success: false, answer: '' }), 2500))
          ]);
          memoryPromptInjection = `\nPAST EXPERIENCES & PREFERENCES FROM PREVIOUS VISITS (Hindsight Memory):\n` +
            recalledMemoriesList.slice(0, 4).map(t => `- ${t}`).join('\n') +
            (reflection.success ? `\nHINDSIGHT REFLECTION (inference, verify against the recalled facts): ${reflection.answer}\n` : '') +
            `\nCRITICAL: Personalize suggestions, adhere to dietary bounds, and respect past preferences.\n`;
        } else if (hsRecall.success) {
          memoryStatus = 'empty';
        } else {
          memoryStatus = 'unavailable';
          memoryRecallError = hsRecall.error || 'Hindsight recall failed.';
        }
      } catch (err: any) {
        memoryStatus = 'unavailable';
        memoryRecallError = err?.message || 'Hindsight recall failed.';
        console.warn('[CustomerAgent] Hindsight recall failed gracefully:', err?.message || err);
      }
    }

    const offeredSelection = resolveOfferedProductSelection(input, req.activeProductContext);
    const lastAssistantPrompt = [...(req.history || [])].reverse().find(turn => turn.role === 'assistant')?.content || '';
    const earlierAddRequest = (req.history || []).some(turn => turn.role === 'user' && isAddIntent(turn.content));
    const assistantWasAskingForAddChoice = /(?:which|what|choose|pick|option|brand|prefer)/i.test(lastAssistantPrompt)
      && /(?:add|cart|choose|prefer|option|brand)/i.test(lastAssistantPrompt);
    if (offeredSelection && (isAddIntent(input) || (earlierAddRequest && assistantWasAskingForAddChoice))) {
      const before = db.getCart(sessionId).find(item => item.product_id === offeredSelection.id)?.quantity || 0;
      const execution = await executeCustomerAgentTool('addToCart', {
        productId: offeredSelection.id,
        productIdOrName: offeredSelection.id,
        quantity: 1
      }, sessionId, resolvedCustomerId);
      (execution as any).arguments = { productId: offeredSelection.id, productIdOrName: offeredSelection.id, quantity: 1 };
      (execution as any).tool_call_id = `offered-selection-${offeredSelection.id}`;
      const after = db.getCart(sessionId).find(item => item.product_id === offeredSelection.id)?.quantity || 0;
      if (execution.success && after !== before + 1) {
        execution.success = false;
        execution.error = `The cart did not reflect the selected ${offeredSelection.name}.`;
        execution.result = null;
      }
      const success = execution.success;
      const memoryNote = memoryStatus === 'unavailable' ? ' Saved customer memory is currently unavailable.' : '';
      return {
        success,
        groqConfigured: this.isConfigured(),
        message: success
          ? `Added ${offeredSelection.name} to your cart and verified the cart update.${memoryNote}`
          : `I couldn't add ${offeredSelection.name}: ${execution.error || 'the cart update could not be verified'}. Your cart was not confirmed as changed.${memoryNote}`,
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        intent: success ? 'CART_ITEM_ADDED' : 'CART_ADD_FAILED',
        productFound: offeredSelection,
        toolExecutions: [execution],
        activeProductContext: { ...req.activeProductContext, productId: offeredSelection.id, productName: offeredSelection.name },
        recalledMemories: recalledMemoriesList,
        memoryStatus,
        retainedMemoryId
      };
    }

    // Memory recall is an independent service and must still run when Groq is
    // missing or unavailable.
    if (!this.isConfigured()) {
      return {
        success: false,
        groqConfigured: false,
        message: `Groq AI is not configured on the backend. Set GROQ_API_KEY in the server environment. Customer memory recall was attempted independently.${memoryRecallError ? ` Hindsight recall issue: ${memoryRecallError}` : ''}`,
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        recalledMemories: recalledMemoriesList,
        memoryStatus,
        error: "GROQ_API_KEY_NOT_CONFIGURED"
      };
    }

    const apiKey = this.getApiKey()!;
    const model = this.getModel();

    // Build comprehensive System Prompt
    const offeredOptionsContext = (req.activeProductContext?.productOptions || []).map((option, index) => `${index + 1}. ${option.name} | brand=${option.brand} | productId=${option.productId}${option.skuId ? ` | sku=${option.skuId}` : ''}`).join('\n');
    const systemPrompt = `You are GrocerAI (JARVIS), an intelligent, conversational supermarket shopping assistant and culinary advisor for customer session ${sessionId} (Customer: ${resolvedCustomerId}).
Context: Session=${sessionId}, Customer=${resolvedCustomerId}, Language=${activeLang || langResult.detected_language || 'en'}, Cart=${cart.length} items (₹${cartTotals}), PrevProduct=${req.activeProductContext?.productName || 'None'}.
Previously offered catalogue records (use these exact product IDs when the customer selects one):\n${offeredOptionsContext || 'None'}.${memoryPromptInjection}${memoryRecallError ? `\nHINDSIGHT RECALL FAILED: ${memoryRecallError}. Do not claim saved preferences or past customer experiences; tell the customer that saved memories could not be loaded and continue without them.\n` : ''}

Core Instructions:
0. Memory honesty: Claim a past preference or experience only when it appears in the Hindsight memories supplied below. If recall is empty or unavailable, say you do not have that past information; do not invent it.
1. Multilingual Fluency: Always respond in the customer's chosen language (${activeLang || langResult.detected_language || 'en'}).
   - Telugu: If the customer asks in Telugu or Telugu-English code-mix (e.g. "బ్రౌన్ బ్రెడ్ కార్ట్ లో వేయి", "నాకు పాలు కావాలి", "హే జార్విస్", "బ్రేక్‌ఫాస్ట్ కి ఏమి చేయాలి?"), reply warmly and naturally in Telugu.
   - Hindi: If in Hindi (e.g. "ब्राउन ब्रेड कार्ट में जोड़ें", "पनीर कहाँ है?"), reply warmly and naturally in Hindi.
   - English: If in English, reply in natural, friendly English.
2. Cart actions: Resolve products, prices, stock, cart totals, and locations through live tools. Ask which brand or size when a generic request matches multiple products; never choose a default or top-rated SKU. Confirm a mutation only after its tool succeeds and the resulting cart is verified.
3. Keep replies specific and concise. Use tool results for catalogue facts; do not invent nutrition facts, stock, prices, or locations.
4. Meal planning: Ground suggestions in live catalogue results, calculate totals from returned prices, and state only supported nutrition or suitability facts.
5. Substitutions: Use live availability and substitute tool results; do not invent matches or stock.
6. Tone: Helpful, proactive, concise (2-3 natural sentences). Call the appropriate catalogue, cart, inventory, and substitution tools.
CRITICAL VERIFIED-ACTION POLICY (overrides any conflicting example above):
- Understand varied wording, informal speech, common speech-recognition errors, follow-up references, Telugu, Hindi, and Telugu-English code-mixing such as "brown bread cart lo add cheyyi". Use recent turns and active product context to resolve "that one" or "adi" only when unambiguous.
- For catalog facts, use live tools for product names, brands, current prices, stock, aisle, and available substitutes. Never invent those values or precise nutrition facts.
- For cart actions, resolve the exact catalog product and current cart first. If multiple SKUs match, ask which brand/size; never choose a first match or a default brand. Call exactly one add/remove/update tool only after the product and quantity are clear.
- Confirm a cart mutation only when the tool succeeded and the application verifies the resulting cart. A failed tool means tell the customer that the cart was not changed.
- Ask explicit confirmation before clearing a cart. A "yes" confirms only when the immediately preceding assistant turn asked to clear it.
- Use getCart for cart follow-ups. Preserve the selected product through a follow-up only when the conversation context makes the reference clear; otherwise ask one short question.
- Keep suggestions grounded in actual catalog, stock, and price data. Keep the reply concise and suitable for speech.`;

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
      const cartMutationKeys = new Set<string>();
    let updatedProductContext: CustomerProductContext | undefined = req.activeProductContext;
    let offeredProducts = req.activeProductContext?.productOptions || [];
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
        const providerError = this.describeProviderError(firstResponse.status, errText);
        console.error('[CustomerAgent] Groq request failed:', providerError.code || firstResponse.status);
        return {
          success: false,
          groqConfigured: true,
          message: providerError.message,
          detected_language: langResult.detected_language,
          response_language: langResult.response_language,
          is_code_mixed: langResult.is_code_mixed,
          recalledMemories: recalledMemoriesList,
          memoryStatus,
          error: `GROQ_HTTP_${firstResponse.status}${providerError.code ? `_${providerError.code}` : ''}`
        };
      }

      const firstData = await firstResponse.json();
      const choice = firstData.choices?.[0];
      const assistantMessage = choice?.message;

      // 5. Handle Tool Calls if Groq requested them (Native tool_calls or Qwen <tool_call> tag)
      let toolCalls = assistantMessage?.tool_calls || [];
      if (toolCalls.length === 0 && assistantMessage?.content && assistantMessage.content.includes('<tool_call>')) {
        const match = assistantMessage.content.match(/<function=([a-zA-Z0-9_]+)>([\s\S]*?)<\/function>/);
        if (match) {
          const fnName = match[1];
          let args: any = {};
          try { args = JSON.parse(match[2].trim() || '{}'); } catch (e) {}
          toolCalls = [{
            id: 'call_' + Date.now(),
            type: 'function',
            function: {
              name: fnName,
              arguments: JSON.stringify(args)
            }
          }];
          assistantMessage.tool_calls = toolCalls;
          assistantMessage.content = null;
        }
      }

      if (toolCalls && toolCalls.length > 0) {
        messages.push(assistantMessage);

        for (const toolCall of toolCalls) {
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
          const selectedOfferedProduct = resolveOfferedProductSelection(input, req.activeProductContext);
          if (fnName === 'addToCart' && selectedOfferedProduct) {
            fnArgs.productId = selectedOfferedProduct.id;
            fnArgs.productIdOrName = selectedOfferedProduct.id;
          }

          // Suppress repeated same-product mutation calls within one model turn.
          const isCartMutation = ['addToCart', 'removeFromCart', 'updateCartQuantity'].includes(fnName);
          const mutationTarget = String(fnArgs.productId || fnArgs.productIdOrName || updatedProductContext?.productId || '').trim().toLowerCase();
          const mutationKey = `${fnName}:${mutationTarget}`;
          const duplicateMutation = isCartMutation && cartMutationKeys.has(mutationKey);
          if (isCartMutation && mutationTarget) cartMutationKeys.add(mutationKey);
          const execRes = duplicateMutation
            ? { tool_name: fnName, success: false, result: null, error: 'Duplicate cart action suppressed for this request. Use the existing action result; do not repeat the mutation.' }
            : await executeCustomerAgentTool(fnName, fnArgs, sessionId, resolvedCustomerId);
          (execRes as any).arguments = fnArgs;
          (execRes as any).tool_call_id = toolCall.id;
          toolExecutions.push(execRes);

          // Update product context from tool execution
          if (execRes.result?.productId) {
            updatedProductContext = {
              ...updatedProductContext,
              productId: execRes.result.productId,
              productName: execRes.result.name || execRes.result.productName,
              productOptions: offeredProducts
            };
            identifiedProduct = db.getProductById(execRes.result.productId);
          }
          if (fnName === 'searchProducts' && execRes.success && Array.isArray(execRes.result?.products)) {
            offeredProducts = execRes.result.products.flatMap((entry: any) => {
              const product = db.getProductById(String(entry.id || ''));
              return product ? [{ productId: product.id, name: product.name, brand: product.brand, skuId: product.sku_id }] : [];
            });
            updatedProductContext = { ...updatedProductContext, productOptions: offeredProducts };
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
          let finalReply = secondData.choices?.[0]?.message?.content || "";
          if (finalReply.includes('<tool_call>')) {
            finalReply = finalReply.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
          }

          // If finalReply is empty or generic, synthesize an accurate natural reply from tool execution
          if (!finalReply || finalReply.toLowerCase().includes('checked the store inventory for you')) {
            const addedExec = toolExecutions.find(t => t.tool_name === 'addToCart' && t.success);
            if (addedExec?.result?.added) {
              const p = addedExec.result.added;
              finalReply = langResult.response_language === 'te'
                ? `నేను మీ కార్ట్‌కి ${p.name} (₹${p.unitPrice}) జోడించాను! మీ మొత్తం: ₹${addedExec.result.cartTotal}.`
                : langResult.response_language === 'hi'
                ? `मैंने आपके कार्ट में ${p.name} (₹${p.unitPrice}) जोड़ दिया है! आपका नया कुल: ₹${addedExec.result.cartTotal}.`
                : `I've added ${p.name} (₹${p.unitPrice}) to your cart! Your new cart total is ₹${addedExec.result.cartTotal}.`;
            } else if (identifiedProduct) {
              finalReply = langResult.response_language === 'te'
                ? `మీరు ${identifiedProduct.name} ని ${identifiedProduct.aisle} లో ₹${identifiedProduct.price} కి పొందవచ్చు.`
                : langResult.response_language === 'hi'
                ? `आप ${identifiedProduct.name} को ${identifiedProduct.aisle} में ₹${identifiedProduct.price} में प्राप्त कर सकते हैं.`
                : `You can find ${identifiedProduct.name} in ${identifiedProduct.aisle} for ₹${identifiedProduct.price}.`;
            } else {
              finalReply = langResult.response_language === 'te'
                ? "నేను స్టోర్ కేటలాగ్ వివరాలను కనుగొన్నాను. మీకు ఇంకా ఏమి కావాలో చెప్పండి!"
                : langResult.response_language === 'hi'
                ? "मुझे स्टोर में उपलब्ध वस्तुएं मिल गई हैं। बताइए मैं आपकी और क्या मदद करूँ?"
                : "I found those items in our store catalog. Would you like me to add them to your cart?";
            }
          }

          // Build dynamic quick actions based on tool results
          const quickActions = this.buildQuickActions(toolExecutions, identifiedProduct, dynamicSubstitutes, sessionId);

          return {
            success: true,
            groqConfigured: true,
            message: memoryRecallError ? `${finalReply}\n\nI could not load saved customer memories: ${memoryRecallError}` : finalReply,
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
            memoryStatus,
            retainedMemoryId
          };
        }

        const errText = await secondResponse.text();
        const providerError = this.describeProviderError(secondResponse.status, errText);
        const completedAdd = toolExecutions.find(t => t.tool_name === 'addToCart' && t.success && t.result?.added);
        const completedRemove = toolExecutions.find(t => t.tool_name === 'removeFromCart' && t.success && t.result?.removedName);
        if (completedAdd || completedRemove) {
          const result = completedAdd?.result || completedRemove?.result;
          const itemName = completedAdd?.result.added.name || completedRemove?.result.removedName;
          const itemCount = result.itemCount ?? result.remainingItems ?? 0;
          const total = result.cartTotal ?? result.newCartTotal ?? 0;
          return {
            success: true,
            groqConfigured: true,
            message: `Your cart was updated: ${completedAdd ? `added ${itemName}` : `removed ${itemName}`}. It now has ${itemCount} items and totals ₹${total}. The AI response step failed: ${providerError.message}`,
            detected_language: langResult.detected_language,
            response_language: langResult.response_language,
            is_code_mixed: langResult.is_code_mixed,
            productFound: identifiedProduct,
            quickActions: this.buildQuickActions(toolExecutions, identifiedProduct, dynamicSubstitutes, sessionId),
            toolExecutions,
            activeProductContext: updatedProductContext,
            recalledMemories: recalledMemoriesList,
            memoryStatus,
            retainedMemoryId
          };
        }
        console.error('[CustomerAgent] Groq response generation failed:', providerError.code || secondResponse.status);
        return {
          success: false,
          groqConfigured: true,
          message: providerError.message,
          detected_language: langResult.detected_language,
          response_language: langResult.response_language,
          is_code_mixed: langResult.is_code_mixed,
          recalledMemories: recalledMemoriesList,
          memoryStatus,
          error: `GROQ_HTTP_${secondResponse.status}${providerError.code ? `_${providerError.code}` : ''}`
        };
      }

      // If no tool call was required (e.g. general greeting or explanation)
      const directReply = assistantMessage?.content || "How can I assist your shopping trip today?";

      return {
        success: true,
        groqConfigured: true,
        message: memoryRecallError ? `${directReply}\n\nI could not load saved customer memories: ${memoryRecallError}` : directReply,
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        quickActions: [
          { label: 'View Shopping Mission', action: 'view_mission', route: '/customer/mission' },
          { label: 'Open Store Map', action: 'map', route: '/customer/map' }
        ],
        activeProductContext: updatedProductContext,
        recalledMemories: recalledMemoriesList,
        memoryStatus,
        retainedMemoryId
      };
    } catch (err: any) {
      const errorMessage = String(err?.message || 'Network request failed').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 300);
      console.error('[CustomerAgent] Groq request failed:', errorMessage);
      return {
        success: false,
        groqConfigured: true,
        message: `Could not reach Groq (${errorMessage}). Check backend internet access, GROQ_API_KEY validity, and the configured GROQ_MODEL, then retry.`,
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        recalledMemories: recalledMemoriesList,
        memoryStatus,
        error: `GROQ_NETWORK_ERROR: ${errorMessage}`
      };
    }
  }

  private describeProviderError(status: number, body: string): { code?: string; message: string } {
    let code = '';
    let detail = '';
    try {
      const payload = JSON.parse(body);
      const provider = payload?.error || payload;
      code = String(provider?.code || provider?.type || '');
      detail = String(provider?.message || '');
    } catch {
      detail = '';
    }
    detail = detail.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/\s+/g, ' ').slice(0, 240);

    const guidance = status === 401
      ? 'GROQ_API_KEY was rejected. Check the backend secret and replace it with a valid Groq API key.'
      : status === 403
        ? 'Groq denied this request. Check project permissions, model access, and account limits.'
        : status === 404
          ? `Groq did not recognize the model or endpoint. Check GROQ_MODEL (${this.getModel()}) against the enabled model IDs.`
          : status === 429
            ? 'Groq rate or usage limit reached. Check the project limits and retry after the reset.'
            : status >= 500
              ? 'Groq is returning a server error. Retry later and check Groq service status.'
              : 'Check the Groq request configuration and model capabilities.';
    return {
      code: code || undefined,
      message: `Groq request failed with HTTP ${status}${code ? ` (${code})` : ''}. ${guidance}${detail ? ` Provider detail: ${detail}` : ''}`
    };
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

  private async retainPreferences(customerId: string, sessionId: string, input: string, lang: string): Promise<string | undefined> {
    try {
      if (!customerId) return undefined;
      const lower = input.toLowerCase();
      const isPref =
        lower.includes('prefer') || lower.includes('like') || lower.includes('love') ||
        lower.includes('hate') || lower.includes('dislike') || lower.includes('allergic') ||
        lower.includes('intolerant') || lower.includes('vegan') || lower.includes('vegetarian') ||
        lower.includes('organic') || lower.includes('budget') || lower.includes('under') ||
        lower.includes('below') || lower.includes('cook') || lower.includes('breakfast') ||
        lower.includes('healthy') || lower.includes('weight') || lower.includes('remember') ||
        lower.includes('gurtunchuko') || lower.includes('istam') || lower.includes('nachuthundi') ||
        lower.includes('pasand') || lower.includes('yaad rakhna');

      if (!isPref) return undefined;

      // Retain in the persistent, isolated Hindsight bank and report only a
      // confirmed memory identifier.
      const retained = await hindsightService.retainCustomerExperience({
        customerId,
        observation: input,
        context: `Customer preference/habit declared during session ${sessionId}`,
        tags: ['preference', lang]
      });

      // 2. Update persistent DB structured customer preferences
      const existing = db.getCustomerPreferences(customerId);
      const newDiet = [...(existing?.dietary_preferences || [])];
      if (lower.includes('organic') && !newDiet.includes('Organic')) newDiet.push('Organic');
      if (lower.includes('vegan') && !newDiet.includes('Vegan')) newDiet.push('Vegan');
      if (lower.includes('vegetarian') && !newDiet.includes('Vegetarian')) newDiet.push('Vegetarian');
      if (lower.includes('whole wheat') && !newDiet.includes('Whole Wheat')) newDiet.push('Whole Wheat');
      if (lower.includes('protein') && !newDiet.includes('High Protein')) newDiet.push('High Protein');
      if ((lower.includes('low-sugar') || lower.includes('low sugar') || lower.includes('less sugar')) && !newDiet.includes('Low Sugar')) newDiet.push('Low Sugar');

      let budgetMax = existing?.budget_max || 2000;
      const budgetMatch = lower.match(/(?:under|below|budget|within)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
      if (budgetMatch && budgetMatch[1]) {
        budgetMax = parseInt(budgetMatch[1], 10);
      }

      const preferredBrands = [...(existing?.preferred_brands || [])];
      if (lower.includes('amul') && !preferredBrands.includes('Amul')) preferredBrands.push('Amul');
      if (lower.includes('fortune') && !preferredBrands.includes('Fortune')) preferredBrands.push('Fortune');
      if (lower.includes('borges') && !preferredBrands.includes('Borges')) preferredBrands.push('Borges');

      db.updateCustomerPreferences(customerId, {
        dietary_preferences: newDiet,
        budget_max: budgetMax,
        preferred_brands: preferredBrands
      });
      return retained.success ? retained.memoryId : undefined;
    } catch (err: any) {
      console.warn('[CustomerAgent] Preference retention fallback:', err?.message || err);
      return undefined;
    }
  }
}

export const groqCustomerAgentServer = new GroqCustomerAgentServer();
