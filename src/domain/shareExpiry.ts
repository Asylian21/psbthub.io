/**
 * Share expiry domain module.
 *
 * Defines retention window rules and resolves user-selected expiration dates
 * into canonical server-ready UTC timestamps.
 */
const MILLISECONDS_IN_SECOND = 1000
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000

export const MAX_SHARE_EXPIRY_DAYS = 31
export const MIN_SHARE_EXPIRY_BUFFER_SECONDS = 30

export type ShareExpiryErrorCode =
  | 'INVALID_EXPIRY'
  | 'EXPIRY_TOO_SOON'
  | 'EXPIRY_TOO_LATE'

export interface ShareExpiryError {
  kind: 'share_expiry_error'
  code: ShareExpiryErrorCode
  message: string
}

export type ShareExpiryResult<T> =
  | {
    ok: true
    value: T
  }
  | {
    ok: false
    error: ShareExpiryError
  }

export interface ShareExpiryBounds {
  minDate: Date
  maxDate: Date
}

export interface ResolvedShareExpiry {
  expiresAtDate: Date
  expiresAtIso: string
  bounds: ShareExpiryBounds
}

function createShareExpiryError(
  code: ShareExpiryErrorCode,
  message: string,
): ShareExpiryResult<never> {
  return {
    ok: false,
    error: {
      kind: 'share_expiry_error',
      code,
      message,
    },
  }
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function cloneDate(source: Date): Date {
  return new Date(source.getTime())
}

export function createShareExpiryBounds(referenceDate: Date = new Date()): ShareExpiryBounds {
  const safeReferenceDate = isValidDate(referenceDate) ? referenceDate : new Date()

  return {
    minDate: new Date(
      safeReferenceDate.getTime() + MIN_SHARE_EXPIRY_BUFFER_SECONDS * MILLISECONDS_IN_SECOND,
    ),
    maxDate: new Date(safeReferenceDate.getTime() + MAX_SHARE_EXPIRY_DAYS * MILLISECONDS_IN_DAY),
  }
}

/**
 * Default expiry is the maximum allowed retention window.
 */
export function createDefaultShareExpiryDate(referenceDate: Date = new Date()): Date {
  const bounds = createShareExpiryBounds(referenceDate)
  return cloneDate(bounds.maxDate)
}

/**
 * Validates and resolves an expiry date against policy bounds.
 */
export function resolveShareExpiry(
  candidateDate: Date | null,
  referenceDate: Date = new Date(),
): ShareExpiryResult<ResolvedShareExpiry> {
  if (!candidateDate || !isValidDate(candidateDate)) {
    return createShareExpiryError(
      'INVALID_EXPIRY',
      'Please select a valid expiration date and time.',
    )
  }

  const bounds = createShareExpiryBounds(referenceDate)
  const candidateTimestamp = candidateDate.getTime()

  if (candidateTimestamp < bounds.minDate.getTime()) {
    return createShareExpiryError(
      'EXPIRY_TOO_SOON',
      `Expiration must be at least ${MIN_SHARE_EXPIRY_BUFFER_SECONDS} seconds in the future.`,
    )
  }

  if (candidateTimestamp > bounds.maxDate.getTime()) {
    return createShareExpiryError(
      'EXPIRY_TOO_LATE',
      `Expiration cannot be more than ${MAX_SHARE_EXPIRY_DAYS} days from now.`,
    )
  }

  return {
    ok: true,
    value: {
      expiresAtDate: cloneDate(candidateDate),
      expiresAtIso: candidateDate.toISOString(),
      bounds,
    },
  }
}
