import { ManagerAccount } from '../types/index.js';

const MANAGER_AUTH_KEY = 'grocer_manager_auth';
const DESKTOP_HEARTBEAT_KEY = 'grocer_desktop_system_heartbeat';

export const SEEDED_MANAGERS: ManagerAccount[] = [
  {
    employee_id: 'EMP-1042',
    dob: '1985-06-15',
    name: 'Ishwarya Kota',
    phone: '9618633599',
    presence: 'ACTIVE',
    role: 'STORE_MANAGER',
    branch_id: 'BRANCH-104',
    branch_name: 'Indiranagar Flagship Superstore',
    last_login_at: '2026-10-09T08:00:00Z'
  },
  {
    employee_id: 'EMP-2088',
    dob: '1990-11-20',
    name: 'Vikram Malhotra',
    phone: '9876543210',
    presence: 'ACTIVE',
    role: 'STORE_MANAGER',
    branch_id: 'BRANCH-104',
    branch_name: 'Indiranagar Flagship Superstore',
    last_login_at: '2026-10-08T18:00:00Z'
  }
];

class ManagerService {
  private currentManager: ManagerAccount | null = null;
  private authToken: string | null = null;
  private authExpiresAt: number | null = null;
  private presence: 'ACTIVE' | 'AWAY' | 'IN_TRAFFIC' = 'ACTIVE';
  private lastMemoryHeartbeat: number | null = null;
  private listeners: ((manager: ManagerAccount | null) => void)[] = [];
  private presenceListeners: ((presence: 'ACTIVE' | 'AWAY' | 'IN_TRAFFIC') => void)[] = [];

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem(MANAGER_AUTH_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.token && parsed?.expiresAt && Date.parse(parsed.expiresAt) > Date.now() && parsed.manager?.employee_id) {
            this.authToken = parsed.token;
            this.authExpiresAt = Date.parse(parsed.expiresAt);
            this.currentManager = parsed.manager;
            if (parsed.manager.presence) this.presence = parsed.manager.presence;
          } else {
            localStorage.removeItem(MANAGER_AUTH_KEY);
          }
        }
        const savedPresence = localStorage.getItem('grocer_manager_presence') as any;
        if (savedPresence) {
          this.presence = savedPresence;
        }
      } catch (e) {
        // Safe fallback
      }
    }
  }

  public login(_identifier: string, _dobOrOtp: string): { success: boolean; manager?: ManagerAccount; error?: string } {
    return { success: false, error: 'Manager credentials must be verified by the server.' };
  }

  public async loginWithServer(employeeId: string, dob: string): Promise<{ success: boolean; manager?: ManagerAccount; error?: string }> {
    try {
      const response = await fetch('/api/auth/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim().toUpperCase(), dob: dob.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.token || !result.expiresAt || !result.manager) {
        return { success: false, error: result.error || 'Manager authentication failed.' };
      }
      this.authToken = result.token;
      this.authExpiresAt = Date.parse(result.expiresAt);
      const manager: ManagerAccount = {
        ...result.manager,
        presence: 'ACTIVE',
        last_login_at: new Date().toISOString()
      };
      this.currentManager = manager;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(MANAGER_AUTH_KEY, JSON.stringify({
          manager,
          token: this.authToken,
          expiresAt: result.expiresAt
        }));
      }
      this.notify();
      return { success: true, manager };
    } catch {
      return { success: false, error: 'Manager sign-in could not reach the server.' };
    }
  }

  public getAuthToken(): string | null {
    if (!this.authToken || !this.authExpiresAt || this.authExpiresAt <= Date.now()) return null;
    return this.authToken;
  }

  public loginOnTheGo(_phone?: string): { success: boolean; manager?: ManagerAccount; error?: string } {
    if (!this.currentManager) {
      return { success: false, error: 'Sign in before opening the manager mobile portal.' };
    }

    this.currentManager = {
      ...this.currentManager,
      presence: 'IN_TRAFFIC',
      last_login_at: new Date().toISOString()
    };
    this.presence = 'IN_TRAFFIC';
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(MANAGER_AUTH_KEY, JSON.stringify({
        manager: this.currentManager,
        token: this.authToken,
        expiresAt: this.authExpiresAt ? new Date(this.authExpiresAt).toISOString() : null
      }));
      localStorage.setItem('grocer_manager_presence', 'IN_TRAFFIC');
    }
    this.notify();
    this.notifyPresence();
    return { success: true, manager: this.currentManager };
  }

  public setPresence(newPresence: 'ACTIVE' | 'AWAY' | 'IN_TRAFFIC') {
    this.presence = newPresence;
    if (this.currentManager) {
      this.currentManager.presence = newPresence;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('grocer_manager_presence', newPresence);
      if (this.currentManager) {
        localStorage.setItem(MANAGER_AUTH_KEY, JSON.stringify(this.currentManager));
      }
    }
    this.notifyPresence();
    this.notify();
  }

  public sendDesktopHeartbeat() {
    this.lastMemoryHeartbeat = Date.now();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(DESKTOP_HEARTBEAT_KEY, String(Date.now()));
    }
  }

  public clearDesktopHeartbeat() {
    this.lastMemoryHeartbeat = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(DESKTOP_HEARTBEAT_KEY);
    }
  }

  /**
   * Evaluates if the manager is genuinely online and in front of the physical desktop system.
   * Active status is ONLY true when the desktop website session sends a live heartbeat (<6s).
   */
  public isAvailableAtSystemDesk(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(DESKTOP_HEARTBEAT_KEY);
        if (!raw) return false;
        const ts = parseInt(raw, 10);
        return Date.now() - ts < 6000;
      } catch {
        return false;
      }
    }
    if (this.lastMemoryHeartbeat !== null) {
      return Date.now() - this.lastMemoryHeartbeat < 6000;
    }
    return false;
  }

  /**
   * Returns effective presence:
   * ACTIVE = In front of the desktop system (Website open on PC)
   * IN_TRAFFIC = Remote on Mobile App / Away from PC desk
   */
  public getEffectivePresence(): 'ACTIVE' | 'AWAY' | 'IN_TRAFFIC' {
    if (this.isAvailableAtSystemDesk()) {
      return 'ACTIVE';
    }
    return 'IN_TRAFFIC';
  }

  public getPresence(): 'ACTIVE' | 'AWAY' | 'IN_TRAFFIC' {
    return this.getEffectivePresence();
  }

  public getManagerPhone(): string {
    return this.currentManager?.phone || '9618633599';
  }

  public logout() {
    this.currentManager = null;
    this.presence = 'IN_TRAFFIC';
    this.clearDesktopHeartbeat();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(MANAGER_AUTH_KEY);
      localStorage.removeItem('grocer_manager_presence');
    }
    this.notify();
    this.notifyPresence();
  }

  public getCurrentManager(): ManagerAccount | null {
    return this.currentManager;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentManager && this.getAuthToken());
  }

  public subscribe(listener: (manager: ManagerAccount | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public subscribePresence(listener: (presence: 'ACTIVE' | 'AWAY' | 'IN_TRAFFIC') => void): () => void {
    this.presenceListeners.push(listener);
    listener(this.presence);
    return () => {
      this.presenceListeners = this.presenceListeners.filter(l => l !== listener);
    };
  }

  private notifyPresence() {
    for (const listener of this.presenceListeners) {
      try {
        listener(this.presence);
      } catch (e) {
        console.error('Presence listener error:', e);
      }
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentManager);
      } catch (e) {
        console.error('Manager listener error:', e);
      }
    }
  }
}

export const managerService = new ManagerService();
