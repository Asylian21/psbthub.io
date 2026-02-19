/**
 * Unit coverage for share expiry window policies.
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_SHARE_EXPIRY_DAYS,
  MIN_SHARE_EXPIRY_BUFFER_SECONDS,
  createDefaultShareExpiryDate,
  createShareExpiryBounds,
  resolveShareExpiry,
} from '../../../src/domain/shareExpiry'

describe('shareExpiry domain', () => {
  it('creates min and max bounds around a reference date', () => {
    const referenceDate = new Date('2026-02-14T00:00:00.000Z')
    const bounds = createShareExpiryBounds(referenceDate)

    expect(bounds.minDate.getTime()).toBe(
      referenceDate.getTime() + MIN_SHARE_EXPIRY_BUFFER_SECONDS * 1000,
    )
    expect(bounds.maxDate.getTime()).toBe(
      referenceDate.getTime() + MAX_SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    )
  })

  it('uses max bound as default expiry date', () => {
    const referenceDate = new Date('2026-02-14T00:00:00.000Z')
    const defaultExpiry = createDefaultShareExpiryDate(referenceDate)
    const bounds = createShareExpiryBounds(referenceDate)

    expect(defaultExpiry.getTime()).toBe(bounds.maxDate.getTime())
    expect(defaultExpiry).not.toBe(bounds.maxDate)
  })

  it('resolves a valid expiry date', () => {
    const referenceDate = new Date('2026-02-14T00:00:00.000Z')
    const validExpiry = new Date(referenceDate.getTime() + 60_000)
    const result = resolveShareExpiry(validExpiry, referenceDate)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.expiresAtIso).toBe(validExpiry.toISOString())
    expect(result.value.expiresAtDate.getTime()).toBe(validExpiry.getTime())
  })

  it('returns too soon for near-future dates', () => {
    const referenceDate = new Date('2026-02-14T00:00:00.000Z')
    const invalidExpiry = new Date(referenceDate.getTime() + 1000)
    const result = resolveShareExpiry(invalidExpiry, referenceDate)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'EXPIRY_TOO_SOON',
        }),
      }),
    )
  })

  it('returns too late for dates beyond max bound', () => {
    const referenceDate = new Date('2026-02-14T00:00:00.000Z')
    const invalidExpiry = new Date(
      referenceDate.getTime() + (MAX_SHARE_EXPIRY_DAYS + 1) * 24 * 60 * 60 * 1000,
    )
    const result = resolveShareExpiry(invalidExpiry, referenceDate)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'EXPIRY_TOO_LATE',
        }),
      }),
    )
  })

  it('returns invalid expiry when value is missing', () => {
    const result = resolveShareExpiry(null)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_EXPIRY',
        }),
      }),
    )
  })
})
