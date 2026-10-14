import { groqCustomerAgentServer } from '../src/server/groqCustomerAgent.js';
import { authenticateCustomerIdentity, CustomerIdentityVerificationError } from './_auth.js';
import { getRequestBody, handleCors, sendJson } from './_utils.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../src/server/supabaseAdmin.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await getRequestBody(req);
    let trustedCustomerId = '';
    let identityWarning = '';
    let identityStatus: 'verified' | 'missing' | 'invalid_or_revoked' | 'verification_unavailable' = 'missing';
    if (payload?.identityToken) {
      try {
        const identity = await authenticateCustomerIdentity(payload.identityToken, payload.verifiedCustomerId);
        trustedCustomerId = identity.customerId;
        identityStatus = 'verified';
      } catch (error: any) {
        // Keep shopping assistance available but never access a customer bank
        // without a token the server verified against the persistent token row.
        if (error instanceof CustomerIdentityVerificationError && error.code === 'IDENTITY_TOKEN_INVALID') {
          identityStatus = 'invalid_or_revoked';
          identityWarning = 'Your customer pass is invalid or revoked. Please sign in again to load saved preferences.';
        } else {
          identityStatus = 'verification_unavailable';
          identityWarning = 'Customer identity verification is temporarily unavailable. I can still help, but saved preferences are paused.';
        }
      }
    }
    let trustedSessionId = String(payload?.sessionId || '');
    if (payload?.handoffToken && isSupabaseAdminConfigured()) {
      const client = getSupabaseAdminClient();
      if (!client) return sendJson(res, 503, { success: false, error: 'Shared session verification is unavailable.' });
      const { data: handoff, error: handoffError } = await client.from('session_handoffs')
        .select('session_id,customer_id').eq('secure_token', String(payload.handoffToken))
        .eq('status', 'active').gt('expires_at', new Date().toISOString()).maybeSingle();
      if (handoffError) throw new Error(`Session verification failed: ${handoffError.message}`);
      if (!handoff) return sendJson(res, 403, { success: false, error: 'The mobile session pass is invalid or expired.' });
      const { data: session, error: sessionError } = await client.from('shopping_sessions')
        .select('session_id,customer_id,status').eq('session_id', handoff.session_id).maybeSingle();
      if (sessionError) throw new Error(`Shopping session verification failed: ${sessionError.message}`);
      if (!session || session.status !== 'active' || session.customer_id !== handoff.customer_id) {
        return sendJson(res, 403, { success: false, error: 'The mobile pass does not belong to an active customer session.' });
      }
      if (trustedCustomerId && trustedCustomerId !== session.customer_id) {
        return sendJson(res, 403, { success: false, error: 'The verified identity does not own this mobile session.' });
      }
      if (trustedSessionId && trustedSessionId !== session.session_id) {
        return sendJson(res, 403, { success: false, error: 'The request does not match the mobile session pass.' });
      }
      trustedCustomerId = session.customer_id;
      trustedSessionId = session.session_id;
      identityStatus = 'verified';
      identityWarning = '';
    }
    const agentResponse = await groqCustomerAgentServer.processRequest({
      ...payload,
      sessionId: trustedSessionId,
      customerId: trustedCustomerId,
      verifiedCustomerId: undefined,
      identityToken: undefined,
      handoffToken: undefined
    });
    agentResponse.identityStatus = identityStatus;
    agentResponse.memoryStatus = trustedCustomerId
      ? agentResponse.memoryStatus || (agentResponse.recalledMemories?.length ? 'retrieved' : 'empty')
      : 'not_attempted';
    if (identityWarning) {
      agentResponse.message = `${identityWarning} ${agentResponse.message}`;
      agentResponse.recalledMemories = [];
      agentResponse.retainedMemoryId = undefined;
      agentResponse.memoryStatus = 'not_attempted';
    }
    return sendJson(res, 200, agentResponse);
  } catch (err: any) {
    const status = /authentication|authorized|identity|token|expired|revoked/i.test(err?.message || '') ? 403 : 500;
    return sendJson(res, status, {
      success: false,
      groqConfigured: groqCustomerAgentServer.isConfigured(),
      error: err?.message || 'Server error processing request'
    });
  }
}
