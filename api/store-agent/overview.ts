import { storeAgentTools } from '../../src/services/storeAgentTools';
import { handleCors, sendJson } from '../_utils';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const overview = storeAgentTools.getStoreOverview();
    return sendJson(res, 200, {
      success: true,
      overview
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Failed to fetch store overview'
    });
  }
}
