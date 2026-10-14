import { backendAuthority } from '../../src/server/backendAuthority.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';
import { authenticateManagerRequest } from '../_auth.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      authenticateManagerRequest(req);
      const events = backendAuthority.getSecurityEvents(50);
      return sendJson(res, 200, { success: true, events });
    }

    if (req.method === 'POST') {
      authenticateManagerRequest(req);
      const body = await getRequestBody(req);
      const action = body.action || 'log';

      if (action === 'validate_customer_qr') {
        const token = body.token || '';
        const result = backendAuthority.validateCustomerIdentityQR(token);
        return sendJson(res, 200, result);
      }

      if (action === 'log') {
        const logged = backendAuthority.logSecurityEvent({
          event_type: body.event_type || 'SECURITY_ALERT',
          severity: body.severity || 'medium',
          details: body.details || 'Security event logged',
          metadata: body.metadata || {},
          session_id: body.session_id,
          customer_id: body.customer_id
        });
        return sendJson(res, 200, { success: true, event: logged });
      }
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err: any) {
    return sendJson(res, 500, { success: false, error: err?.message || 'Security API error' });
  }
}
