declare const process: any;

import { hindsightService } from '../../src/services/hindsightService.js';
import { handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const isHealthy = await hindsightService.isHealthy();
    return sendJson(res, 200, {
      success: true,
      isHealthy,
      baseUrl: (typeof process !== 'undefined' && process.env?.HINDSIGHT_BASE_URL) || 'http://localhost:8888',
      storeBank: hindsightService.getStoreBank(),
      activityCount: hindsightService.getActivityLog().length
    });
  } catch (err: any) {
    return sendJson(res, 200, {
      success: false,
      isHealthy: false,
      error: err?.message || 'Failed to verify Hindsight status'
    });
  }
}
