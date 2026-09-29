/**
 * Utility helpers for Vercel Serverless Functions and local Vite dev server.
 */

export async function getRequestBody(req: any): Promise<any> {
  // If body is already parsed by Vercel or middleware
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
    return req.body;
  }

  // Otherwise read stream asynchronously (e.g. Vite raw Connect middleware)
  return new Promise((resolve) => {
    let raw = '';
    if (typeof req.on !== 'function') {
      return resolve({});
    }
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function sendJson(res: any, statusCode: number, data: any) {
  // Vercel Serverless environment
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  // Standard Node.js / Connect response (Vite dev server)
  res.statusCode = statusCode;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
  if (typeof res.end === 'function') {
    res.end(JSON.stringify(data));
  }
}

export function handleCors(req: any, res: any): boolean {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      res.status(200).end();
    } else {
      res.statusCode = 200;
      if (typeof res.end === 'function') res.end();
    }
    return true;
  }
  return false;
}
