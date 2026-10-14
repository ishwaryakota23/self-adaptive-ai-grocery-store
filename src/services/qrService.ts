/**
 * GrocerAI â€” Real QR Code Generation & Verification Engine
 * 
 * Uses the official 'qrcode' library to generate and verify:
 * 1. Customer Identity QR (WHO IS THIS CUSTOMER?)
 * 2. Shopping Session QR (WHICH ACTIVE SESSION SHOULD BE CONTINUED?)
 * 
 * Guarantees that generated QR codes encode genuine, backend-validatable payloads.
 */

import QRCode from 'qrcode';
import { CustomerIdentityToken, SessionHandoff, EmployeeAccount } from '../types/index.js';

export interface GeneratedQRCode {
  svg: string;
  dataUrl: string;
  rawPayload: string;
  type: 'CID' | 'SQ' | 'EMP' | 'PAY' | 'DEMO';
  token: string;
}

export interface DecodedQRPayload {
  type: 'CUSTOMER_IDENTITY' | 'SESSION_HANDOFF' | 'DEMO_PAYMENT' | 'EMPLOYEE_PASS' | 'UNKNOWN';
  token: string;
  customerId?: string;
  sessionId?: string;
  orderId?: string;
  amount?: number;
  storeId?: string;
  expiresAt?: string;
  issuedAt?: number;
  rawJson?: any;
}

export class QRService {
  public async generateDemoPaymentQR(sessionId: string, amount: number): Promise<GeneratedQRCode> {
    const rawPayload = JSON.stringify({
      type: 'GROCERAI_DEMO_PAYMENT',
      demoOnly: true,
      noMoneyTransferred: true,
      sessionId,
      amount: Number(amount.toFixed(2)),
      currency: 'INR',
      issuedAt: new Date().toISOString()
    });
    const [svg, dataUrl] = await Promise.all([
      QRCode.toString(rawPayload, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#020617', light: '#ffffff' } }),
      QRCode.toDataURL(rawPayload, { errorCorrectionLevel: 'M', margin: 2, width: 320, color: { dark: '#020617', light: '#ffffff' } })
    ]);
    return { svg, dataUrl, rawPayload, type: 'DEMO', token: `DEMO_${sessionId}` };
  }

  /**
   * Generates a real scannable QR Code for a Customer Identity Token.
   * Encodes the exact JSON payload recognized by Backend Authority.
   */
  public async generateCustomerIdentityQR(
    tokenRecord: CustomerIdentityToken,
    storeId = 'BRANCH-104'
  ): Promise<GeneratedQRCode> {
    const rawPayload = tokenRecord.qr_payload || JSON.stringify({
      t: 'CID',
      cid: tokenRecord.customer_id,
      tok: tokenRecord.secure_token,
      st: storeId,
      iat: Date.now()
    });

    const [svg, dataUrl] = await Promise.all([
      QRCode.toString(rawPayload, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' }
      }),
      QRCode.toDataURL(rawPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#020617', light: '#ffffff' }
      })
    ]);

    return {
      svg,
      dataUrl,
      rawPayload,
      type: 'CID',
      token: tokenRecord.secure_token
    };
  }

  /**
   * Generates a real scannable QR Code for a Shopping Session Handoff.
   * Encodes the temporary session token for Kiosk -> Mobile transfer.
   */
  public async generateSessionQR(
    handoffRecord: SessionHandoff
  ): Promise<GeneratedQRCode> {
    const rawPayload = handoffRecord.qr_payload || JSON.stringify({
      t: 'SQ',
      sid: handoffRecord.session_id,
      tok: handoffRecord.secure_token,
      exp: handoffRecord.expires_at
    });

    const [svg, dataUrl] = await Promise.all([
      QRCode.toString(rawPayload, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' }
      }),
      QRCode.toDataURL(rawPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#020617', light: '#ffffff' }
      })
    ]);

    return {
      svg,
      dataUrl,
      rawPayload,
      type: 'SQ',
      token: handoffRecord.secure_token
    };
  }

  /**
   * Generates a real scannable QR Code for an Employee.
   * Encodes the distinct employee domain payload for kiosk attendance & station sign-in.
   */
  public async generateEmployeeQR(
    employee: EmployeeAccount
  ): Promise<GeneratedQRCode> {
    const rawPayload = JSON.stringify({
      domain: 'GROCERAI_EMPLOYEE',
      employee_id: employee.employee_id,
      name: employee.name,
      role: employee.role,
      token: employee.qr_token,
      iat: Date.now()
    });

    const [svg, dataUrl] = await Promise.all([
      QRCode.toString(rawPayload, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' }
      }),
      QRCode.toDataURL(rawPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#020617', light: '#ffffff' }
      })
    ]);

    return {
      svg,
      dataUrl,
      rawPayload,
      type: 'EMP',
      token: employee.qr_token
    };
  }

  /**
   * Decodes and validates the structure of an incoming QR scan payload.
   * Distinguishes customer identity, session handoff, demo checkout, and employee QRs.
   */
  public decodeAndClassifyQR(rawScannedString: string): DecodedQRPayload {
    const trimmed = rawScannedString.trim();

    // 0. URL-based QR payload (Supports direct opening via Google Lens and mobile browser companion)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('/mobile')) {
      try {
        const parsedUrl = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`);
        const sid = parsedUrl.searchParams.get('session_id') || parsedUrl.searchParams.get('session');
        const tok = parsedUrl.searchParams.get('session_token') || trimmed;
        if (sid) {
          return {
            type: 'SESSION_HANDOFF',
            token: tok,
            sessionId: sid
          };
        }
      } catch {
        // continue
      }
    }

    // 1. Check prefixed formatted tokens
    if (trimmed.startsWith('GROCERAI_EMP_V1:') || trimmed.startsWith('GROCERAI_EMP:')) {
      return {
        type: 'EMPLOYEE_PASS',
        token: trimmed
      };
    }

    if (trimmed.startsWith('GROCERAI_CUST_V1:')) {
      const parts = trimmed.split(':');
      return {
        type: 'CUSTOMER_IDENTITY',
        token: trimmed,
        customerId: parts[1]
      };
    }

    if (trimmed.startsWith('GROCERAI_SESS_V1:')) {
      const parts = trimmed.split(':');
      return {
        type: 'SESSION_HANDOFF',
        token: trimmed,
        sessionId: parts[1]
      };
    }

    // 2. Try parsing structured JSON payload
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);

        // Check for Employee QR pass
        if (parsed.domain === 'GROCERAI_EMPLOYEE' || parsed.employee_id) {
          return {
            type: 'EMPLOYEE_PASS',
            token: parsed.token || trimmed,
            rawJson: parsed
          };
        }

        if (parsed.type === 'GROCERAI_DEMO_PAYMENT' && parsed.demoOnly === true && parsed.noMoneyTransferred === true) {
          return {
            type: 'DEMO_PAYMENT',
            token: `DEMO_${parsed.sessionId || ''}`,
            sessionId: parsed.sessionId,
            amount: parsed.amount,
            rawJson: parsed
          };
        }

        // Check for Customer Identity QR payload
        if (parsed.t === 'CID' || parsed.type === 'CUSTOMER_IDENTITY') {
          return {
            type: 'CUSTOMER_IDENTITY',
            token: parsed.tok || parsed.secure_token || trimmed,
            customerId: parsed.cid || parsed.customer_id,
            storeId: parsed.st || parsed.store,
            issuedAt: parsed.iat,
            rawJson: parsed
          };
        }

        // Check for Session Handoff QR payload
        if (parsed.t === 'SQ' || parsed.type === 'SESSION_HANDOFF') {
          return {
            type: 'SESSION_HANDOFF',
            token: parsed.tok || parsed.secure_token || trimmed,
            sessionId: parsed.sid || parsed.session_id,
            expiresAt: parsed.exp || parsed.expires_at,
            rawJson: parsed
          };
        }
      } catch {
        // fall back to raw token analysis
      }
    }

    // 3. Classify raw token string by substring
    if (trimmed.includes('CID_SEC_')) {
      return {
        type: 'CUSTOMER_IDENTITY',
        token: trimmed
      };
    }

    if (trimmed.includes('SQ_HANDOFF_')) {
      return {
        type: 'SESSION_HANDOFF',
        token: trimmed
      };
    }

    return {
      type: 'UNKNOWN',
      token: trimmed
    };
  }
}

export const qrService = new QRService();
export const decodeAndClassifyQR = (rawPayload: string): DecodedQRPayload => qrService.decodeAndClassifyQR(rawPayload);

