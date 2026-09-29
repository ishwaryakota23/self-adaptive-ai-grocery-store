import { CustomerSession } from '../types/index.js';

const WINDOW_SESSION_KEY = 'grocer_window_session_id';
const GLOBAL_COUNTER_KEY = 'grocer_session_counter';

class SessionService {
  private activeSessionId: string;
  private listeners: ((session: CustomerSession) => void)[] = [];

  constructor() {
    this.activeSessionId = this.initSessionId();
  }

  /**
   * Initializes session strictly scoped to THIS window/tab.
   * Priority:
   * 1. URL search parameter (?session=USER00002) - binds this window to the specified customer.
   * 2. Window-specific sessionStorage - retains session across page reloads in this tab.
   * 3. Default to USER00001 (Kiosk default customer session).
   *
   * Crucially: A session in one window NEVER overwrites or changes the session in another window.
   */
  private initSessionId(): string {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionParam = urlParams.get('session');
        if (sessionParam && sessionParam.startsWith('USER')) {
          sessionStorage.setItem(WINDOW_SESSION_KEY, sessionParam);
          return sessionParam;
        }

        const savedWindowSession = sessionStorage.getItem(WINDOW_SESSION_KEY);
        if (savedWindowSession && savedWindowSession.startsWith('USER')) {
          return savedWindowSession;
        }
      } catch (e) {
        console.warn('Failed to access sessionStorage:', e);
      }
    }

    const defaultId = 'USER00001';
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(WINDOW_SESSION_KEY, defaultId);
      } catch (e) {
        // Ignore in restricted environments
      }
    }
    return defaultId;
  }

  public getActiveSessionId(): string {
    return this.activeSessionId;
  }

  /**
   * Sets the active session for THIS window/tab only.
   */
  public setActiveSession(sessionId: string) {
    this.activeSessionId = sessionId;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(WINDOW_SESSION_KEY, sessionId);
        window.dispatchEvent(new Event('grocer_session_changed'));
      } catch (e) {
        console.warn('Failed to save session to sessionStorage:', e);
      }
    }
    this.notify();
  }

  /**
   * Creates a new unique customer session identifier (e.g. USER00002, USER00003).
   * Persists the global counter so IDs never collide.
   */
  public createNewSession(deviceType: 'LARGE_DISPLAY' | 'MOBILE' | 'SYNCED' = 'LARGE_DISPLAY'): CustomerSession {
    let currentCounter = 1;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(GLOBAL_COUNTER_KEY);
        if (stored) {
          currentCounter = Math.max(parseInt(stored, 10), 1) + 1;
        } else {
          currentCounter = 2; // USER00001 already seeded
        }
        localStorage.setItem(GLOBAL_COUNTER_KEY, currentCounter.toString());
      } catch (e) {
        currentCounter = Date.now() % 90000 + 10000;
      }
    }

    const padded = currentCounter.toString().padStart(5, '0');
    const newSessionId = `USER${padded}`;
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newSession: CustomerSession = {
      id: newSessionId,
      token,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      status: 'active',
      device_type: deviceType
    };

    this.setActiveSession(newSessionId);
    return newSession;
  }

  public getCompanionUrl(sessionId = this.activeSessionId): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/mobile?session=${sessionId}`;
  }

  public subscribe(listener: (session: CustomerSession) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const session: CustomerSession = {
      id: this.activeSessionId,
      token: `tok_${this.activeSessionId}`,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      status: 'active',
      device_type: 'SYNCED'
    };
    for (const listener of this.listeners) {
      try {
        listener(session);
      } catch (e) {
        console.error('Session listener error:', e);
      }
    }
  }
}

export const sessionService = new SessionService();
