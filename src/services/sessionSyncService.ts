import { CartItem, SessionHandoff } from '../types/index.js';

export interface SharedCartSnapshot {
  items: Array<{ product_id: string; product: any; quantity: number; price_snapshot: number }>;
  revision: number;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface SharedSessionSnapshot {
  success: boolean;
  error?: string;
  conflict?: boolean;
  session: { session_id: string; customer_id: string; status: string };
  cart: SharedCartSnapshot;
  customer?: any;
  kioskUrl?: string;
  syncToken?: string;
}

async function readJsonResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const body = await response.text();
    const preview = body.slice(0, 80).replace(/\s+/g, ' ');
    throw new Error(`Session API returned a non-JSON response (HTTP ${response.status}). Check that /api/session-sync is routed by the server. Response: ${preview}`);
  }
  return response.json();
}

class SessionSyncService {
  private activeHandoffs = new Map<string, { token: string; revision: number; ownerCustomerId?: string; identityToken?: string; lastSignature?: string; lastResponse?: any }>();

  public async createHandoff(params: {
    sessionId: string;
    customerId: string;
    identityToken: string;
    cart: CartItem[];
    clientOrigin?: string;
  }): Promise<{ handoff: SessionHandoff; mobileUrl: string; kioskUrl: string; cart: SharedCartSnapshot }> {
    const response = await fetch('/api/session-sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'handoff_generate', sessionId: params.sessionId, customerId: params.customerId,
        identityToken: params.identityToken,
        clientOrigin: params.clientOrigin,
        items: params.cart.map(item => ({ productId: item.product_id, quantity: item.quantity }))
      })
    });
    const result = await readJsonResponse(response);
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not create a persistent session pass.');
    this.activeHandoffs.set(params.sessionId, { token: result.handoff.secure_token, revision: result.cart.revision, ownerCustomerId: params.customerId, identityToken: params.identityToken });
    return result;
  }

  public async load(token: string, expectedSessionId?: string): Promise<SharedSessionSnapshot> {
    const params = new URLSearchParams({ token });
    if (expectedSessionId) params.set('session_id', expectedSessionId);
    const response = await fetch(`/api/session-sync?${params.toString()}`, { cache: 'no-store' });
    const result = await readJsonResponse(response);
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not load the shared shopping session.');
    const effectiveToken = result.syncToken || token;
    this.activeHandoffs.set(result.session.session_id, { token: effectiveToken, revision: result.cart.revision });
    return result;
  }

  public async loadOwned(sessionId: string, customerId: string, identityToken: string): Promise<SharedSessionSnapshot> {
    const response = await fetch('/api/session-sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cart_read_owner', sessionId, customerId, identityToken })
    });
    const result = await readJsonResponse(response);
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not load the customer-owned shared cart.');
    this.activeHandoffs.set(sessionId, { token: '', revision: result.cart.revision, ownerCustomerId: customerId, identityToken });
    return result;
  }

  public async saveOwnedCart(sessionId: string, customerId: string, identityToken: string, expectedRevision: number, cart: CartItem[]): Promise<SharedSessionSnapshot> {
    const response = await fetch('/api/session-sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cart_sync_owner', sessionId, customerId, identityToken, expectedRevision,
        items: cart.map(item => ({ productId: item.product_id, quantity: item.quantity })) })
    });
    const result = await readJsonResponse(response);
    if (response.status === 409 && result.cart) {
      this.activeHandoffs.set(sessionId, { token: '', revision: result.cart.revision, ownerCustomerId: customerId, identityToken });
      return { ...result, success: false, conflict: true };
    }
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not save the customer-owned shared cart.');
    this.activeHandoffs.set(sessionId, { token: '', revision: result.cart.revision, ownerCustomerId: customerId, identityToken });
    return result;
  }

  public async saveCart(token: string, expectedRevision: number, cart: CartItem[]): Promise<SharedSessionSnapshot> {
    const signature = JSON.stringify(cart.map(item => [item.product_id, item.quantity]));
    const cached = [...this.activeHandoffs.values()].find(active => active.token === token);
    if (cached?.lastResponse && cached.lastSignature === signature && expectedRevision < cached.revision) {
      return cached.lastResponse;
    }
    const response = await fetch('/api/session-sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cart_sync', token, expectedRevision,
        items: cart.map(item => ({ productId: item.product_id, quantity: item.quantity })) })
    });
    const result = await readJsonResponse(response);
    if (response.status === 409 && result.cart) {
      const sessionId = result.session?.session_id || '';
      const previous = this.activeHandoffs.get(sessionId);
      this.activeHandoffs.set(sessionId, { token, revision: result.cart.revision, lastSignature: previous?.lastSignature, lastResponse: previous?.lastResponse });
      return { ...result, success: false, conflict: true } as any;
    }
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not synchronize cart changes.');
    if (result.session?.session_id) this.activeHandoffs.set(result.session.session_id, { token, revision: result.cart.revision, lastSignature: signature, lastResponse: result });
    return result;
  }

  /** Persist agent mutations to the same revisioned cart used by kiosk and mobile. */
  public async syncAgentCart(sessionId: string, cart: CartItem[]): Promise<{ synchronized: boolean; success: boolean; conflict?: boolean; error?: string; cart?: SharedCartSnapshot }> {
    const active = this.activeHandoffs.get(sessionId);
    if (!active) return { synchronized: false, success: true };
    try {
      const result = active.ownerCustomerId && active.identityToken
        ? await this.saveOwnedCart(sessionId, active.ownerCustomerId, active.identityToken, active.revision, cart)
        : await this.saveCart(active.token, active.revision, cart);
      if (!result.success) return { synchronized: true, success: false, conflict: Boolean((result as any).conflict), error: result.error, cart: result.cart };
      return { synchronized: true, success: true, cart: result.cart };
    } catch (error: any) {
      return { synchronized: true, success: false, error: error?.message || 'Could not save the shared cart.' };
    }
  }

  public getHandoffToken(sessionId: string): string | undefined {
    return this.activeHandoffs.get(sessionId)?.token;
  }

  public extractToken(value: string): string {
    try {
      const url = new URL(value);
      return url.searchParams.get('session_token') || url.searchParams.get('handoff') || '';
    } catch { /* QR scanners may return opaque tokens or JSON */ }
    try {
      const payload = JSON.parse(value);
      return payload.tok || payload.token || payload.secure_token || '';
    } catch { return value.trim(); }
  }
}

export const sessionSyncService = new SessionSyncService();
