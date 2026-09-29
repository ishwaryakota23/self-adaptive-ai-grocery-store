import { groqStoreAgentServer } from '../../src/server/groqStoreAgent.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await getRequestBody(req);
    const agentResponse = await groqStoreAgentServer.processRequest(payload);
    return sendJson(res, 200, agentResponse);
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      groqConfigured: groqStoreAgentServer.isConfigured(),
      error: err?.message || 'Server error processing store agent request'
    });
  }
}
