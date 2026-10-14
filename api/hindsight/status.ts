declare const process: any;

import { hindsightService } from '../../src/services/hindsightService.js';
import { authenticateManagerRequest } from '../_auth.js';
import { handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    authenticateManagerRequest(req);
    const status = await hindsightService.checkOperationalStatus();
    const isHealthy = status.state === 'connected';
    return sendJson(res, 200, {
      success: true,
      isHealthy,
      status,
      storeBank: hindsightService.getStoreBank(),
      activityCount: hindsightService.getActivityLog().length,
      activitySource: 'server-process-local-operation-log',
      error: isHealthy ? undefined : status.error
    });
  } catch (err: any) {
    const status = /authentication|manager session/i.test(err?.message || '') ? 403 : 503;
    return sendJson(res, status, {
      success: false,
      isHealthy: false,
      error: hindsightService.safeDiagnosticError(err)
    });
  }
}
