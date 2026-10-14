/**
 * GrocerAI — Server-Authoritative Supabase Admin Client
 * 
 * Privileged, server-only database operations using SUPABASE_SECRET_KEY.
 * NEVER import this file into browser/client components.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare const process: any;

let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdminConfig(): { url: string; secretKey: string } {
  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url: url.trim(), secretKey: secretKey.trim() };
}

export function isSupabaseAdminConfigured(): boolean {
  const { url, secretKey } = getSupabaseAdminConfig();
  return Boolean(url && secretKey && url.startsWith('http'));
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (_adminClient) return _adminClient;

  const { url, secretKey } = getSupabaseAdminConfig();
  if (url && secretKey && url.startsWith('http')) {
    try {
      _adminClient = createClient(url, secretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      return _adminClient;
    } catch (err) {
      console.error('[SupabaseAdmin] Failed to initialize admin client:', err);
      return null;
    }
  }
  return null;
}

/**
 * Resets cached client (useful during testing or runtime config reload)
 */
export function resetSupabaseAdminClient(): void {
  _adminClient = null;
}

/**
 * Validates connection to the real Supabase project
 */
export async function testSupabaseAdminConnection(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { success: false, error: 'Supabase admin client is not configured (missing SUPABASE_URL or SUPABASE_SECRET_KEY)' };
  }

  try {
    const { error } = await client.from('products').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return { success: true }; // connected to database even if tables need migration
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error connecting to Supabase' };
  }
}
