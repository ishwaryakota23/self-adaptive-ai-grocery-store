import { db } from './db.js';
import { eventService } from './eventService.js';
import { languageDetector, LanguageDetectionResult } from './languageDetector.js';
import { Product, LanguageCode, ShoppingMission } from '../types/index.js';

export interface CustomerAgentResponse {
  message: string;
  intent?: string;
  detected_language?: string;
  response_language?: string;
  is_code_mixed?: boolean;
  groqConfigured?: boolean;
  itemsDetected?: string[];
  productFound?: Product;
  isAvailable?: boolean;
  alternatives?: Product[];
  aisle?: string;
  followUpSuggestions?: {
    id: string;
    question: string;
    options: string[];
  }[];
  quickActions?: {
    label: string;
    action: string;
    route?: string;
  }[];
  toolExecutions?: Array<{
    tool_name: string;
    success: boolean;
    result: any;
    error?: string;
  }>;
  recalledMemories?: string[];
  retainedMemoryId?: string;
  error?: string;
}

export class CustomerAgent {
  private sessionHistoryMap = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();
  private sessionProductContextMap = new Map<string, { productId?: string; productName?: string }>();

  public async processInput(
    input: string,
    lang?: LanguageCode,
    currentMission?: ShoppingMission,
    customerId = 'USER00001',
    inputMode: 'text' | 'voice' = 'text'
  ): Promise<CustomerAgentResponse> {
    const text = input.trim();
    const activeCustomerId = customerId || currentMission?.customer_id || 'USER00001';

    // 1. Language Detection & Session Isolation (Section 4, 5, 10)
    const langResult: LanguageDetectionResult = languageDetector.detectLanguage(text, activeCustomerId);
    const activeLang = lang || langResult.response_language;

    // 2. Record Input Event in Append-Only Ledger (Section 20)
    eventService.recordEvent({
      event_type: inputMode === 'voice' ? 'VOICE_INPUT' : 'TEXT_INPUT',
      customer_session_id: activeCustomerId,
      metadata: {
        rawInput: text,
        detected_language: langResult.detected_language,
        response_language: activeLang,
        is_code_mixed: langResult.is_code_mixed,
        confidence: langResult.confidence
      }
    });

    eventService.recordEvent({
      event_type: 'LANGUAGE_DETECTED',
      customer_session_id: activeCustomerId,
      metadata: {
        detected_language: langResult.detected_language,
        response_language: activeLang,
        is_code_mixed: langResult.is_code_mixed
      }
    });

    eventService.recordEvent({
      event_type: 'AGENT_REQUEST',
      customer_session_id: activeCustomerId,
      metadata: { input: text, mode: inputMode }
    });

    // 3. Load Session Conversational & Follow-up Context (Section 9)
    const history = this.sessionHistoryMap.get(activeCustomerId) || [];
    const productContext = this.sessionProductContextMap.get(activeCustomerId);

    // 4. Invoke Groq Customer Agent via Backend Server API
    let agentResult: any;

    try {
      // If running in browser, call backend API route
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const response = await fetch('/api/customer-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeCustomerId,
            customerId: activeCustomerId,
            input: text,
            language: activeLang,
            history,
            activeProductContext: productContext
          })
        });

        if (response.ok) {
          agentResult = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          const isApiKeyMissing = errData.error === 'GROQ_API_KEY_NOT_CONFIGURED';
          agentResult = {
            success: false,
            groqConfigured: isApiKeyMissing ? false : (errData.groqConfigured ?? true),
            message: errData.message || (response.status === 500 ? "Server error processing request" : "Groq AI service is currently unavailable."),
            error: errData.error || `HTTP_${response.status}`
          };
        }
      } else {
        // If running server-side / in Node test environment, invoke GroqCustomerAgentServer directly
        const { groqCustomerAgentServer } = await import('../server/groqCustomerAgent.js');
        agentResult = await groqCustomerAgentServer.processRequest({
          sessionId: activeCustomerId,
          customerId: activeCustomerId,
          input: text,
          language: activeLang,
          history,
          activeProductContext: productContext
        });
      }
    } catch (err: any) {
      console.warn('Backend Groq agent call failed:', err);
      agentResult = {
        success: false,
        groqConfigured: true,
        message: "Failed to connect to backend AI service. Please check network connectivity or server logs.",
        error: err?.message || 'Network error'
      };
    }

    // 5. Handle Groq Not Configured (Section 3, 21, 23)
    if (!agentResult?.groqConfigured || agentResult?.error === 'GROQ_API_KEY_NOT_CONFIGURED') {
      const unconfiguredReply = langResult.response_language === 'hi'
        ? "Groq AI सेवा वर्तमान में अनुपलब्ध है क्योंकि बैकएंड पर्यावरण में GROQ_API_KEY कॉन्फ़िगर नहीं है। कृपया बहुभाषी AI सहायता को सक्षम करने के लिए .env फ़ाइल में GROQ_API_KEY जोड़ें।"
        : langResult.response_language === 'te'
        ? "Groq AI సర్వీస్ ప్రస్తుతం అందుబాటులో లేదు ఎందుకంటే బ్యాకెండ్ ఎన్విరాన్‌మెంట్‌లో GROQ_API_KEY కాన్ఫిగర్ చేయబడలేదు. దయచేసి .env ఫైల్‌లో GROQ_API_KEY ని జోడించండి."
        : "Groq AI service is currently unavailable because GROQ_API_KEY is not configured in the backend environment. Please configure GROQ_API_KEY in your .env file to enable multilingual AI reasoning.";

      return {
        message: unconfiguredReply,
        groqConfigured: false,
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        intent: 'AI_UNAVAILABLE',
        quickActions: [
          { label: 'View Products Catalog', action: 'products', route: '/customer/products' },
          { label: 'View Active Mission', action: 'mission', route: '/customer/mission' },
          { label: 'Open Store Map', action: 'map', route: '/customer/map' }
        ],
        error: "GROQ_API_KEY_NOT_CONFIGURED"
      };
    }

    // 5b. Handle Server / Runtime Error (Not misreported as API key error)
    if (!agentResult?.success && agentResult?.error && agentResult.error !== 'GROQ_API_KEY_NOT_CONFIGURED') {
      return {
        message: agentResult.message || `An error occurred while contacting the Groq AI service (${agentResult.error}). Please verify server runtime logs.`,
        groqConfigured: true,
        detected_language: langResult.detected_language,
        response_language: langResult.response_language,
        is_code_mixed: langResult.is_code_mixed,
        intent: 'AI_ERROR',
        quickActions: [
          { label: 'Open Store Map', action: 'map', route: '/customer/map' },
          { label: 'View Active Mission', action: 'mission', route: '/customer/mission' }
        ],
        error: agentResult.error
      };
    }

    // 6. Update Session Conversational Memory & Context
    if (agentResult.success) {
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: agentResult.message });
      this.sessionHistoryMap.set(activeCustomerId, history.slice(-10));

      if (agentResult.activeProductContext) {
        this.sessionProductContextMap.set(activeCustomerId, agentResult.activeProductContext);
      }

      // Record Agent Response Event
      eventService.recordEvent({
        event_type: 'AGENT_RESPONSE',
        customer_session_id: activeCustomerId,
        metadata: {
          message: agentResult.message,
          toolsExecuted: agentResult.toolExecutions?.map((t: any) => t.tool_name) || []
        }
      });
    }

    return {
      message: agentResult.message,
      intent: agentResult.intent || 'Shopping Assistance',
      detected_language: agentResult.detected_language || langResult.detected_language,
      response_language: agentResult.response_language || langResult.response_language,
      is_code_mixed: agentResult.is_code_mixed ?? langResult.is_code_mixed,
      groqConfigured: true,
      productFound: agentResult.productFound,
      isAvailable: agentResult.isAvailable,
      alternatives: agentResult.alternatives,
      aisle: agentResult.aisle,
      quickActions: agentResult.quickActions,
      toolExecutions: agentResult.toolExecutions,
      recalledMemories: agentResult.recalledMemories,
      retainedMemoryId: agentResult.retainedMemoryId,
      error: agentResult.error
    };
  }

  public getSessionHistory(sessionId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.sessionHistoryMap.get(sessionId) || [];
  }

  public clearSessionHistory(sessionId: string) {
    this.sessionHistoryMap.delete(sessionId);
    this.sessionProductContextMap.delete(sessionId);
  }

  public getProactiveGreeting(customerName = 'Ishwarya', lang: LanguageCode = 'en'): string {
    if (lang === 'hi') {
      return `नमस्ते ${customerName}! GrocerAI में आपका स्वागत है। मैं आपकी खरीदारी में कैसे मदद कर सकता हूँ?`;
    }
    if (lang === 'te') {
      return `నమస్కారం ${customerName}! GrocerAI కి స్వాగతం. నేను మీ షాపింగ్‌లో ఎలా సహాయపడగలను?`;
    }
    return `Welcome back, ${customerName}! I'm your GrocerAI assistant. How can I assist your shopping trip today?`;
  }
}

export const customerAgent = new CustomerAgent();
