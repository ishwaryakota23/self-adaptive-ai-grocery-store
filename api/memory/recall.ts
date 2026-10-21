import { recallMemories } from '../../src/server/memoryEngine.js';
import { authorizeMemoryScope } from './_scope.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, memories: [], error: 'Method Not Allowed' });
  try {
    const body = await getRequestBody(req);
    if (typeof body.query !== 'string' || !body.query.trim()) return sendJson(res, 400, { success: false, memories: [], error: 'A recall query is required.' });
    const scope = await authorizeMemoryScope(req, body);
    const result = await recallMemories({ ...scope, query: body.query, limit: Math.min(Number(body.limit) || 8, 30) });
    return sendJson(res, result.success ? 200 : 503, result);
  } catch (error: any) {
    const status = /authentication|authorized|identity|token|expired|revoked|manager session/i.test(error?.message || '') ? 403 : 500;
    return sendJson(res, status, { success: false, memories: [], error: error?.message || 'Memory recall failed.' });
  }
}
