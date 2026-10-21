import { getSupabaseAdminClient } from '../../src/server/supabaseAdmin.js';
import { authenticateManagerRequest } from '../_auth.js';
import { handleCors, sendJson } from '../_utils.js';
export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { isHealthy: false, error: 'Method Not Allowed' });
  try {
    authenticateManagerRequest(req);
    const client = getSupabaseAdminClient();
    if (!client) return sendJson(res, 503, { isHealthy: false, error: 'Supabase memory storage is not configured.' });
    const { error } = await client.from('grocerai_memories').select('id').limit(1);
    if (error) return sendJson(res, 503, { isHealthy: false, error: error.message });
    return sendJson(res, 200, { isHealthy: true, status: { state: 'connected', diagnosticCode: 'NATIVE_MEMORY_READY', storeBank: { id: 'BRANCH-104', availability: 'available' }, securityBank: { id: 'BRANCH-104', availability: 'available' }, diagnosticsAreReadOnly: true } });
  } catch (error: any) {
    const status = /authentication|manager session/i.test(error?.message || '') ? 403 : 503;
    return sendJson(res, status, { isHealthy: false, error: error?.message || 'Native memory is unavailable.' });
  }
}
