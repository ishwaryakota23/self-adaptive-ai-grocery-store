import { ManagerAccount } from '../types';

const MANAGER_AUTH_KEY = 'grocer_manager_auth';

export const SEEDED_MANAGERS: ManagerAccount[] = [
  {
    employee_id: 'EMP-1042',
    dob: '1985-06-15',
    name: 'Vikram Malhotra',
    role: 'STORE_MANAGER',
    branch_id: 'BRANCH-104',
    branch_name: 'Indiranagar Flagship Superstore',
    last_login_at: '2026-09-28T18:00:00Z'
  },
  {
    employee_id: 'EMP-2088',
    dob: '1990-11-20',
    name: 'Priya Sharma',
    role: 'STORE_MANAGER',
    branch_id: 'BRANCH-104',
    branch_name: 'Indiranagar Flagship Superstore',
    last_login_at: '2026-09-27T09:30:00Z'
  }
];

class ManagerService {
  private currentManager: ManagerAccount | null = null;
  private listeners: ((manager: ManagerAccount | null) => void)[] = [];

  constructor() {
    this.loadAuth();
  }

  private loadAuth() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(MANAGER_AUTH_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const found = SEEDED_MANAGERS.find(m => m.employee_id === parsed.employee_id);
          if (found) {
            this.currentManager = found;
          }
        }
      } catch (e) {
        console.warn('Failed to parse manager auth', e);
      }
    }
  }

  public login(employeeId: string, dob: string): { success: boolean; manager?: ManagerAccount; error?: string } {
    const cleanId = employeeId.trim().toUpperCase();
    const cleanDob = dob.trim();

    const matched = SEEDED_MANAGERS.find(
      m => m.employee_id.toUpperCase() === cleanId && m.dob === cleanDob
    );

    if (matched) {
      this.currentManager = {
        ...matched,
        last_login_at: new Date().toISOString()
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(MANAGER_AUTH_KEY, JSON.stringify(this.currentManager));
      }
      this.notify();
      return { success: true, manager: this.currentManager };
    }

    return {
      success: false,
      error: 'Invalid Employee ID or Date of Birth. Please check your credentials.'
    };
  }

  public logout() {
    this.currentManager = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MANAGER_AUTH_KEY);
    }
    this.notify();
  }

  public getCurrentManager(): ManagerAccount | null {
    return this.currentManager;
  }

  public isAuthenticated(): boolean {
    return this.currentManager !== null;
  }

  public subscribe(listener: (manager: ManagerAccount | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
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
