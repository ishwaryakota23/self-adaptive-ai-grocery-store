import { hindsightService } from '../../src/services/hindsightService.js';
import { authenticateManagerRequest } from '../_auth.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

const LAB_BANK_PATTERN = /^grocerai-learning-lab-(customer|store|security)-[a-z0-9-]{1,80}$/;

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });

  try {
    authenticateManagerRequest(req);
    const body = await getRequestBody(req);
    const bankId = String(body?.bankId || '');
    const domain = String(body?.domain || '').toUpperCase();
    const action = String(body?.action || 'prepare');
    if (!LAB_BANK_PATTERN.test(bankId)) {
      return sendJson(res, 400, { success: false, error: 'Only isolated Learning Lab banks can be managed here.' });
    }
    if (!['CUSTOMER', 'STORE', 'SECURITY'].includes(domain)) {
      return sendJson(res, 400, { success: false, error: 'Unknown Learning Lab agent domain.' });
    }

    if (action === 'prepare') {
      await hindsightService.prepareLearningLabBank(bankId, domain as 'CUSTOMER' | 'STORE' | 'SECURITY');
      return sendJson(res, 200, { success: true, bankId, operation: 'bank_ready' });
    }
    if (action === 'reset') {
      if (!/-run-[a-z0-9-]{12,20}$/.test(bankId)) {
        return sendJson(res, 400, { success: false, error: 'Reset is limited to uniquely scoped banks created by an individual Learning Lab run.' });
      }
      await hindsightService.resetLearningLabBank(bankId);
      return sendJson(res, 200, { success: true, bankId, operation: 'bank_deleted' });
    }
    return sendJson(res, 400, { success: false, error: 'Unsupported Learning Lab action.' });
  } catch (err: any) {
    const status = /authentication|manager session/i.test(err?.message || '') ? 403 : 503;
    return sendJson(res, status, { success: false, error: err?.message || 'Hindsight Learning Lab operation failed.' });
  }
}
