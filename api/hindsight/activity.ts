import { hindsightService } from '../../src/services/hindsightService.js';
import { handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const activities = hindsightService.getActivityLog();
    return sendJson(res, 200, {
      success: true,
      activities
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Failed to fetch Hindsight activity'
    });
  }
}
