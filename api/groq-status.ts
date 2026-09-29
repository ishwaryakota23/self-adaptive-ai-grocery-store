declare const process: any;

import { groqCustomerAgentServer } from '../src/server/groqCustomerAgent';
import { handleCors, sendJson } from './_utils';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  return sendJson(res, 200, {
    isConfigured: groqCustomerAgentServer.isConfigured(),
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  });
}
