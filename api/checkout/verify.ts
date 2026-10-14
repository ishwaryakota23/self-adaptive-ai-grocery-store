import { backendAuthority } from '../../src/server/backendAuthority.js';
import { authenticateManagerRequest } from '../_auth.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  return sendJson(res, 410, { success: false, error: 'This legacy in-memory physical checkout endpoint is disabled.' });

  try {
    authenticateManagerRequest(req);
    let sessionId: string;
    let customerId: string | undefined;

    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost:3000');
      sessionId = url.searchParams.get('session_id') || url.searchParams.get('sessionId') || '';
      customerId = url.searchParams.get('customer_id') || url.searchParams.get('customerId') || undefined;
    } else {
      const body = await getRequestBody(req);
      sessionId = body.sessionId || body.session_id;
      customerId = body.customerId || body.customer_id;
    }

    if (!sessionId) {
      return sendJson(res, 400, { error: 'sessionId is required for physical checkout verification' });
    }

    const result = backendAuthority.verifyPhysicalCheckout(sessionId, customerId);

    return sendJson(res, 200, {
      success: true,
      ...result
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Verification failed'
    });
  }
}
