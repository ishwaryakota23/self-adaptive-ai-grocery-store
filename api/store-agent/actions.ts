import { storeAgentTools } from '../../src/services/storeAgentTools.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await getRequestBody(req);
    const { action, recommendationId, modifications, reason, managerName } = payload;
    let result: any;

    if (action === 'approve') {
      result = storeAgentTools.approveRecommendation(recommendationId, managerName);
    } else if (action === 'modify') {
      result = storeAgentTools.modifyRecommendation(recommendationId, modifications || {}, managerName);
    } else if (action === 'dismiss') {
      result = storeAgentTools.dismissRecommendation(recommendationId, reason, managerName);
    } else if (action === 'execute') {
      result = storeAgentTools.executeApprovedRecommendation(recommendationId);
    } else if (action === 'generate') {
      result = storeAgentTools.generateStoreRecommendations();
    } else {
      throw new Error(`Unsupported store action: ${action}`);
    }

    return sendJson(res, 200, { success: true, result });
  } catch (err: any) {
    return sendJson(res, 400, {
      success: false,
      error: err?.message || 'Store action execution failed'
    });
  }
}
