import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseAdminClient } from '../src/server/supabaseAdmin.js';

export interface ManagerClaims {
  sub: string;
  name: string;
  role: 'STORE_MANAGER' | 'ADMIN';
  branchId: string;
  exp: number;
}

export class CustomerIdentityVerificationError extends Error {
  constructor(public readonly code: 'IDENTITY_MISSING' | 'IDENTITY_VERIFICATION_UNAVAILABLE' | 'IDENTITY_TOKEN_INVALID') {
    super(code === 'IDENTITY_MISSING' ? 'Customer identity token is required.'
      : code === 'IDENTITY_VERIFICATION_UNAVAILABLE' ? 'Customer identity verification service is unavailable.'
      : 'Customer identity token is invalid, revoked, or does not match this customer.');
    this.name = 'CustomerIdentityVerificationError';
  }
}

function sessionSecret(): string {
  const secret = (typeof process !== 'undefined' ? process.env?.MANAGER_SESSION_SECRET : '') || '';
  if (secret.length >= 32) return secret;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    return 'grocerai-local-demo-manager-session-secret-v1';
  }
  throw new Error('Manager authentication is not configured. Set MANAGER_SESSION_SECRET to at least 32 characters.');
}

export function issueManagerToken(manager: Omit<ManagerClaims, 'exp'>): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + 4 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ ...manager, exp })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return { token: `${payload}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function authenticateManagerRequest(req: any): ManagerClaims {
  const header = String(req.headers?.authorization || '');
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) throw new Error('Manager authentication required.');
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest();
  let provided: Buffer;
  try { provided = Buffer.from(signature, 'base64url'); } catch { throw new Error('Invalid manager session.'); }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new Error('Invalid manager session.');
  let claims: ManagerClaims;
  try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { throw new Error('Invalid manager session.'); }
  if (!claims.sub || !['STORE_MANAGER', 'ADMIN'].includes(claims.role) || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Manager session has expired or is invalid.');
  }
  return claims;
}

export async function authenticateCustomerIdentity(token: string, expectedCustomerId?: string): Promise<{ customerId: string }> {
  const cleaned = String(token || '').trim();
  // Identity is established by an exact active-token lookup below, not by a
  // locally invented minimum length. Older seeded demo passes are shorter;
  // rejecting them before checking Supabase incorrectly made valid sessions
  // appear unverified. Empty input is still missing identity, and ownership,
  // token status, and optional expected-customer matching remain mandatory.
  if (!cleaned) throw new CustomerIdentityVerificationError('IDENTITY_MISSING');
  const client = getSupabaseAdminClient();
  if (!client) throw new CustomerIdentityVerificationError('IDENTITY_VERIFICATION_UNAVAILABLE');
  let query = client.from('customer_identity_tokens')
    .select('customer_id')
    .eq('secure_token', cleaned)
    .eq('status', 'active');
  if (expectedCustomerId) query = query.eq('customer_id', expectedCustomerId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new CustomerIdentityVerificationError('IDENTITY_VERIFICATION_UNAVAILABLE');
  if (!data?.customer_id) throw new CustomerIdentityVerificationError('IDENTITY_TOKEN_INVALID');
  return { customerId: data.customer_id };
}

