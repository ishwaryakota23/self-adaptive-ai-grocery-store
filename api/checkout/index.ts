import { handleCors, sendJson } from '../_utils.js';

/**
 * Legacy checkout shortcut disabled.
 *
 * This legacy shortcut is disabled. The hackathon demo completes a shopping
 * session without creating a paid transaction or sales record.
 */
export default function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  return sendJson(res, 410, {
    success: false,
    error: 'Use the verified demo checkout flow in the application.'
  });
}
