/**
 * Browser-side soft rate limiting for share creation attempts.
 *
 * This is a best-effort anti-abuse layer to reduce accidental or scripted
 * bursts from a single browser profile. It does not replace server controls.
 */
export interface BrowserStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ShareCreationRateLimitOptions {
  windowMs?: number
  maxAttempts?: number
  storageKey?: string
}

export interface ShareCreationRateLimitState {
  allowed: boolean
  retryAfterMs: number
  attemptsInWindow: number
  maxAttempts: number
}

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_ATTEMPTS = 6
const DEFAULT_STORAGE_KEY = 'psbthub:share-creation-attempts'

function resolveOptions(
  options?: ShareCreationRateLimitOptions,
): Required<ShareCreationRateLimitOptions> {
  return {
    windowMs: options?.windowMs ?? DEFAULT_WINDOW_MS,
    maxAttempts: options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    storageKey: options?.storageKey ?? DEFAULT_STORAGE_KEY,
  }
}

function sanitizeStoredTimestamps(
  rawValue: string | null,
  now: number,
  windowMs: number,
): number[] {
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((value): value is number => {
        return (
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value > 0 &&
          value <= now &&
          now - value <= windowMs
        )
      })
      .sort((left, right) => left - right)
  } catch {
    return []
  }
}

function writeTimestamps(
  storage: BrowserStorageLike,
  storageKey: string,
  timestamps: number[],
): void {
  storage.setItem(storageKey, JSON.stringify(timestamps))
}

function readRecentTimestamps(
  storage: BrowserStorageLike,
  storageKey: string,
  now: number,
  windowMs: number,
): number[] {
  const sanitized = sanitizeStoredTimestamps(storage.getItem(storageKey), now, windowMs)
  writeTimestamps(storage, storageKey, sanitized)
  return sanitized
}

export function readShareCreationRateLimitState(
  storage: BrowserStorageLike,
  now: number = Date.now(),
  options?: ShareCreationRateLimitOptions,
): ShareCreationRateLimitState {
  const resolvedOptions = resolveOptions(options)
  const recentTimestamps = readRecentTimestamps(
    storage,
    resolvedOptions.storageKey,
    now,
    resolvedOptions.windowMs,
  )
  const attemptsInWindow = recentTimestamps.length
  const isAllowed = attemptsInWindow < resolvedOptions.maxAttempts

  if (isAllowed) {
    return {
      allowed: true,
      retryAfterMs: 0,
      attemptsInWindow,
      maxAttempts: resolvedOptions.maxAttempts,
    }
  }

  const oldestAttempt = recentTimestamps[0] ?? now
  const retryAfterMs = Math.max(resolvedOptions.windowMs - (now - oldestAttempt), 1)

  return {
    allowed: false,
    retryAfterMs,
    attemptsInWindow,
    maxAttempts: resolvedOptions.maxAttempts,
  }
}

export function recordShareCreationAttempt(
  storage: BrowserStorageLike,
  now: number = Date.now(),
  options?: ShareCreationRateLimitOptions,
): void {
  const resolvedOptions = resolveOptions(options)
  const recentTimestamps = readRecentTimestamps(
    storage,
    resolvedOptions.storageKey,
    now,
    resolvedOptions.windowMs,
  )
  const nextTimestamps = [...recentTimestamps, now]
  writeTimestamps(storage, resolvedOptions.storageKey, nextTimestamps)
}

export function getBrowserStorage(): BrowserStorageLike | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}
