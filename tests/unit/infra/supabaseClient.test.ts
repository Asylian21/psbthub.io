/**
 * Unit coverage for Supabase client configuration detection.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('supabaseClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null client when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.resetModules()

    const supabaseClient = await import('../../../src/infra/supabaseClient')

    expect(supabaseClient.getSupabaseClient()).toBeNull()
    expect(supabaseClient.isSupabaseConfigured()).toBe(false)
  })

  it('creates a client when env vars are set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project-ref.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_mock_key')
    vi.resetModules()

    const supabaseClient = await import('../../../src/infra/supabaseClient')

    expect(supabaseClient.getSupabaseClient()).not.toBeNull()
    expect(supabaseClient.isSupabaseConfigured()).toBe(true)
  })
})
