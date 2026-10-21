import { authenticateCustomerIdentity, authenticateManagerRequest } from '../_auth.js';
import { MemoryAgent } from '../../src/server/memoryEngine.js';

export async function authorizeMemoryScope(req: any, body: any): Promise<{ agent: MemoryAgent; userId?: string; sessionId?: string; branchId?: string }> {
  const agent = String(body.agent || '').toLowerCase() as MemoryAgent;
  if (!['customer', 'store', 'security'].includes(agent)) throw new Error('Invalid memory agent scope.');
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (agent === 'customer') {
    if (/^LAB-[A-Za-z0-9_-]{1,80}$/.test(String(body.userId || ''))) {
      authenticateManagerRequest(req);
      return { agent, userId: body.userId, sessionId: safeSession(body.sessionId) };
    }
    const identity = await authenticateCustomerIdentity(token, body.userId ? String(body.userId) : undefined);
    return { agent, userId: identity.customerId, sessionId: safeSession(body.sessionId) };
  }
  const manager = authenticateManagerRequest(req);
  return { agent, branchId: manager.branchId, sessionId: safeSession(body.sessionId) };
}
function safeSession(value: unknown): string | undefined {
  const session = String(value || '');
  return /^[a-zA-Z0-9_-]{1,120}$/.test(session) ? session : undefined;
}
