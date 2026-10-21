import { getSupabaseAdminClient } from '../../src/server/supabaseAdmin.js';
import { authenticateManagerRequest } from '../_auth.js';
import { handleCors, sendJson } from '../_utils.js';
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
  try {
    authenticateManagerRequest(req);
    const client = getSupabaseAdminClient();
    if (!client) return sendJson(res, 503, { success: false, error: 'Supabase memory storage is not configured.' });
    const { data, error } = await client.from('grocerai_memories').select('id,agent,user_id,branch_id,kind,created_at').order('created_at', { ascending: false }).limit(100);
    if (error) return sendJson(res, 503, { success: false, error: error.message });
    const activities = (data || []).filter((row: any) => row.agent !== 'customer').map((row: any) => ({ id: row.id, timestamp: row.created_at, bankId: row.branch_id || row.agent, operation: 'retain', input: `${row.agent}/${row.kind}`, resultSummary: 'Persisted in Supabase PostgreSQL.', itemCount: 1, success: true, durationMs: 0, source: 'native-memory' }));
    return sendJson(res, 200, { success: true, activities });
  } catch (error: any) {
    const status = /authentication|manager session/i.test(error?.message || '') ? 403 : 503;
    return sendJson(res, status, { success: false, error: error?.message || 'Memory activity is unavailable.' });
  }
}
