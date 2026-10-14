import { handleCors, sendJson } from '../_utils.js';

export default function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }
  return sendJson(res, 410, { success: false, error: 'This legacy in-memory cart API is disabled. Use the authenticated session cart flow.' });
}
