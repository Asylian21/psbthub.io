/**
 * Legacy compatibility exports.
 *
 * Keeps a stable import surface while the canonical implementation
 * lives in `infra/supabaseClient.ts`.
 */
import { getSupabaseClient } from '../infra/supabaseClient'

export const supabase = getSupabaseClient()
export { getSupabaseClient, isSupabaseConfigured } from '../infra/supabaseClient'
