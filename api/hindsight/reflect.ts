import { hindsightService } from '../../src/services/hindsightService.js';
import { authorizeHindsightBank } from '../_auth.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await getRequestBody(req);
    const bankId = body.bankId || hindsightService.getStoreBank();
    const query = body.query || '';
    const context = body.context;

    await authorizeHindsightBank(req, String(bankId));
    const result = await hindsightService.reflect(bankId, query, { context });
    return sendJson(res, 200, result);
  } catch (err: any) {
    const status = /authentication|authorized|identity|token|expired|revoked|manager session/i.test(err?.message || '') ? 403 : 500;
    return sendJson(res, status, { success: false, answer: '', error: err?.message || 'Reflect failed' });
  }
}
