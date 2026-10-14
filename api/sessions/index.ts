import { handleCors, sendJson } from '../_utils.js';

export default function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }
  return sendJson(res, 410, { success: false, error: 'This legacy in-memory session API is disabled. Use the verified session handoff flow.' });
}
