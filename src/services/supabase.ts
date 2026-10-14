/**
 * GrocerAI — Browser / Client Supabase Client
 * 
 * Uses ONLY public / publishable credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY).
 * Never uses or exposes SUPABASE_SECRET_KEY.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare const process: any;

let _client: SupabaseClient | null = null;

export function getPublicSupabaseCredentials(): { url: string; anonKey: string } {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  const procEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};

  const url = metaEnv.VITE_SUPABASE_URL || metaEnv.SUPABASE_URL || procEnv.VITE_SUPABASE_URL || procEnv.SUPABASE_URL || '';
  const anonKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.SUPABASE_PUBLISHABLE_KEY || procEnv.VITE_SUPABASE_ANON_KEY || procEnv.SUPABASE_PUBLISHABLE_KEY || procEnv.SUPABASE_ANON_KEY || '';

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const { url, anonKey } = getPublicSupabaseCredentials();
  if (url && anonKey && url.startsWith('http')) {
    try {
      _client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return _client;
    } catch (e) {
      console.warn('[SupabaseClient] Failed to initialize client:', e);
      return null;
    }
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getPublicSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = url && anonKey ? { url, anonKey } : getPublicSupabaseCredentials();
    if (!creds.url || !creds.anonKey) {
      return { success: false, error: 'Missing Supabase URL or Anon Key' };
    }
    const testClient = createClient(creds.url, creds.anonKey);
    const { error } = await testClient.from('products').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return { success: true };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export const getSupabaseCredentials = getPublicSupabaseCredentials;

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  // In production architecture, credentials are loaded via environment variables (.env).
  // For interactive diagnostic testing in the UI, we update the in-memory client.
  if (url && anonKey) {
    try {
      _client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (e) {
      console.warn('[SupabaseClient] Failed to re-initialize client:', e);
    }
  } else {
    _client = null;
  }
}
