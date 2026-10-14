import { db } from './db.js';
import { SessionHandoff, ShoppingSession, Customer } from '../types/index.js';

let cachedLanOrigin: string | null = null;

export async function fetchDetectedLanOrigin(): Promise<string> {
  if (cachedLanOrigin) return cachedLanOrigin;
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          cachedLanOrigin = window.location.origin;
          return window.location.origin;
    }
    try {
      const res = await fetch('/api/network-ip');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.mobileUrlBase && !data.mobileUrlBase.includes('localhost')) {
          cachedLanOrigin = data.mobileUrlBase;
          return data.mobileUrlBase;
        }
      }
    } catch {}
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

class SessionHandoffService {
  /**
   * Generates a temporary Session QR handoff token for transferring the active kiosk session to mobile.
   * Scoped to the session, valid for 2 hours.
   */
  public generateSessionQR(sessionId: string, customerId: string, customOrigin?: string): {
    handoff: SessionHandoff;
    mobileUrl: string;
    expiresInMins: number;
  } {
    const handoff = db.createSessionHandoff(sessionId, customerId);
    const origin = customOrigin || cachedLanOrigin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const currentCart = db.getCart(sessionId);
    const cartParam = currentCart.length > 0 ? `&cart_data=${encodeURIComponent(JSON.stringify(currentCart))}` : '';
    const mobileUrl = `${origin}/mobile?session_token=${encodeURIComponent(handoff.secure_token)}&session_id=${encodeURIComponent(sessionId)}${cartParam}`;
    
    return {
      handoff,
      mobileUrl,
      expiresInMins: 120
    };
  }

  /**
   * Validates a session handoff when scanned or loaded in mobile browser.
   */
  public consumeSessionHandoff(
    token: string,
    targetSessionId?: string,
    currentCustomerId?: string
  ): {
    success: boolean;
    session?: ShoppingSession;
    customer?: Customer;
    handoff?: SessionHandoff;
    error?: string;
  } {
    const res = db.validateSessionHandoff(token, targetSessionId, currentCustomerId);
    if (!res.valid) {
      return {
        success: false,
        error: res.error || 'Failed to validate Session QR.'
      };
    }

    return {
      success: true,
      session: res.session,
      customer: res.customer,
      handoff: res.handoff
    };
  }
}

export const sessionHandoffService = new SessionHandoffService();
