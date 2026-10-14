import { backendAuthority } from '../../src/server/backendAuthority.js';
import { hindsightService } from '../../src/services/hindsightService.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';
import { authenticateManagerRequest } from '../_auth.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  return sendJson(res, 410, { success: false, error: 'This legacy in-memory checkout resolution endpoint is disabled.' });

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    authenticateManagerRequest(req);
    const body = await getRequestBody(req);
    const sessionId = body.sessionId || body.session_id;
    const resolutionType = body.resolutionType || 'CORRECTED_CART';
    const resolutionNote = body.resolutionNote || 'Customer verified and aligned basket with digital cart';
    const updatedItems = body.updatedItems;

    if (!sessionId) {
      return sendJson(res, 400, { error: 'sessionId is required for discrepancy resolution' });
    }

    const result = await backendAuthority.resolveCheckoutDiscrepancy({
      sessionId,
      resolutionType,
      resolutionNote,
      updatedItems
    });

    // Retain resolution in Security Hindsight
    await hindsightService.retainSecurityExperience({
      incidentType: 'TRANSACTION_ANOMALY',
      pattern: `Physical checkout discrepancy (Session ${sessionId})`,
      investigationDetails: `Computer vision detected basket mismatch. Customer prompted with non-accusatory cart verification.`,
      resolution: `Resolved via ${resolutionType}: ${resolutionNote}`,
      outcomeTakeaway: `Quantity discrepancy on session ${sessionId} resolved by ${resolutionType.toLowerCase().replace(/_/g, ' ')}; checkout authorized without loss.`
    });

    return sendJson(res, 200, {
      ...result
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Resolution failed'
    });
  }
}
