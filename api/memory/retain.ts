import { storeMemory } from '../../src/server/memoryEngine.js';
import { authorizeMemoryScope } from './_scope.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    const body = await getRequestBody(req);
    if (typeof body.content !== 'string' || body.content.trim().length < 8) return sendJson(res, 400, { success: false, error: 'Memory content must contain at least eight characters.' });
    const scope = await authorizeMemoryScope(req, body);
    const result = await storeMemory({ ...scope, content: body.content, kind: String(body.kind || 'experience').slice(0, 80), metadata: body.metadata || {} });
    return sendJson(res, result.success ? 200 : 503, result);
  } catch (error: any) {
    const status = /authentication|authorized|identity|token|expired|revoked|manager session/i.test(error?.message || '') ? 403 : 500;
    return sendJson(res, status, { success: false, error: error?.message || 'Memory persistence failed.' });
  }
}
