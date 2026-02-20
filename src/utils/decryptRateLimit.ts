/**
 * Browser-side per-share cooldown enforcement for password decryption attempts.
 *
 * Enforces a fixed cooldown between consecutive decrypt attempts to slow
 * brute-force guessing. Uses localStorage as backing store.
 * Does not replace server-side controls.
 */
import { getBrowserStorage } from './shareCreationRateLimit'
import type { BrowserStorageLike } from './shareCreationRateLimit'

export { getBrowserStorage }
export type { BrowserStorageLike }

export const DECRYPT_COOLDOWN_MS = 5_000

const STORAGE_KEY_PREFIX = 'psbthub:decrypt-attempt:'

export interface DecryptRateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

function buildStorageKey(shareId: string): string {
  return `${STORAGE_KEY_PREFIX}${shareId}`
}

export function checkDecryptRateLimit(
  shareId: string,
  storage: BrowserStorageLike,
  now: number = Date.now(),
): DecryptRateLimitResult {
  const raw = storage.getItem(buildStorageKey(shareId))

  if (!raw) {
    return { allowed: true, retryAfterMs: 0 }
  }

  const lastAttempt = Number(raw)

  if (!Number.isFinite(lastAttempt) || lastAttempt <= 0) {
    return { allowed: true, retryAfterMs: 0 }
  }

  const elapsed = now - lastAttempt

  if (elapsed >= DECRYPT_COOLDOWN_MS) {
    return { allowed: true, retryAfterMs: 0 }
  }

  return { allowed: false, retryAfterMs: DECRYPT_COOLDOWN_MS - elapsed }
}

export function recordDecryptAttempt(
  shareId: string,
  storage: BrowserStorageLike,
  now: number = Date.now(),
): void {
  storage.setItem(buildStorageKey(shareId), String(now))
}
