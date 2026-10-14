import { getRequestBody, handleCors, sendJson } from '../_utils.js';
import { getSupabaseClient } from '../../src/services/supabase.js';

export interface RemoteKioskRecord {
  id: string;
  name: string;
  status: 'ACTIVE' | 'STANDBY' | 'ACTIVATING';
  lastUpdated: string;
  activationEvent?: {
    kioskId: string;
    status: 'ACTIVE';
    requestedBy: string;
    commandSource: string;
    timestamp: string;
    message: string;
  } | null;
}

// In-memory shared state for multi-terminal synchronization
let kiosksState: Record<string, RemoteKioskRecord> = {
  KIOSK_01: {
    id: 'KIOSK_01',
    name: 'Verification Kiosk 01',
    status: 'ACTIVE',
    lastUpdated: new Date().toISOString()
  },
  KIOSK_02: {
    id: 'KIOSK_02',
    name: 'Verification Kiosk 02',
    status: 'ACTIVE',
    lastUpdated: new Date().toISOString()
  },
  KIOSK_03: {
    id: 'KIOSK_03',
    name: 'Verification Kiosk 03',
    status: 'STANDBY',
    lastUpdated: new Date().toISOString(),
    activationEvent: null
  }
};

let lastCommandRecord: any = null;

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  const method = (req.method || 'GET').toUpperCase();

  // GET: Fetch real-time status of all kiosks
  if (method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      kiosks: kiosksState,
      lastCommand: lastCommandRecord,
      serverTime: new Date().toISOString()
    });
  }

  // POST: Execute shared store kiosk commands
  if (method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const action = body.action || (req.url && req.url.includes('/activate') ? 'OPEN_VERIFICATION_KIOSK' : req.url && req.url.includes('/reset') ? 'RESET_KIOSKS' : '');
      const rawKioskId = body.kioskId || 'KIOSK_03';
      const cleanKioskId = rawKioskId.toUpperCase().replace('-', '_');

      // 1. OPEN_VERIFICATION_KIOSK action
      if (action === 'OPEN_VERIFICATION_KIOSK' || action === 'activate') {
        const timestamp = body.timestamp || new Date().toISOString();
        const requestedBy = body.requestedBy || 'manager';
        const commandSource = body.commandSource || 'JARVIS';
        const message = body.message || 'Kiosk 3 is active. You can use it.';

        const activationEvent = {
          kioskId: cleanKioskId,
          status: 'ACTIVE' as const,
          requestedBy,
          commandSource,
          timestamp,
          message
        };

        if (kiosksState[cleanKioskId]) {
          kiosksState[cleanKioskId].status = 'ACTIVE';
          kiosksState[cleanKioskId].lastUpdated = timestamp;
          kiosksState[cleanKioskId].activationEvent = activationEvent;
        } else {
          kiosksState[cleanKioskId] = {
            id: cleanKioskId,
            name: `Verification Kiosk ${cleanKioskId.replace('KIOSK_', '')}`,
            status: 'ACTIVE',
            lastUpdated: timestamp,
            activationEvent
          };
        }

        lastCommandRecord = {
          type: 'OPEN_VERIFICATION_KIOSK',
          payload: activationEvent,
          executedAt: timestamp
        };

        // Broadcast via Supabase Realtime if configured
        try {
          const supabase = getSupabaseClient();
          if (supabase) {
            supabase.channel('kiosk_events').send({
              type: 'broadcast',
              event: 'OPEN_VERIFICATION_KIOSK',
              payload: activationEvent
            }).catch(() => {});
          }
        } catch (sbErr) {
          // Non-blocking: polling fallback provides 100% guarantee
        }

        return sendJson(res, 200, {
          success: true,
          command: 'OPEN_VERIFICATION_KIOSK',
          kiosk: kiosksState[cleanKioskId],
          activationEvent,
          kiosks: kiosksState
        });
      }

      // 2. RESET_KIOSKS action (Demo reset)
      if (action === 'RESET_KIOSKS' || action === 'reset') {
        const now = new Date().toISOString();
        kiosksState = {
          KIOSK_01: {
            id: 'KIOSK_01',
            name: 'Verification Kiosk 01',
            status: 'ACTIVE',
            lastUpdated: now
          },
          KIOSK_02: {
            id: 'KIOSK_02',
            name: 'Verification Kiosk 02',
            status: 'ACTIVE',
            lastUpdated: now
          },
          KIOSK_03: {
            id: 'KIOSK_03',
            name: 'Verification Kiosk 03',
            status: 'STANDBY',
            lastUpdated: now,
            activationEvent: null
          }
        };

        lastCommandRecord = {
          type: 'RESET_KIOSKS',
          executedAt: now
        };

        try {
          const supabase = getSupabaseClient();
          if (supabase) {
            supabase.channel('kiosk_events').send({
              type: 'broadcast',
              event: 'RESET_KIOSKS',
              payload: { timestamp: now }
            }).catch(() => {});
          }
        } catch (sbErr) {}

        return sendJson(res, 200, {
          success: true,
          command: 'RESET_KIOSKS',
          kiosks: kiosksState
        });
      }

      return sendJson(res, 400, {
        success: false,
        error: `Unknown kiosk action: "${action}". Supported actions: OPEN_VERIFICATION_KIOSK, RESET_KIOSKS`
      });
    } catch (err: any) {
      return sendJson(res, 500, {
        success: false,
        error: err?.message || 'Server error processing kiosk command'
      });
    }
  }

  return sendJson(res, 405, { error: 'Method Not Allowed' });
}
