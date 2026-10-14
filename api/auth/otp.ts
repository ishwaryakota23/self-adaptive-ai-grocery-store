import { backendAuthority } from '../../src/server/backendAuthority.js';
import { generateSecureToken, hashStringSync } from '../../src/server/backendAuthority.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../src/server/supabaseAdmin.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

function getQrToken(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return parsed.tok || parsed.secure_token || parsed.token || value;
  } catch {
    return value;
  }
}

async function persistIdentity(customer: any, identityToken: any, session: any) {
  const client = getSupabaseAdminClient();
  if (!client) return;

  const customerWrite = await client.from('customers').upsert({
    customer_id: customer.customer_id,
    email: customer.email || null,
    email_verified_at: customer.email_verified_at || null,
    whatsapp_number: customer.whatsapp_number || null,
    name: customer.name,
    language: customer.language || 'en',
    metadata: customer.metadata || {},
    updated_at: customer.updated_at || new Date().toISOString()
  }, { onConflict: 'customer_id' });
  if (customerWrite.error) throw customerWrite.error;

  const tokenWrite = await client.from('customer_identity_tokens').upsert({
    customer_id: identityToken.customer_id,
    secure_token: identityToken.secure_token,
    qr_payload: identityToken.qr_payload,
    status: identityToken.status,
    delivered_via_email: Boolean(identityToken.delivered_via_email),
    delivered_via_whatsapp: Boolean(identityToken.delivered_via_whatsapp),
    created_at: identityToken.created_at,
    updated_at: identityToken.updated_at,
    revoked_at: identityToken.revoked_at || null
  }, { onConflict: 'secure_token' });
  if (tokenWrite.error) throw tokenWrite.error;

  const sessionWrite = await client.from('shopping_sessions').upsert({
    session_id: session.session_id,
    customer_id: session.customer_id,
    device_type: session.device_type,
    status: session.status,
    interaction_mode: session.interaction_mode,
    started_at: session.started_at,
    last_activity_at: session.last_activity_at,
    completed_at: session.completed_at || null,
    metadata: session.metadata || {}
  }, { onConflict: 'session_id' });
  if (sessionWrite.error) throw sessionWrite.error;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await getRequestBody(req);
    const action = body.action || 'request';

    if (action === 'request') {
      const identifier = (body.email || body.phoneNumber || body.whatsapp_number || body.identifier || '').trim();
      if (!identifier) {
        return sendJson(res, 400, { success: false, message: 'Email or phone number required' });
      }
      const isEmail = identifier.includes('@');
      const cleanId = isEmail ? identifier.toLowerCase() : identifier.replace(/[\s\-\+]/g, '');

      // Issue cryptographic OTP in backendAuthority with skipEmailDispatch: true
      const result = backendAuthority.requestOTP(cleanId, req.headers?.['x-forwarded-for'] || '127.0.0.1', { skipEmailDispatch: true });
      if (!result.success) {
        return sendJson(res, 429, result);
      }

      // Dispatch single real email via Resend and await confirmation
      if (isEmail) {
        const rawOtp = backendAuthority.getLastOtp(cleanId);
        if (rawOtp) {
          const emailResult = await backendAuthority.emailProvider.sendOtpEmail(cleanId, rawOtp);
          if (!emailResult.success) {
            console.error('[GrocerAI Resend Dispatch Error]:', emailResult.error);
            return sendJson(res, 400, {
              success: false,
              message: emailResult.error || 'Failed to dispatch OTP verification email via Resend.'
            });
          }
        }
      }

      if (isSupabaseAdminConfigured()) {
        const rawOtp = backendAuthority.getLastOtp(cleanId);
        const client = getSupabaseAdminClient();
        if (!rawOtp || !client) return sendJson(res, 500, { success: false, message: 'Could not prepare a persistent verification code.' });
        const salt = generateSecureToken('otp');
        const stored = await client.from('otps').upsert({
          phone: cleanId,
          otp_hash: hashStringSync(rawOtp, salt),
          salt,
          attempts_left: 3,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          last_requested_at: new Date().toISOString(),
          used: false
        }, { onConflict: 'phone' });
        if (stored.error) return sendJson(res, 500, { success: false, message: `Could not persist verification state: ${stored.error.message}` });
      }

      return sendJson(res, 200, {
        success: true,
        message: isEmail ? `Verification OTP sent to ${cleanId}. Please check your inbox.` : `Verification OTP sent to WhatsApp number ${cleanId}.`
      });
    }

    if (action === 'verify') {
      const identifier = (body.email || body.phoneNumber || body.whatsapp_number || body.identifier || '').trim();
      const isEmail = identifier.includes('@');
      const cleanId = isEmail ? identifier.toLowerCase() : identifier.replace(/[\s\-\+]/g, '');
      const code = (body.code || body.otp || '').trim();

      let result: { valid: boolean; error?: string };
      if (isSupabaseAdminConfigured()) {
        const client = getSupabaseAdminClient();
        const { data: record, error } = await client!.from('otps').select('*').eq('phone', cleanId).maybeSingle();
        if (error) return sendJson(res, 500, { valid: false, error: error.message });
        if (!record || record.used || Date.now() > new Date(record.expires_at).getTime()) {
          result = { valid: false, error: 'Verification code is invalid or expired. Please request a new one.' };
        } else if ((record.attempts_left || 0) <= 0) {
          result = { valid: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
        } else if (hashStringSync(code, record.salt) !== record.otp_hash) {
          await client!.from('otps').update({ attempts_left: record.attempts_left - 1 }).eq('phone', cleanId);
          result = { valid: false, error: `Invalid OTP. ${record.attempts_left - 1} attempt(s) remaining.` };
        } else {
          const marked = await client!.from('otps').update({ used: true, attempts_left: record.attempts_left - 1 }).eq('phone', cleanId);
          if (marked.error) return sendJson(res, 500, { valid: false, error: marked.error.message });
          if (isEmail) {
            const verification = await client!.from('verified_customer_emails').upsert({
              email: cleanId,
              verified_until: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            }, { onConflict: 'email' });
            if (verification.error) return sendJson(res, 500, { valid: false, error: verification.error.message });
          }
          result = { valid: true };
        }
      } else {
        result = backendAuthority.verifyOTP(cleanId, code);
      }
      if (!result.valid) {
        return sendJson(res, 400, result);
      }
      return sendJson(res, 200, result);
    }

    if (action === 'register') {
      const cleanEmail = body.email ? body.email.trim().toLowerCase() : undefined;
      const cleanPhone = (body.whatsapp_number || body.phoneNumber)
        ? (body.whatsapp_number || body.phoneNumber).replace(/[\s\-\+]/g, '')
        : undefined;

      if (!cleanEmail) return sendJson(res, 400, { success: false, error: 'A verified email address is required to register.' });

      if (cleanEmail && isSupabaseAdminConfigured()) {
        const client = getSupabaseAdminClient();
        const { data: verification, error } = await client!.from('verified_customer_emails')
          .select('email,verified_until').eq('email', cleanEmail).maybeSingle();
        if (error) return sendJson(res, 500, { success: false, error: error.message });
        if (!verification || Date.now() > new Date(verification.verified_until).getTime()) {
          return sendJson(res, 403, { success: false, error: 'Verify your email before creating your customer account.' });
        }
        const { data: existing, error: existingError } = await client!.from('customers').select('customer_id').ilike('email', cleanEmail).maybeSingle();
        if (existingError) return sendJson(res, 500, { success: false, error: `Could not check the customer account: ${existingError.message}` });
        if (existing) {
          return sendJson(res, 409, {
            success: false,
            code: 'CUSTOMER_ALREADY_EXISTS',
            error: 'This email is already registered. Please sign in as a returning customer.'
          });
        }
      }

      // Check authoritative local records to prevent duplicate customer generation
      if (cleanEmail) {
        const existingInAuthority = backendAuthority.getCustomerByEmail(cleanEmail);
        if (existingInAuthority) {
          return sendJson(res, 409, {
            success: false,
            code: 'CUSTOMER_ALREADY_EXISTS',
            error: 'This email is already registered. Please sign in as a returning customer.'
          });
        }
      }

      const result = backendAuthority.registerCustomer({
        email: cleanEmail,
        whatsapp_number: cleanPhone,
        name: body.name || 'Shopper',
        language: body.language || 'en',
        skipNotifications: true
      });
      if (cleanEmail) result.customer.email_verified_at = new Date().toISOString();

      try {
        if (isSupabaseAdminConfigured()) await persistIdentity(result.customer, result.identityToken, result.session);
      } catch (persistError: any) {
        if (persistError?.code === '23505' && cleanEmail && isSupabaseAdminConfigured()) {
          const { data: duplicate, error: duplicateLookupError } = await getSupabaseAdminClient()!
            .from('customers').select('customer_id').ilike('email', cleanEmail).maybeSingle();
          if (duplicateLookupError) return sendJson(res, 500, { success: false, error: `Could not resolve concurrent registration: ${duplicateLookupError.message}` });
          if (duplicate) {
            return sendJson(res, 409, {
              success: false,
              code: 'CUSTOMER_ALREADY_EXISTS',
              error: 'This email is already registered. Please sign in as a returning customer.'
            });
          }
        }
        return sendJson(res, 500, { success: false, error: `Customer registration could not be saved: ${persistError?.message || 'database error'}` });
      }

      if (cleanEmail && isSupabaseAdminConfigured()) {
        const { error } = await getSupabaseAdminClient()!.from('verified_customer_emails').delete().eq('email', cleanEmail);
        if (error) return sendJson(res, 500, { success: false, error: `Customer was saved but verification cleanup failed: ${error.message}` });
      }

      // Send real email with Customer Identity Pass via Resend
      if (cleanEmail && result.identityToken) {
        try {
          await backendAuthority.emailProvider.sendCustomerIdentityQREmail(
            cleanEmail,
            result.customer.name,
            result.identityToken.qr_payload
          );
        } catch (e) {
          console.error('Failed to dispatch QR pass email:', e);
        }
      }
      if (cleanPhone && result.identityToken) {
        try {
          await backendAuthority.whatsAppProvider.sendMessage(
            cleanPhone,
            'IDENTITY_QR',
            result.identityToken.qr_payload,
            { customerId: result.customer.customer_id, token: result.identityToken.secure_token }
          );
        } catch (e) {
          console.error('Failed to dispatch customer identity QR via WhatsApp:', e);
        }
      }

      return sendJson(res, 200, { success: true, ...result });
    }

    if (action === 'login') {
      const identifier = (body.email || body.whatsapp_number || body.phoneNumber || '').trim();
      const result = backendAuthority.loginCustomerWithOTP(identifier);
      return sendJson(res, 200, { success: true, ...result });
    }

    if (action === 'verify-identity-qr' || action === 'login-qr') {
      const token = (body.token || body.qrPayload || body.identifier || '').trim();
      if (!token) {
        return sendJson(res, 400, { success: false, error: 'Token or QR payload required' });
      }

      if (isSupabaseAdminConfigured()) {
        const client = getSupabaseAdminClient();
        const secureToken = getQrToken(token);
        const { data: storedToken, error: tokenError } = await client!.from('customer_identity_tokens')
          .select('*').eq('secure_token', secureToken).eq('status', 'active').maybeSingle();
        if (tokenError) return sendJson(res, 500, { success: false, error: tokenError.message });
        if (storedToken) {
          const { data: storedCustomer, error: customerError } = await client!.from('customers')
            .select('*').eq('customer_id', storedToken.customer_id).maybeSingle();
          if (customerError) return sendJson(res, 500, { success: false, error: customerError.message });
          if (!storedCustomer) return sendJson(res, 404, { success: false, error: 'Customer profile was not found.' });
          backendAuthority.importCustomer({
            ...storedCustomer,
            language: storedCustomer.language || 'en',
            metadata: storedCustomer.metadata || {},
            created_at: storedCustomer.created_at || new Date().toISOString(),
            updated_at: storedCustomer.updated_at || new Date().toISOString()
          });
          backendAuthority.importIdentityToken({
            ...storedToken,
            delivered_via_email: Boolean(storedToken.delivered_via_email),
            delivered_via_whatsapp: Boolean(storedToken.delivered_via_whatsapp)
          });
        }
      }

      const valRes = backendAuthority.validateCustomerIdentityQR(token);
      if (!valRes.valid || !valRes.customer || !valRes.tokenRecord) {
        return sendJson(res, 400, { success: false, error: valRes.error || 'Invalid Customer Identity QR' });
      }

      const loginRes = backendAuthority.loginCustomerWithQR(token);
      try {
        if (isSupabaseAdminConfigured()) await persistIdentity(loginRes.customer, loginRes.identityToken, loginRes.session);
      } catch (persistError: any) {
        return sendJson(res, 500, { success: false, error: `Shopping session could not be saved: ${persistError?.message || 'database error'}` });
      }
      return sendJson(res, 200, {
        success: true,
        customer: loginRes.customer,
        identityToken: loginRes.identityToken,
        authToken: loginRes.authToken,
        session: loginRes.session,
        cart: loginRes.cart,
        sessionHandoff: loginRes.sessionHandoff
      });
    }

    return sendJson(res, 400, { error: 'Unknown action' });
  } catch (err: any) {
    return sendJson(res, 500, { success: false, error: err?.message || 'Authentication error' });
  }
}
