import { hindsightService } from '../../src/services/hindsightService';
import { getRequestBody, handleCors, sendJson } from '../_utils';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await getRequestBody(req);
    const { bankId, query, tags } = payload || {};
    if (!bankId || !query) {
      return sendJson(res, 400, { success: false, error: 'Missing bankId or query' });
    }
    const result = await hindsightService.recall(bankId, query, { tags });
    return sendJson(res, 200, result);
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      results: [],
      promptString: '',
      error: err?.message || 'Recall failed'
    });
  }
}
