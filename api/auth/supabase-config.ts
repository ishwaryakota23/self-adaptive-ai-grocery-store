/**
 * API Route: /api/auth/supabase-config
 * 
 * Safely serves public Supabase URL and Publishable Key for frontend initialization.
 * NEVER leaks SUPABASE_SECRET_KEY.
 */

declare const process: any;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const publishableKey = (env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({
    configured: Boolean(url && publishableKey),
    url,
    publishableKey
  }));
}
