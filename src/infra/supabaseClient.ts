/**
 * Lazy-safe Supabase client accessor.
 *
 * Returns `null` when required environment variables are missing so upper layers
 * can gracefully map configuration errors into typed UI states.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const client: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null

/**
 * Returns the singleton Supabase client instance or `null` when unconfigured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return client
}

/**
 * Indicates whether Supabase credentials are present at runtime.
 */
export function isSupabaseConfigured(): boolean {
  return client !== null
}
