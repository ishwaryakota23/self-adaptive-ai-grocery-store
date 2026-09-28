declare const process: any;

import { GROQ_STORE_TOOL_DEFINITIONS, executeStoreAgentTool, StoreToolExecutionResult, storeAgentTools } from '../services/storeAgentTools';
import { hindsightService } from '../services/hindsightService';
import { db } from '../services/db';
import {
  StoreAgentRequest,
  StoreAgentResponse,
  StructuredRecommendation
} from '../types';

export class GroqStoreAgentServer {
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

  public async processRequest(req: StoreAgentRequest): Promise<StoreAgentResponse> {
    const managerId = req.managerId || 'EMP-1042';
    const input = req.input.trim();

    // 1. Fallback if Groq not configured
    if (!this.isConfigured()) {
      return {
        success: false,
        groqConfigured: false,
        message: 'Groq AI service is not configured. Please ensure GROQ_API_KEY is defined in your backend .env file.',
        error: 'GROQ_API_KEY_NOT_CONFIGURED'
      };
    }

    const apiKey = this.getApiKey()!;
    const model = this.getModel();

    // 2. Fetch live store state for system prompt grounding
    const overview = storeAgentTools.getStoreOverview();
    const lowStock = storeAgentTools.getLowStockProducts();
    const outOfStock = storeAgentTools.getOutOfStockProducts();
    const queues = storeAgentTools.getCheckoutQueueStatus();

    // 2b. Recall Experiential Memories from Hindsight Store Bank (Section 12, 13)
    let storeMemorySection = '';
    let recalledMemoriesList: string[] = [];
    try {
      const hsRecall = await hindsightService.recallStoreMemories(input);
      if (hsRecall.success && hsRecall.results.length > 0) {
        recalledMemoriesList = hsRecall.results.map(r => r.text);
        if (hsRecall.promptString) {
          storeMemorySection = `\nPAST STORE OPERATIONAL EXPERIENCES & LESSONS (Hindsight Store Memory):\n${hsRecall.promptString}\n`;
        } else {
          storeMemorySection = `\nPAST STORE OPERATIONAL EXPERIENCES & LESSONS (Hindsight Store Memory):\n` +
            hsRecall.results.map(r => `- ${r.text}`).join('\n') + '\n';
        }
      }
    } catch (err: any) {
      console.warn('[StoreAgent] Hindsight store memory recall failed gracefully:', err?.message || err);
    }

    // Compact, high-signal system prompt
    const systemPrompt = `You are the GrocerAI Store Agent, an autonomous physical supermarket operational intelligence system for store BRANCH-104.
You converse with store managers to monitor store performance, inventory deficits, queue delays, and recommend operational actions.
STORE TELEMETRY:
- Status: ${overview.storeStatus}
- Products: ${overview.totalProducts} | Total Units: ${overview.totalInventoryUnits} | Inventory Value: ₹${overview.inventoryValue.toLocaleString()}
- Out of Stock: ${outOfStock.length} items (${outOfStock.map(i => i.productName).join(', ') || 'None'})
- Low Stock: ${lowStock.length} items (${lowStock.map(i => `${i.productName}: ${i.currentQuantity}/${i.reorderThreshold}`).join(', ') || 'None'})
- Congested Queues: ${queues.congestedCounters} counter(s)${storeMemorySection}
RULES:
1. ALWAYS call tools to retrieve authoritative data. Never invent inventory numbers, revenue, or customer demands.
2. DISTINGUISH FUNNEL LEVELS: Search != View != Cart Add != Checkout != Confirmed Sale. Only confirmed orders are sales. Unfulfilled demand represents lost demand from stockouts or missing products.
3. For restock or action inquiries, call generateRestockRecommendation or generateStoreRecommendations. Present evidence: stock vs threshold, confirmed sales, unfulfilled demand.
4. Keep answers professional, crisp, and actionable. Provide bullet points and concrete metrics.
5. LEARNING CURVE & PAST OUTCOMES: When recommending restocks or operational adjustments, check past operational experiences. If a previous action proved insufficient (e.g. prior 30-unit restock sold out in 40 minutes during a rush), adjust the recommended quantity upward (e.g. to 50 units) and explicitly cite the past outcome and lesson learned.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content?: string; tool_calls?: any[]; tool_call_id?: string; name?: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    if (req.history && req.history.length > 0) {
      for (const h of req.history.slice(-4)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: 'user', content: input });

    const toolExecutions: StoreToolExecutionResult[] = [];
    const generatedRecommendations: StructuredRecommendation[] = [];

    try {
      // 3. First Groq LLM Call (Tool Selection)
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
          tools: GROQ_STORE_TOOL_DEFINITIONS,
          tool_choice: 'auto',
          temperature: 0.2,
          max_tokens: 500
        })
      });

      // Autonomous Groq fallback if configured model returns 404
      if (firstResponse.status === 404) {
        const errText = await firstResponse.text();
        if (errText.includes('model_not_found') || errText.includes('does not exist')) {
          console.warn(`Groq model "${activeModel}" not enabled. Falling back to authorized Groq model "qwen/qwen3.8-27b"...`);
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
              tools: GROQ_STORE_TOOL_DEFINITIONS,
              tool_choice: 'auto',
              temperature: 0.2,
              max_tokens: 500
            })
          });
        }
      }

      // Handle 429 rate limit backoff
      if (firstResponse.status === 429) {
        console.warn('Groq 429 rate limit hit. Waiting 10s...');
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
            tools: GROQ_STORE_TOOL_DEFINITIONS,
            tool_choice: 'auto',
            temperature: 0.2,
            max_tokens: 500
          })
        });
      }

      if (!firstResponse.ok) {
        const errText = await firstResponse.text();
        console.error('Groq Store Agent Error:', firstResponse.status, errText);
        return {
          success: false,
          groqConfigured: true,
          message: `Groq AI service error (${firstResponse.status}).`,
          error: `GROQ_HTTP_${firstResponse.status}: ${errText}`
        };
      }

      const firstData = await firstResponse.json();
      const choice = firstData.choices?.[0];
      const assistantMessage = choice?.message;

      // 4. Handle Tool Calling
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            console.warn('Failed to parse Store Agent tool arguments:', toolCall.function.arguments);
          }

          // Execute tool against real store database
          const execRes = await executeStoreAgentTool(fnName, fnArgs, { employeeId: managerId, name: 'Store Manager' });
          toolExecutions.push(execRes);

          // Collect recommendations if generated
          if (fnName === 'generateRestockRecommendation' && execRes.result?.recommendationId) {
            generatedRecommendations.push(execRes.result);
          } else if (fnName === 'generateStoreRecommendations' && Array.isArray(execRes.result)) {
            generatedRecommendations.push(...execRes.result);
          }

          // Push tool result back
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(execRes.result || { error: execRes.error })
          });
        }

        // 5. Second Groq LLM Call (Synthesize operational insight)
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
          const errText = await secondResponse.text();
          let waitMs = 18000;
          const match = errText.match(/try again in ([0-9\.]+)s/i);
          if (match && match[1]) {
            waitMs = Math.ceil(parseFloat(match[1]) * 1000) + 1500;
          }
          console.warn(`Groq 429 on second response. Waiting ${Math.round(waitMs / 1000)}s...`);
          await new Promise(r => setTimeout(r, waitMs));
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

        const suggestedActions = this.buildSuggestedActions(toolExecutions, generatedRecommendations);
        let finalReply = "I have analyzed store telemetry and executed the requested operational actions.";
        if (secondResponse.ok) {
          const secondData = await secondResponse.json();
          finalReply = secondData.choices?.[0]?.message?.content || finalReply;
        }

        return {
          success: true,
          groqConfigured: true,
          message: finalReply,
          recommendations: generatedRecommendations.length > 0 ? generatedRecommendations : undefined,
          toolExecutions,
          suggestedActions,
          recalledMemories: recalledMemoriesList
        };
      }

      // If no tool was needed
      const directReply = assistantMessage?.content || "Store operational systems are operating normally.";
      return {
        success: true,
        groqConfigured: true,
        message: directReply,
        toolExecutions: [],
        recalledMemories: recalledMemoriesList
      };
    } catch (err: any) {
      console.error('Store Agent exception:', err);
      return {
        success: false,
        groqConfigured: true,
        message: 'Store Agent encountered an error processing your operational request.',
        error: err?.message
      };
    }
  }

  private buildSuggestedActions(
    tools: StoreToolExecutionResult[],
    recs: StructuredRecommendation[]
  ): Array<{ label: string; action: string; recommendationId?: string; payload?: any }> {
    const actions: Array<{ label: string; action: string; recommendationId?: string; payload?: any }> = [];

    // If restock recommendations were produced
    for (const rec of recs.slice(0, 2)) {
      actions.push({
        label: `Approve: Restock ${rec.productName}`,
        action: 'approve_recommendation',
        recommendationId: rec.recommendationId,
        payload: { productId: rec.productId, quantity: rec.suggestedQuantity }
      });
    }

    // If congested queues
    const queueTool = tools.find(t => t.tool_name === 'getCheckoutQueueStatus');
    if (queueTool?.result?.congestedCounters > 0) {
      actions.push({
        label: 'Open Backup Checkout Counter',
        action: 'open_counter',
        payload: { counterNumber: 2 }
      });
    }

    // Default quick prompts if none
    if (actions.length === 0) {
      actions.push({
        label: 'Generate Store Recommendations',
        action: 'generate_recommendations'
      });
      actions.push({
        label: 'Inspect Out-of-Stock Items',
        action: 'view_stockouts'
      });
    }

    return actions;
  }
}

export const groqStoreAgentServer = new GroqStoreAgentServer();
