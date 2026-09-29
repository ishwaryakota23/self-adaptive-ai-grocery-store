import { groqCustomerAgentServer } from '../src/server/groqCustomerAgent';
import { getRequestBody, handleCors, sendJson } from './_utils';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await getRequestBody(req);
    const agentResponse = await groqCustomerAgentServer.processRequest(payload);
    return sendJson(res, 200, agentResponse);
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      groqConfigured: groqCustomerAgentServer.isConfigured(),
      error: err?.message || 'Server error processing request'
    });
  }
}
