export interface MobileHandoffParams {
  token: string | null;
  sessionIdHint: string | null;
  tokenMissing: boolean;
}

export function parseMobileHandoffParams(params: URLSearchParams): MobileHandoffParams {
  const token = params.get('session_token') || params.get('handoff');
  const sessionIdHint = params.get('session_id') || params.get('session');
  return { token, sessionIdHint, tokenMissing: Boolean(sessionIdHint && !token) };
}

export function buildSessionMobileUrl(origin: string, sessionId: string, token: string): string {
  if (!sessionId.trim()) throw new Error('A shopping session is required to build the mobile handoff URL.');
  if (!token.trim()) throw new Error('A server-issued session handoff token is required to build the mobile QR.');
  const url = new URL('/mobile', origin);
  url.searchParams.set('session', sessionId);
  url.searchParams.set('session_id', sessionId);
  url.searchParams.set('session_token', token);
  return url.toString();
}
