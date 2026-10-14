export interface ApplicationOriginOptions {
  env?: Record<string, string | undefined>;
  clientOrigin?: string;
  requestHost?: string;
  requestProtocol?: string;
  lanIp?: string;
}

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/** Resolve a QR origin without embedding a machine-specific address in code. */
export function resolveApplicationOrigin(options: ApplicationOriginOptions = {}): string {
  const env = options.env || (typeof process !== 'undefined' ? process.env || {} : {});
  const configured = (env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL || env.PUBLIC_URL || env.VITE_APP_URL || '').trim();
  const vercelHost = (env.VERCEL_URL || '').trim();
  const production = env.NODE_ENV === 'production';
  let candidate = configured || (vercelHost ? `https://${vercelHost}` : '');

  if (!candidate && options.clientOrigin) {
    try {
      const client = new URL(options.clientOrigin);
      if (!isLocalHost(client.hostname)) candidate = client.origin;
    } catch { /* untrusted client origin is ignored */ }
  }
  if (!candidate && options.requestHost) {
    const host = options.requestHost.split(':')[0].replace(/^\[|\]$/g, '');
    if (!isLocalHost(host)) candidate = `${options.requestProtocol || 'http'}://${options.requestHost}`;
  }
  if (!candidate && !production) {
    const port = options.requestHost?.split(':').at(-1) || env.PORT || '3000';
    candidate = options.lanIp && options.lanIp !== 'localhost'
      ? `http://${options.lanIp}:${port}`
      : `http://localhost:${port}`;
  }
  if (!candidate) throw new Error('APP_BASE_URL is required for production QR generation.');

  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error('APP_BASE_URL must be an absolute application URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('APP_BASE_URL must be an HTTP(S) origin without credentials, query, or fragment.');
  }
  if (production && url.protocol !== 'https:') throw new Error('Production APP_BASE_URL must use HTTPS.');
  if (production && !configured && !vercelHost) throw new Error('Configure APP_BASE_URL or VERCEL_URL before generating session QR codes.');
  return url.origin;
}

export function resolveNetworkMobileOrigin(options: { env?: Record<string, string | undefined>; lanIp: string; port?: number | string }): string {
  const env = options.env || (typeof process !== 'undefined' ? process.env || {} : {});
  const configured = (env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL || env.PUBLIC_URL || env.VITE_APP_URL || '').trim();
  if (configured) return resolveApplicationOrigin({ env, lanIp: options.lanIp });
  const port = options.port || env.PORT || 3000;
  return options.lanIp && options.lanIp !== 'localhost'
    ? `http://${options.lanIp}:${port}`
    : `http://localhost:${port}`;
}
