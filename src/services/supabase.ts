import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'grocer_supabase_url';
const SUPABASE_ANON_KEY = 'grocer_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const url = localStorage.getItem(SUPABASE_URL_KEY) || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const anonKey = localStorage.getItem(SUPABASE_ANON_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
  _client = null; // reset client to reinitialize
}

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const { url, anonKey } = getSupabaseCredentials();
  if (url && anonKey && url.startsWith('http')) {
    try {
      _client = createClient(url, anonKey);
      return _client;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const testClient = createClient(url, anonKey);
    const { error } = await testClient.from('products').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, connection is still valid
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
