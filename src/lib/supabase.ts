import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

/**
 * Demo Mode is the default: synthetic data in localStorage.
 * Fill VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to use the database.
 * Never place a service_role key in a VITE_* variable.
 */
export const isSupabaseConfigured = url.length > 0 && publishableKey.length > 0

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return supabase
}

export type DataMode = 'demo' | 'supabase'

export function dataMode(): DataMode {
  return isSupabaseConfigured ? 'supabase' : 'demo'
}
