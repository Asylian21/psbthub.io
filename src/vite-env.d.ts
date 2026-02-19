/**
 * Vite environment typing for required PSBTHub runtime variables.
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_OBSERVABILITY_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
