import { hindsightService } from '../../src/services/hindsightService.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await getRequestBody(req);
    const { bankId, content, options } = payload || {};
    if (!bankId || !content) {
      return sendJson(res, 400, { success: false, error: 'Missing bankId or content' });
    }
    const result = await hindsightService.retain(bankId, content, options);
    return sendJson(res, 200, result);
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      bankId: '',
      itemsCount: 0,
      error: err?.message || 'Retain failed'
    });
  }
}
