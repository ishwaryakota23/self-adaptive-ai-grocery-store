import os from 'os';
import { handleCors, sendJson } from './_utils.js';
import { resolveNetworkMobileOrigin } from '../src/server/sessionHandoffOrigin.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const interfaces = os.networkInterfaces();
    let detectedIp = 'localhost';

    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal && (net.address.startsWith('10.') || net.address.startsWith('192.168.') || net.address.startsWith('172.'))) {
          detectedIp = net.address;
          break;
        }
      }
      if (detectedIp !== 'localhost') break;
    }

    const hostPort = req?.headers?.host?.match(/:(\d+)$/)?.[1];
    const port = hostPort || process.env.PORT || 3000;
    const mobileUrlBase = resolveNetworkMobileOrigin({ lanIp: detectedIp, port });
    return sendJson(res, 200, {
      success: true,
      lanIp: detectedIp,
      port: Number(port),
      mobileUrlBase
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      lanIp: 'localhost',
      port: Number(req?.headers?.host?.match(/:(\d+)$/)?.[1] || process.env.PORT || 3000),
      mobileUrlBase: `http://localhost:${req?.headers?.host?.match(/:(\d+)$/)?.[1] || process.env.PORT || 3000}`,
      error: err?.message || 'Failed to detect LAN IP'
    });
  }
}
