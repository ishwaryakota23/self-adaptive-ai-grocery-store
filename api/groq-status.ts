declare const process: any;

import { groqCustomerAgentServer } from '../src/server/groqCustomerAgent.js';
import { handleCors, sendJson } from './_utils.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    return sendJson(res, 200, {
      isConfigured: groqCustomerAgentServer.isConfigured(),
      model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      isConfigured: false,
      error: err?.message || 'Failed to check Groq status'
    });
  }
}
