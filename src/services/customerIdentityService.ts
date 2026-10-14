import { db } from './db.js';
import { backendAuthority } from '../server/backendAuthority.js';
import { Customer, CustomerIdentityToken, ShoppingSession, Cart } from '../types/index.js';

export interface WhatsAppMessage {
  id: string;
  to_phone: string;
  sender: 'GrocerAI Official WhatsApp Business (+91 8000 GROCER)';
  type: 'OTP' | 'IDENTITY_QR' | 'ORDER_RECEIPT' | 'ALERT';
  text: string;
  qr_payload?: string;
  timestamp: string;
}

const WHATSAPP_STORAGE_KEY = 'grocer_whatsapp_simulated_messages';

class CustomerIdentityService {
  private listeners: (() => void)[] = [];
  private inMemoryMessages: WhatsAppMessage[] = [];

  constructor() {}

  public getSimulatedWhatsAppMessages(phone?: string): WhatsAppMessage[] {
    let messages = this.inMemoryMessages;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(WHATSAPP_STORAGE_KEY);
        if (stored) {
          messages = JSON.parse(stored);
          this.inMemoryMessages = messages;
        }
      } catch {
        // ignore
      }
    }
    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\+]/g, '');
      return messages.filter(m => m.to_phone.replace(/[\s\-\+]/g, '') === cleanPhone);
    }
    return messages;
  }

  private saveWhatsAppMessage(message: WhatsAppMessage) {
    this.inMemoryMessages.unshift(message);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WHATSAPP_STORAGE_KEY, JSON.stringify(this.inMemoryMessages.slice(0, 30)));
        window.dispatchEvent(new Event('grocer_whatsapp_sync'));
      } catch (e) {
        console.warn('Failed to save simulated WhatsApp message', e);
      }
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    if (typeof window !== 'undefined') {
      window.addEventListener('grocer_whatsapp_sync', listener);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
      if (typeof window !== 'undefined') {
        window.removeEventListener('grocer_whatsapp_sync', listener);
      }
    };
  }

  private notifyListeners() {
    for (const l of this.listeners) l();
  }

  /**
   * Request OTP for a customer (Email or WhatsApp phone number).
   * Dispatches real email via /api/auth/otp endpoint through Resend.
   */
  public async requestOTP(identifier: string): Promise<{ success: boolean; message: string; simulatedCode?: string; retryAfterSec?: number }> {
    const isEmail = identifier.includes('@');
    const cleanId = isEmail ? identifier.trim().toLowerCase() : identifier.trim().replace(/[\s\-\+]/g, '');

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      try {
        const res = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request', identifier: cleanId })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || data.error || 'Failed to dispatch verification OTP.'
          };
        }
        return {
          success: true,
          message: data.message || `Verification OTP sent to ${cleanId}. Please check your inbox.`
        };
      } catch (err: any) {
        console.warn('Network dispatch failed, falling back to local authority', err);
      }
    }

    // Fallback for node test runners or offline simulation
    const res = backendAuthority.requestOTP(cleanId);
    const issuedCode = backendAuthority.getLastOtp(cleanId) || '';

    if (!isEmail && res.success) {
      const whatsappMsg: WhatsAppMessage = {
        id: `wmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        to_phone: cleanId,
        sender: 'GrocerAI Official WhatsApp Business (+91 8000 GROCER)',
        type: 'OTP',
        text: `Your GrocerAI verification code is: ${issuedCode}. Valid for 5 minutes. Do not share this code with anyone.`,
        timestamp: new Date().toISOString()
      };
      this.saveWhatsAppMessage(whatsappMsg);
    }

    return {
      success: res.success,
      message: res.message,
      simulatedCode: issuedCode,
      retryAfterSec: res.retryAfterSec
    };
  }

  /**
   * Verify OTP submitted by customer (Email or phone).
   * Validated server-side via /api/auth/otp.
   */
  public async verifyOTP(identifier: string, submittedCode: string): Promise<{ valid: boolean; error?: string }> {
    const isEmail = identifier.includes('@');
    const cleanId = isEmail ? identifier.trim().toLowerCase() : identifier.trim().replace(/[\s\-\+]/g, '');

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      try {
        const res = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', identifier: cleanId, code: submittedCode })
        });
        const data = await res.json();
        if (!res.ok || !data.valid) {
          return { valid: false, error: data.error || 'Invalid OTP code.' };
        }
        backendAuthority.verifyOTP(cleanId, submittedCode);
        return { valid: true };
      } catch (err: any) {
        console.warn('Network verify failed, falling back to local authority', err);
      }
    }

    return backendAuthority.verifyOTP(cleanId, submittedCode);
  }

  /**
   * Test-only helper to inspect the last issued OTP for automated test suites.
   */
  public getTestLastOtp(identifier: string): string | undefined {
    return backendAuthority.getLastOtp(identifier);
  }

  /**
   * Register a new customer after OTP verification.
   * Creates customer, issues Customer Identity QR, dispatches email / WhatsApp,
   * and creates a fresh shopping session with a strictly empty cart.
   */
  public async registerNewCustomer(data: {
    email?: string;
    whatsapp_number?: string;
    name?: string;
    language?: 'en' | 'te' | 'hi';
    dietary_preferences?: string[];
  }): Promise<{
    customer: Customer;
    identityToken: CustomerIdentityToken;
    authToken: string;
    session: ShoppingSession;
    cart: Cart;
  }> {
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : undefined;
    const cleanPhone = data.whatsapp_number ? data.whatsapp_number.trim().replace(/[\s\-\+]/g, '') : undefined;
    const finalName = data.name?.trim() || 'Shopper';

    // Complete registration on the server so verified identity, QR, and first visit
    // are persisted together before the customer is allowed into the store.
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: cleanEmail,
          whatsapp_number: cleanPhone,
          name: finalName,
          language: data.language || 'en'
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.customer || !result.identityToken || !result.session || !result.cart) {
        throw new Error(result.error || result.message || 'Could not save the verified customer profile. Please try again.');
      }

      backendAuthority.importCustomer(result.customer);
      backendAuthority.importIdentityToken(result.identityToken);
      db.importAuthenticatedCustomerSession(result.customer, result.identityToken, result.session, result.cart);
      if (data.dietary_preferences?.length) {
        db.updateCustomerPreferences(result.customer.customer_id, { dietary_preferences: data.dietary_preferences });
      }
      return result;
    }

    const authResult = backendAuthority.registerCustomer({
      email: cleanEmail,
      whatsapp_number: cleanPhone,
      name: finalName,
      language: data.language
    });

    // Mirror into db.ts for client UI synchronization
    let customer = cleanEmail ? db.getCustomerByEmail(cleanEmail) : undefined;
    if (!customer && cleanPhone) {
      customer = db.getCustomerByPhone(cleanPhone);
    }
    if (!customer) {
      customer = db.createCustomer({
        customer_id: authResult.customer.customer_id,
        email: cleanEmail,
        whatsapp_number: cleanPhone,
        name: finalName,
        language: data.language || 'en'
      });
    }

    if (data.dietary_preferences && data.dietary_preferences.length > 0) {
      db.updateCustomerPreferences(customer.customer_id, {
        dietary_preferences: data.dietary_preferences
      });
    }

    // Mirror active token into db.ts state
    if ((db as any).state?.customerIdentityTokens) {
      (db as any).state.customerIdentityTokens.push(authResult.identityToken);
    }

    // Deliver Identity QR via WhatsApp if phone was provided
    if (cleanPhone) {
      const welcomeMsg: WhatsAppMessage = {
        id: `wmsg-qr-${Date.now()}`,
        to_phone: cleanPhone,
        sender: 'GrocerAI Official WhatsApp Business (+91 8000 GROCER)',
        type: 'IDENTITY_QR',
        text: `Welcome to GrocerAI, ${customer.name}! 🎉 Here is your official In-Store Customer Identity QR.\n\nSave this QR code to your phone. Whenever you walk into our store, simply scan this QR at any kiosk to automatically sign in and begin your personalized shopping session.`,
        qr_payload: authResult.identityToken.qr_payload,
        timestamp: new Date().toISOString()
      };
      this.saveWhatsAppMessage(welcomeMsg);
    }

    // Sync session and cart with db.ts
    const sessionRes = db.createShoppingSession(customer.customer_id, 'KIOSK');

    return {
      customer: authResult.customer,
      identityToken: authResult.identityToken,
      authToken: authResult.authToken,
      session: sessionRes.session,
      cart: sessionRes.cart
    };
  }

  /**
   * Login returning customer using Customer Identity QR scan (Synchronous).
   * Starts a brand new shopping session with a strictly EMPTY cart.
   */
  public loginWithCustomerIdentityQR(qrTokenOrPayload: string): {
    success: boolean;
    customer?: Customer;
    identityToken?: CustomerIdentityToken;
    session?: ShoppingSession;
    cart?: Cart;
    error?: string;
  } {
    let validation = backendAuthority.validateCustomerIdentityQR(qrTokenOrPayload);
    if (!validation.valid || !validation.customer) {
      const dbVal = db.validateCustomerIdentityToken(qrTokenOrPayload);
      if (dbVal.valid && dbVal.customer) {
        validation = {
          valid: true,
          customer: dbVal.customer,
          tokenRecord: dbVal.tokenRecord
        };
      } else {
        return { success: false, error: validation.error || dbVal.error || 'Invalid Customer Identity QR.' };
      }
    }

    if (!validation.customer) {
      return { success: false, error: 'Customer profile associated with this QR was not found.' };
    }

    const customer = validation.customer;
    // Mirror into db.ts if missing
    if (!db.getCustomer(customer.customer_id)) {
      db.createCustomer({
        customer_id: customer.customer_id,
        email: customer.email,
        whatsapp_number: customer.whatsapp_number,
        name: customer.name,
        language: customer.language
      });
    }

    // Start a fresh shopping session with an EMPTY cart (Never restore previous visit cart)
    const { session, cart } = db.createShoppingSession(customer.customer_id, 'KIOSK');

    return {
      success: true,
      customer,
      identityToken: validation.tokenRecord,
      session,
      cart
    };
  }

  /**
   * Login returning customer using Customer Identity QR scan (Asynchronous with server-side authority fallback).
   */
  public async loginWithCustomerIdentityQRAsync(qrTokenOrPayload: string): Promise<{
    success: boolean;
    customer?: Customer;
    identityToken?: CustomerIdentityToken;
    session?: ShoppingSession;
    cart?: Cart;
    error?: string;
  }> {
    // Resolve through the server first so a returning customer can sign in on a
    // different kiosk/browser and every visit is recorded in persistent storage.
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      try {
        const resp = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify-identity-qr', token: qrTokenOrPayload })
        });
        if (resp.ok) {
          const srvData = await resp.json();
          if (srvData.success && srvData.customer && srvData.identityToken && srvData.session && srvData.cart) {
            backendAuthority.importCustomer(srvData.customer);
            backendAuthority.importIdentityToken(srvData.identityToken);
            db.importAuthenticatedCustomerSession(
              srvData.customer,
              srvData.identityToken,
              srvData.session,
              srvData.cart
            );
            return {
              success: true,
              customer: srvData.customer,
              identityToken: srvData.identityToken,
              session: srvData.session,
              cart: srvData.cart
            };
          }
        }
      } catch (err) {
        console.warn('[customerIdentityService] Backend QR verification network fallback note:', err);
      }
    }

    // Keep the existing offline/demo QR path available if the API is unavailable.
    return this.loginWithCustomerIdentityQR(qrTokenOrPayload);
  }

  /**
   * Login returning customer using WhatsApp Number + OTP.
   * Starts a brand new shopping session with an EMPTY cart.
   */
  public loginWithWhatsAppOTP(phoneNumber: string, otp: string): {
    success: boolean;
    customer?: Customer;
    identityToken?: CustomerIdentityToken;
    authToken?: string;
    session?: ShoppingSession;
    cart?: Cart;
    error?: string;
  } {
    const cleanPhone = phoneNumber.trim().replace(/[\s\-\+]/g, '');
    const otpRes = backendAuthority.verifyOTP(cleanPhone, otp);
    if (!otpRes.valid) {
      return { success: false, error: otpRes.error };
    }
    try {
      const loginRes = backendAuthority.loginCustomerWithOTP(cleanPhone);
      const { session, cart } = db.createShoppingSession(loginRes.customer.customer_id, 'KIOSK');

      return {
        success: true,
        customer: loginRes.customer,
        identityToken: loginRes.identityToken,
        authToken: loginRes.authToken,
        session,
        cart
      };
    } catch (e: any) {
      // If customer is in db.ts but not yet registered in backendAuthority, register them
      let dbCustomer = db.getCustomerByPhone(cleanPhone);
      if (!dbCustomer) {
        return { success: false, error: 'No account found with this WhatsApp number. Please choose "New Customer".' };
      }
      const regRes = backendAuthority.registerCustomer({
        whatsapp_number: cleanPhone,
        name: dbCustomer.name,
        language: dbCustomer.language as any
      });
      const { session, cart } = db.createShoppingSession(regRes.customer.customer_id, 'KIOSK');
      return {
        success: true,
        customer: regRes.customer,
        identityToken: regRes.identityToken,
        authToken: regRes.authToken,
        session,
        cart
      };
    }
  }
}

export const customerIdentityService = new CustomerIdentityService();
