import { db } from './db.js';
import { eventService } from './eventService.js';
import { languageDetector, LanguageDetectionResult } from './languageDetector.js';
import { Product, LanguageCode, ShoppingMission } from '../types/index.js';
import { sessionSyncService } from './sessionSyncService.js';

export interface CustomerAgentResponse {
  success?: boolean;
  message: string;
  intent?: string;
  detected_language?: string;
  response_language?: string;
  is_code_mixed?: boolean;
  groqConfigured?: boolean;
  itemsDetected?: string[];
  productFound?: Product;
  activeProductContext?: { productId?: string; productName?: string; productOptions?: Array<{ productId: string; name: string; brand: string; skuId?: string }> };
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
  identityStatus?: 'verified' | 'missing' | 'invalid_or_revoked' | 'verification_unavailable';
  memoryStatus?: 'retrieved' | 'empty' | 'unavailable' | 'not_attempted';
  error?: string;
}

export function getCustomerAgentIdentity(sessionId: string, knownCustomerId?: string): { customerId: string; identityToken: string } | undefined {
  const session = db.getShoppingSession(sessionId);
  const customerId = knownCustomerId || session?.customer_id;
  if (!customerId) return undefined;
  const token = db.getActiveCustomerIdentityToken(customerId);
  if (!token?.secure_token || token.status !== 'active') return undefined;
  return { customerId, identityToken: token.secure_token };
}

export class CustomerAgent {
  private sessionHistoryMap = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();
  private sessionProductContextMap = new Map<string, { productId?: string; productName?: string; productOptions?: Array<{ productId: string; name: string; brand: string; skuId?: string }> }>();
  private appliedCartMutationIds = new Set<string>();
  private pendingClearCart = new Map<string, number>();
  private inFlightCartRequests = new Map<string, Promise<CustomerAgentResponse>>();
  private recentCartRequests = new Map<string, { at: number; response: CustomerAgentResponse }>();

  public async processInput(
    input: string,
    lang?: LanguageCode,
    currentMission?: ShoppingMission,
    customerId = 'USER00001',
    inputMode: 'text' | 'voice' = 'text',
    identity?: { customerId?: string; identityToken?: string }
  ): Promise<CustomerAgentResponse> {
    const normalized = input.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const isCartMutation = /\b(add|put|place|buy|remove|delete|drop|take|update|change|set|clear|empty)\b|cheyyi|vesuko|teesey/i.test(normalized);
    const requestKey = isCartMutation ? `${customerId || 'USER00001'}:${normalized}` : '';
    if (requestKey) {
      const inFlight = this.inFlightCartRequests.get(requestKey);
      if (inFlight) return inFlight;
      const recent = this.recentCartRequests.get(requestKey);
      if (recent && Date.now() - recent.at < 1800) return recent.response;
    }

    const request = this.processInputCore(input, lang, currentMission, customerId, inputMode, identity);
    if (!requestKey) return request;
    this.inFlightCartRequests.set(requestKey, request);
    try {
      const response = await request;
      if (response.intent?.startsWith('CART_') || response.toolExecutions?.some(tool => tool.success && ['addToCart', 'removeFromCart', 'updateCartQuantity'].includes(tool.tool_name))) {
        this.recentCartRequests.set(requestKey, { at: Date.now(), response });
        if (this.recentCartRequests.size > 200) this.recentCartRequests.delete(this.recentCartRequests.keys().next().value!);
      }
      return response;
    } finally {
      this.inFlightCartRequests.delete(requestKey);
    }
  }

  private async processInputCore(
    input: string,
    lang?: LanguageCode,
    currentMission?: ShoppingMission,
    customerId = 'USER00001',
    inputMode: 'text' | 'voice' = 'text',
    identity?: { customerId?: string; identityToken?: string }
  ): Promise<CustomerAgentResponse> {
    const text = input.trim();
    const activeCustomerId = customerId || currentMission?.customer_id || 'USER00001';
    const cartBeforeRequest = db.getCart(activeCustomerId);
    const pendingClearAt = this.pendingClearCart.get(activeCustomerId);
    const pendingClearValid = pendingClearAt !== undefined && Date.now() - pendingClearAt < 30_000;
    if (pendingClearAt !== undefined && !pendingClearValid) this.pendingClearCart.delete(activeCustomerId);

    if (pendingClearValid && /^(yes|yes please|confirm|do it|clear it|avunu|sare|cheyyi|అవును|సరే|हाँ|ठीक है)$/i.test(text.toLowerCase().trim())) {
      this.pendingClearCart.delete(activeCustomerId);
      const before = db.getCart(activeCustomerId);
      db.clearCart(activeCustomerId);
      if (db.getCart(activeCustomerId).length !== 0) {
        return { message: "I couldn't verify that the cart was cleared, so I haven't confirmed the change.", intent: 'CART_CLEAR_FAILED', groqConfigured: false };
      }
      const sync = await sessionSyncService.syncAgentCart(activeCustomerId, db.getCart(activeCustomerId));
      if (!sync.success) {
        if (sync.cart) db.replaceCartFromServer(activeCustomerId, sync.cart.items);
        else db.replaceCartFromServer(activeCustomerId, before);
        return { message: `I couldn't save the cleared cart to the shared session: ${sync.error || 'the cart changed on another device'}. The latest cart is shown; please retry.`, intent: 'CART_SYNC_FAILED', groqConfigured: false, error: sync.error };
      }
      const message = 'The cart is clear. I verified it now has 0 items.';
      this.rememberTurn(activeCustomerId, text, message);
      return { message, intent: 'CART_CLEARED', groqConfigured: false, toolExecutions: [{ tool_name: 'clearCart', success: true, result: { itemCount: 0, verifiedAgainstDashboardCart: true } }] };
    }
    if (pendingClearValid && /^(no|no thanks|cancel|don't|do not|vaddu|ledu|కాదు|వద్దు)$/i.test(text.toLowerCase().trim())) {
      this.pendingClearCart.delete(activeCustomerId);
      return { message: 'Okay, I left your cart unchanged.', intent: 'CART_CLEAR_CANCELLED', groqConfigured: false };
    }

    if (/\b(clear|empty|remove all|delete all)\b.*\b(cart|basket)\b|\b(cart|basket)\b.*\b(clear|empty)\b/i.test(text)) {
      const cart = db.getCart(activeCustomerId);
      if (!cart.length) return { message: 'Your cart is already empty.', intent: 'CART_EMPTY', groqConfigured: false, toolExecutions: [{ tool_name: 'getCart', success: true, result: { items: [], itemCount: 0 } }] };
      this.pendingClearCart.set(activeCustomerId, Date.now());
      return { message: `Your cart has ${cart.reduce((sum, item) => sum + item.quantity, 0)} items. Should I clear the whole cart? Please say yes to confirm.`, intent: 'CART_CLEAR_CONFIRMATION_REQUIRED', groqConfigured: false };
    }

    if (/\b(show|view|what(?:'s| is) in|read)\b.*\b(cart|basket)\b|\b(cart|basket) lo (?:em|emi) unnayi\b/i.test(text)) {
      const cart = db.getCart(activeCustomerId);
      const totals = db.calculateAuthoritativeCartTotal(activeCustomerId);
      const contents = cart.length ? cart.map(item => `${item.quantity} × ${item.product.name}`).join(', ') : 'nothing';
      const message = cart.length ? `Your cart has ${contents}. The total is ₹${totals.total}.` : 'Your cart is empty.';
      this.rememberTurn(activeCustomerId, text, message);
      return { message, intent: 'CART_SHOWN', groqConfigured: false, toolExecutions: [{ tool_name: 'getCart', success: true, result: { items: cart, itemCount: totals.itemCount, cartTotal: totals.total, verifiedAgainstDashboardCart: true } }] };
    }
    const activeSession = db.getShoppingSession(activeCustomerId);
    const authenticatedCustomerId = identity?.customerId || activeSession?.customer_id || '';
    const identityToken = identity?.identityToken || (authenticatedCustomerId ? db.getActiveCustomerIdentityToken(authenticatedCustomerId)?.secure_token : undefined);

    if (/\b(switch to mobile|continue on (my )?phone|show (me )?(the )?mobile qr|mobile qr|take (this|my) cart to (my )?phone)\b/i.test(text)) {
      return {
        message: 'I’m preparing a secure mobile handoff for this active shopping session. Scan the QR code to continue with the same cart.',
        intent: 'MOBILE_HANDOFF',
        groqConfigured: true,
        detected_language: 'en',
        response_language: lang || 'en',
        quickActions: [{ label: 'Show Mobile QR', action: 'open_mobile_qr' }]
      };
    }

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
            customerId: identityToken ? authenticatedCustomerId : '',
            verifiedCustomerId: identityToken ? authenticatedCustomerId : '',
            identityToken: identityToken || '',
            handoffToken: sessionSyncService.getHandoffToken(activeCustomerId) || '',
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
          customerId: identityToken ? authenticatedCustomerId : '',
          verifiedCustomerId: identityToken ? authenticatedCustomerId : '',
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

    // Keep supported add/remove commands deterministic even when Groq responds
    // conversationally instead of selecting a cart tool. Avoid repeating a
    // mutation when the provider already returned a successful cart tool call.
    const command = text.toLowerCase();
    const expectsCartMutation = /\b(add|put|place|buy|remove|delete|drop|take|update|change|set)\b|cheyyi|vesuko|veyi|teesey/.test(command)
      && (/\b(cart|basket|item|quantity)\b/.test(command) || /\b(add|put|place|buy|remove|delete|drop|take|update|change|set)\b|cheyyi|vesuko|veyi|teesey/.test(command));
    const successfulCartTool = (agentResult?.toolExecutions || []).some((tool: any) =>
      tool.success && ['addToCart', 'removeFromCart', 'updateCartQuantity'].includes(tool.tool_name)
    );
    if (expectsCartMutation && !successfulCartTool) {
      const fallback = this.executeDeterministicCartAction(text, activeCustomerId, langResult, Boolean(agentResult.groqConfigured));
      if (fallback) {
        const completed = {
          ...fallback,
          groqConfigured: Boolean(agentResult.groqConfigured),
          recalledMemories: agentResult.recalledMemories || [],
          error: agentResult.error
        };
        const verified = await this.verifySharedCartAfterMutation(activeCustomerId, cartBeforeRequest, completed);
        this.rememberTurn(activeCustomerId, text, verified.message);
        return verified;
      }
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
        retainedMemoryId: agentResult.retainedMemoryId,
        identityStatus: agentResult.identityStatus,
        memoryStatus: agentResult.memoryStatus,
        intent: 'AI_UNAVAILABLE',
        quickActions: [
          { label: 'Switch to Mobile', action: 'open_mobile_qr' },
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
          { label: 'Switch to Mobile', action: 'open_mobile_qr' },
          { label: 'Open Store Map', action: 'map', route: '/customer/map' },
          { label: 'View Active Mission', action: 'mission', route: '/customer/mission' }
        ],
        recalledMemories: agentResult.recalledMemories || [],
        identityStatus: agentResult.identityStatus,
        memoryStatus: agentResult.memoryStatus,
        error: agentResult.error
      };
    }

    // 6. Update Session Conversational Memory & Context
    if (agentResult.success) {
      if (typeof window !== 'undefined' && Array.isArray(agentResult.toolExecutions)) {
        this.reconcileCartMutations(agentResult.toolExecutions, activeCustomerId);
        const executedCartMutation = agentResult.toolExecutions.some((entry: any) => entry.success && ['addToCart', 'removeFromCart', 'updateCartQuantity'].includes(entry.tool_name));
        if (executedCartMutation) {
          const verified = await this.verifySharedCartAfterMutation(activeCustomerId, cartBeforeRequest, agentResult);
          if (!verified.success) return verified;
        }
        const reconciled = [...agentResult.toolExecutions].reverse().find((entry: any) => entry.reconciledMessage);
        if (reconciled) agentResult.message = reconciled.reconciledMessage;
      }
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
      activeProductContext: agentResult.activeProductContext,
      isAvailable: agentResult.isAvailable,
      alternatives: agentResult.alternatives,
      aisle: agentResult.aisle,
      quickActions: agentResult.quickActions,
      toolExecutions: agentResult.toolExecutions,
        recalledMemories: agentResult.recalledMemories,
      retainedMemoryId: agentResult.retainedMemoryId,
      identityStatus: agentResult.identityStatus,
      memoryStatus: agentResult.memoryStatus,
      error: agentResult.error
    };
  }

  private async verifySharedCartAfterMutation(
    sessionId: string,
    previousCart: ReturnType<typeof db.getCart>,
    response: CustomerAgentResponse
  ): Promise<CustomerAgentResponse> {
    const localCart = db.getCart(sessionId);
    const synced = await sessionSyncService.syncAgentCart(sessionId, localCart);
    if (synced.success && synced.synchronized && synced.cart) {
      const signature = (items: Array<{ product_id: string; quantity: number }>) => JSON.stringify(items.map(item => [item.product_id, item.quantity]));
      if (signature(localCart) !== signature(synced.cart.items)) {
        db.replaceCartFromServer(sessionId, synced.cart.items);
        const error = 'The shared cart returned a different result than requested.';
        return this.cartSyncFailure(response, error);
      }
      for (const execution of response.toolExecutions || []) {
        if (['addToCart', 'removeFromCart', 'updateCartQuantity'].includes(execution.tool_name)) {
          execution.result = { ...(execution.result || {}), verifiedAgainstSharedCart: true, itemCount: synced.cart.itemCount, cartTotal: synced.cart.total };
        }
      }
      return response;
    }
    if (synced.success) return response; // No mobile handoff exists; the app session cart is authoritative.
    if (synced.cart) db.replaceCartFromServer(sessionId, synced.cart.items);
    else db.replaceCartFromServer(sessionId, previousCart);
    return this.cartSyncFailure(response, synced.error || 'Could not verify the shared cart update.');
  }

  private cartSyncFailure(response: CustomerAgentResponse, error: string): CustomerAgentResponse {
    const failed = (response.toolExecutions || []).map(execution =>
      ['addToCart', 'removeFromCart', 'updateCartQuantity'].includes(execution.tool_name)
        ? { ...execution, success: false, error, result: null }
        : execution
    );
    return {
      ...response,
      success: false,
      intent: 'CART_SYNC_FAILED',
      message: `I couldn't verify the shared cart update: ${error} The latest cart is shown; please retry if you still want that change.`,
      error: 'CART_SYNC_FAILED',
      toolExecutions: failed
    } as CustomerAgentResponse;
  }

  private rememberTurn(sessionId: string, user: string, assistant: string): void {
    const history = this.sessionHistoryMap.get(sessionId) || [];
    history.push({ role: 'user', content: user }, { role: 'assistant', content: assistant });
    this.sessionHistoryMap.set(sessionId, history.slice(-10));
  }

  private executeDeterministicCartAction(
    input: string,
    sessionId: string,
    language: LanguageDetectionResult,
    groqConfigured: boolean
  ): CustomerAgentResponse | undefined {
    const normalized = input.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
    const isAdd = /\b(add|put|place|buy)\b/.test(normalized) || /\b(add|buy)\b/.test(normalized) || /\b(vesuko|veyi|cheyyi|chey)\b/.test(normalized);
    const isRemove = /\b(remove|delete|drop|take)\b/.test(normalized) || /\b(teesey|teesi|remove cheyyi)\b/.test(normalized);
    const isUpdate = /\b(update|change|set|increase|decrease)\b/.test(normalized);
    if (!isAdd && !isRemove && !isUpdate) return undefined;

    const quantityMatch = normalized.match(/\b(?:quantity|qty|to|make it|set to)\s+(\d{1,2})\b/)
      || normalized.match(/\b(?:add|put|buy)\s+(\d{1,2})\s+/)
      || normalized.match(/^\s*(\d{1,2})\s+/);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return {
      message: 'Please choose a quantity from 1 to 50.', intent: 'CART_INVALID_QUANTITY', groqConfigured, error: 'INVALID_QUANTITY'
    };
    const requestedText = normalized
      .replace(/\b(add|put|place|buy|remove|delete|drop|take|update|change|set|increase|decrease|to|from|the|my|cart|basket|please|item|items|in|out|quantity|qty|make|it|of|lo|ki|cheyyi|chey|chesi|vesuko|veyi|teesey|teesi|avunu|sare|could|can|would|you|i|d|like|want|me|kindly|please)\b/g, ' ')
      .replace(/\b\d{1,2}\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
    const catalog = db.getProducts();
    const currentCart = db.getCart(sessionId);
    const relevantProducts = isRemove || isUpdate ? currentCart.map(item => item.product).filter(Boolean) : catalog;
    const exact = relevantProducts.filter(item => item.id.toLowerCase() === requestedText || item.name.toLowerCase() === requestedText);
    const words = requestedText.split(' ').filter(word => word.length > 1);
    const matches = exact.length ? exact : relevantProducts.filter(item => words.length > 0 && words.every(word =>
      `${item.name} ${item.brand} ${item.tags.join(' ')}`.toLowerCase().includes(word)
    ));
    const products = [...new Map(matches.map(product => [product.id, product])).values()];
    if (products.length > 1) {
      const options = products.slice(0, 4).map(product => `${product.name} (₹${product.price})`).join(' or ');
      const message = `I found a few matching products: ${options}. Which one do you mean?`;
      return { message, intent: 'PRODUCT_CLARIFICATION', groqConfigured, response_language: language.response_language, detected_language: language.detected_language, error: 'AMBIGUOUS_PRODUCT' };
    }
    const product = products[0];
    if (!product) return undefined;
    const existingItem = currentCart.find(item => item.product_id === product.id);
    if ((isRemove || isUpdate) && !existingItem) {
      return { message: `${product.name} is not in your current cart, so I left it unchanged.`, intent: 'CART_ITEM_NOT_FOUND', groqConfigured, productFound: product };
    }

    if (isAdd) {
      const stock = db.getInventoryByProductId(product.id)?.quantity || 0;
      const already = currentCart.find(item => item.product_id === product!.id)?.quantity || 0;
      if (stock < already + quantity) {
        return {
          message: `Only ${Math.max(0, stock - already)} more ${product.name} are available. Your cart was not changed.`,
          intent: 'CART_ADD_UNAVAILABLE',
          detected_language: language.detected_language,
          response_language: language.response_language,
          groqConfigured: false,
          productFound: product,
          quickActions: [{ label: 'Switch to Mobile', action: 'open_mobile_qr' }, { label: 'View Products Catalog', action: 'products', route: '/customer/products' }]
        };
      }
      db.addToCart(product, quantity, sessionId);
    } else if (isUpdate) {
      const stock = db.getInventoryByProductId(product.id)?.quantity || 0;
      if (quantity > stock) return { message: `Only ${stock} units of ${product.name} are currently available. I left your cart unchanged.`, intent: 'CART_UPDATE_UNAVAILABLE', groqConfigured, productFound: product };
      db.updateCartItemQuantity(existingItem!.id, quantity - existingItem!.quantity, sessionId);
    } else {
      db.removeCartItem(existingItem!.id, sessionId);
    }

    const updatedCart = db.getCart(sessionId);
    const totals = db.calculateAuthoritativeCartTotal(sessionId);
    const updatedItem = updatedCart.find(item => item.product_id === product!.id);
    const previousQuantity = currentCart.find(item => item.product_id === product!.id)?.quantity || 0;
    const succeeded = isAdd ? Boolean(updatedItem && updatedItem.quantity === previousQuantity + quantity)
      : isUpdate ? Boolean(updatedItem && updatedItem.quantity === quantity)
      : !updatedItem;
    if (!succeeded) {
      return {
        message: `I couldn't verify the cart update for ${product.name}; please check your cart before retrying.`,
        intent: 'CART_UPDATE_UNVERIFIED',
        detected_language: language.detected_language,
        response_language: language.response_language,
        groqConfigured: false,
        productFound: product,
        error: 'LOCAL_CART_UPDATE_UNVERIFIED'
      };
    }

    const providerNote = groqConfigured
      ? ''
      : 'Groq is unavailable, so I handled this supported cart action directly. ';
    const message = isAdd
      ? `${providerNote}Added ${quantity} ${product.name} to your cart. Your cart now has ${totals.itemCount} items and totals ₹${totals.total}.`
      : isUpdate
        ? `${providerNote}Updated ${product.name} to quantity ${quantity}. Your cart now has ${totals.itemCount} items and totals ₹${totals.total}.`
        : `${providerNote}Removed ${product.name}. Your cart now has ${totals.itemCount} items and totals ₹${totals.total}.`;
    return {
      message,
      intent: isAdd ? 'CART_ITEM_ADDED' : isUpdate ? 'CART_QUANTITY_UPDATED' : 'CART_ITEM_REMOVED',
      detected_language: language.detected_language,
      response_language: language.response_language,
      groqConfigured: false,
      productFound: product,
      toolExecutions: [{
        tool_name: isAdd ? 'addToCart' : isUpdate ? 'updateCartQuantity' : 'removeFromCart',
        success: true,
        result: {
          productId: product.id,
          name: product.name,
          added: isAdd ? { productId: product.id, name: product.name, quantity, unitPrice: product.price, subtotal: product.price * quantity } : undefined,
          removedProductId: isAdd ? undefined : product.id,
          removedName: isAdd || isUpdate ? undefined : product.name,
          quantity: updatedItem?.quantity || 0,
          newQuantity: isUpdate ? quantity : undefined,
          itemCount: totals.itemCount,
          cartItemCount: totals.itemCount,
          cartTotal: totals.total,
          verifiedAgainstDashboardCart: true
        }
      }],
      quickActions: [
        { label: 'View Cart', action: 'view_cart', route: '/customer/cart' },
        { label: 'Switch to Mobile', action: 'open_mobile_qr' }
      ]
    };
  }

  private reconcileCartMutations(executions: any[], sessionId: string): void {
    for (const execution of executions) {
      const name = execution.tool_name;
      const args = execution.arguments || {};
      const result = execution.result || {};
      if (!['addToCart', 'removeFromCart', 'updateCartQuantity', 'getCart'].includes(name)) continue;
      if (!execution.success) continue;
      const mutationId = execution.tool_call_id ? `${sessionId}:${execution.tool_call_id}` : '';

      const requested = String(result.productId || result.added?.productId || result.removedProductId || args.productId || args.productIdOrName || '').trim();
      const product = db.getProductById(requested) || db.getProducts().find(p =>
        p.name.toLowerCase() === requested.toLowerCase() || p.name.toLowerCase().includes(requested.toLowerCase())
      );
      try {
        if (name === 'addToCart') {
          if (!product) throw new Error(`Product “${requested || 'requested item'}” was not found.`);
          const quantity = Number(args.quantity || result.added?.quantity || 1);
          if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Choose a valid quantity.');
          const stock = db.getInventoryByProductId(product.id)?.quantity || 0;
          const alreadyInCart = db.getCart(sessionId).find(item => item.product_id === product.id)?.quantity || 0;
          if (stock < alreadyInCart + quantity) throw new Error(`Only ${Math.max(0, stock - alreadyInCart)} more ${product.name} are available.`);
          if (!mutationId || !this.appliedCartMutationIds.has(mutationId)) db.addToCart(product, quantity, sessionId, 'LARGE_DISPLAY');
        } else if (name === 'removeFromCart') {
          const item = db.getCart(sessionId).find(entry => entry.product_id === product?.id || entry.product_id === requested);
          if (!item) throw new Error(`${requested || 'That item'} is not in this session’s cart.`);
          if (!mutationId || !this.appliedCartMutationIds.has(mutationId)) db.removeCartItem(item.id, sessionId);
        } else if (name === 'updateCartQuantity') {
          const item = db.getCart(sessionId).find(entry => entry.product_id === product?.id || entry.product_id === requested);
          if (!item) throw new Error(`${requested || 'That item'} is not in this session’s cart.`);
          const quantity = Number(args.quantity);
          if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a whole number of at least 1.');
          const stock = db.getInventoryByProductId(item.product_id)?.quantity || 0;
          if (quantity > stock) throw new Error(`Only ${stock} units are currently available.`);
          if (!mutationId || !this.appliedCartMutationIds.has(mutationId)) db.updateCartItemQuantity(item.id, quantity - item.quantity, sessionId);
        }

        if (mutationId) {
          this.appliedCartMutationIds.add(mutationId);
          if (this.appliedCartMutationIds.size > 500) this.appliedCartMutationIds.delete(this.appliedCartMutationIds.values().next().value!);
        }

        const totals = db.calculateAuthoritativeCartTotal(sessionId);
        const items = totals.verifiedItems.map(item => ({ productId: item.product_id, name: item.product.name, quantity: item.quantity, unitPrice: item.product.price, itemTotal: item.product.price * item.quantity }));
        execution.success = true;
        execution.error = undefined;
        execution.result = {
          ...result,
          sessionId,
          items,
          itemCount: totals.itemCount,
          subtotal: totals.subtotal,
          tax: totals.tax,
          cartTotal: totals.total,
          verifiedAgainstDashboardCart: true
        };
      } catch (error: any) {
        execution.success = false;
        execution.error = error?.message || 'The cart was not changed.';
        execution.result = null;
      }
    }

    const lastMutation = [...executions].reverse().find(e => ['addToCart', 'removeFromCart', 'updateCartQuantity'].includes(e.tool_name));
    if (lastMutation) {
      if (!lastMutation.success) {
        // Keep an honest result even if the model's prose was based on a stale server-side cart.
        (lastMutation as any).reconciledMessage = `I couldn’t update your cart: ${lastMutation.error}`;
      } else {
        const total = lastMutation.result.cartTotal;
        const count = lastMutation.result.itemCount;
        const action = lastMutation.tool_name === 'addToCart' ? 'updated' : lastMutation.tool_name === 'removeFromCart' ? 'updated' : 'updated';
        (lastMutation as any).reconciledMessage = `Your cart is ${action}. It now has ${count} item${count === 1 ? '' : 's'}, with a total of ₹${total}.`;
      }
    }
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
