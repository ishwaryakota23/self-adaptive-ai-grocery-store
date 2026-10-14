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
    const activities = await hindsightService.fetchCloudActivityLog();
    return sendJson(res, 200, {
      success: true,
      activities,
      activitySource: 'hindsight-cloud-audit-log',
      note: 'Entries are Hindsight Cloud audit log records for the configured store and security banks.'
    });
  } catch (err: any) {
    const status = /authentication|manager session/i.test(err?.message || '') ? 403 : 500;
    return sendJson(res, status, {
      success: false,
      error: hindsightService.safeDiagnosticError(err),
      activitySource: 'hindsight-cloud-audit-log-unavailable'
    });
  }
}
