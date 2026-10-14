import { RemoteKioskState, RemoteKioskActivationEvent, RemoteKioskStatus } from '../types/index.js';
import { getSupabaseClient } from './supabase.js';
import { managerService } from './managerService.js';

function getBaseApiUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

export class KioskService {
  private fallbackCache: Record<string, RemoteKioskState> = {
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

  /**
   * Deterministically resolves which physical kiosk this browser/terminal represents.
   * Priority:
   * 1. URL search param: ?kiosk_id=KIOSK_03 or ?id=KIOSK_03 or ?kiosk=3
   * 2. Persisted session identity in sessionStorage
   * 3. Defaults to KIOSK_01 (Terminal 1)
   */
  public resolveKioskId(): string {
    if (typeof window === 'undefined') return 'KIOSK_01';

    try {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        const raw = params.get('kiosk_id') || params.get('id') || params.get('kiosk');
        if (raw) {
          const upper = raw.toUpperCase().trim().replace('-', '_');
          let cleanId = 'KIOSK_01';
          if (upper === '3' || upper === 'KIOSK3' || upper === 'KIOSK_3' || upper === 'KIOSK_03') {
            cleanId = 'KIOSK_03';
          } else if (upper === '2' || upper === 'KIOSK2' || upper === 'KIOSK_2' || upper === 'KIOSK_02') {
            cleanId = 'KIOSK_02';
          } else if (upper === '1' || upper === 'KIOSK1' || upper === 'KIOSK_1' || upper === 'KIOSK_01') {
            cleanId = 'KIOSK_01';
          } else {
            cleanId = upper.startsWith('KIOSK') ? upper : `KIOSK_${upper}`;
          }

          sessionStorage.setItem('grocer_kiosk_id', cleanId);
          return cleanId;
        }
      }

      const stored = sessionStorage.getItem('grocer_kiosk_id');
      if (stored) {
        return stored;
      }
    } catch (e) {
      console.warn('[KioskService] Error resolving kiosk ID:', e);
    }

    return 'KIOSK_01';
  }

  /**
   * Fetch current shared kiosk state from backend API
   */
  public async getKiosks(): Promise<Record<string, RemoteKioskState>> {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/kiosks`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.kiosks) {
          this.fallbackCache = data.kiosks;
          return data.kiosks;
        }
      }
    } catch (err) {
      console.warn('[KioskService] Failed to fetch /api/kiosks, using in-memory state:', err);
    }
    return this.fallbackCache;
  }

  /**
   * Fetch status for a single physical kiosk
   */
  public async getKioskState(kioskId: string): Promise<RemoteKioskState> {
    const cleanId = kioskId.toUpperCase().replace('-', '_');
    const all = await this.getKiosks();
    if (all[cleanId]) return all[cleanId];

    return (
      this.fallbackCache[cleanId] || {
        id: cleanId,
        name: `Verification Kiosk ${cleanId.replace('KIOSK_', '')}`,
        status: cleanId === 'KIOSK_03' ? 'STANDBY' : 'ACTIVE',
        lastUpdated: new Date().toISOString()
      }
    );
  }

  /**
   * Manager Spoken Authorization: Send OPEN_VERIFICATION_KIOSK command to backend
   */
  public async activateKiosk(params: {
    kioskId?: string;
    requestedBy?: string;
    commandSource?: string;
    message?: string;
  } = {}): Promise<{ success: boolean; activationEvent?: RemoteKioskActivationEvent; error?: string }> {
    const targetKioskId = (params.kioskId || 'KIOSK_03').toUpperCase().replace('-', '_');
    const payload = {
      action: 'OPEN_VERIFICATION_KIOSK',
      kioskId: targetKioskId,
      requestedBy: params.requestedBy || 'manager',
      commandSource: params.commandSource || 'JARVIS',
      message: params.message || 'Kiosk 3 is active. You can use it.',
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Dispatch to shared backend endpoint
      const res = await fetch(`${getBaseApiUrl()}/api/kiosks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(managerService.getAuthToken() ? { Authorization: `Bearer ${managerService.getAuthToken()}` } : {}) },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        // Update local cache
        if (data.kiosks) {
          this.fallbackCache = data.kiosks;
        }
        return {
          success: true,
          activationEvent: data.activationEvent
        };
      }
      return { success: false, error: `Kiosk command rejected (${res.status}). Sign in as a manager and try again.` };
    } catch (err: any) {
      console.warn('[KioskService] API call failed:', err);
      return { success: false, error: err?.message || 'Kiosk command could not be verified by the server.' };
    }
  }

  /**
   * Reset Kiosk 3 back to STANDBY (for fresh demo run)
   */
  public async resetKiosks(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/kiosks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(managerService.getAuthToken() ? { Authorization: `Bearer ${managerService.getAuthToken()}` } : {}) },
        body: JSON.stringify({ action: 'RESET_KIOSKS' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.kiosks) this.fallbackCache = data.kiosks;
        return { success: true };
      }
      return { success: false, error: `Kiosk reset rejected (${res.status}). Sign in as a manager and try again.` };
    } catch (err) {
      console.warn('[KioskService] Reset API error:', err);
      return { success: false, error: 'Kiosk reset could not be verified by the server.' };
    }
  }

  /**
   * Realtime Subscription for Kiosks:
   * Combines Supabase Realtime Broadcast (sub-millisecond) with fast HTTP polling (1000ms fallback).
   * Ensures physical Computer 3 receives the command across LAN or cloud deployment without refresh!
   */
  public subscribeKiosk(
    kioskId: string,
    callback: (state: RemoteKioskState, isInitial: boolean) => void
  ): () => void {
    const cleanId = kioskId.toUpperCase().replace('-', '_');
    let isSubscribed = true;
    let lastKnownStatus: RemoteKioskStatus = 'STANDBY';
    let lastEventTime = '';

    // 1. Initial State Fetch
    this.getKioskState(cleanId).then(initialState => {
      if (!isSubscribed) return;
      lastKnownStatus = initialState.status;
      lastEventTime = initialState.activationEvent?.timestamp || '';
      callback(initialState, true);
    });

    // 2. Supabase Realtime Broadcast Channel Listener
    let channel: any = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        channel = supabase
          .channel(`kiosk_events_${cleanId}_${Date.now()}`)
          .on('broadcast', { event: 'OPEN_VERIFICATION_KIOSK' }, (payload: any) => {
            if (!isSubscribed) return;
            const eventPayload = payload?.payload;
            if (eventPayload && (eventPayload.kioskId === cleanId || !eventPayload.kioskId)) {
              const updatedState: RemoteKioskState = {
                id: cleanId,
                name: `Verification Kiosk ${cleanId.replace('KIOSK_', '')}`,
                status: 'ACTIVE',
                lastUpdated: eventPayload.timestamp || new Date().toISOString(),
                activationEvent: eventPayload
              };
              lastKnownStatus = 'ACTIVE';
              lastEventTime = eventPayload.timestamp || '';
              callback(updatedState, false);
            }
          })
          .on('broadcast', { event: 'RESET_KIOSKS' }, () => {
            if (!isSubscribed) return;
            const resetState: RemoteKioskState = {
              id: cleanId,
              name: `Verification Kiosk ${cleanId.replace('KIOSK_', '')}`,
              status: cleanId === 'KIOSK_03' ? 'STANDBY' : 'ACTIVE',
              lastUpdated: new Date().toISOString(),
              activationEvent: null
            };
            lastKnownStatus = resetState.status;
            callback(resetState, false);
          })
          .subscribe();
      }
    } catch (e) {
      console.warn('[KioskService] Supabase realtime subscribe error:', e);
    }

    // 3. Ultra-Reliable 1000ms Polling Loop (Rock-solid across LAN, Wi-Fi, and firewalls)
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) return;

      try {
        const res = await fetch(`${getBaseApiUrl()}/api/kiosks`);
        if (res.ok) {
          const data = await res.json();
          const targetKiosk = data?.kiosks?.[cleanId];
          if (targetKiosk) {
            const hasStatusChanged = targetKiosk.status !== lastKnownStatus;
            const hasNewActivationEvent =
              targetKiosk.activationEvent &&
              targetKiosk.activationEvent.timestamp !== lastEventTime;

            if (hasStatusChanged || hasNewActivationEvent) {
              lastKnownStatus = targetKiosk.status;
              lastEventTime = targetKiosk.activationEvent?.timestamp || '';
              callback(targetKiosk, false);
            }
          }
        }
      } catch (err) {
        // Silent poll error; will retry next second
      }
    }, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (e) {}
      }
    };
  }
}

export const kioskService = new KioskService();
