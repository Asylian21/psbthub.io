/**
 * Unit coverage for password normalization, scoring, and generation.
 */
import { describe, expect, it } from 'vitest'
import {
  assessSharePasswordStrength,
  generateSharePassword,
  normalizeSharePassword,
  validateSharePassword,
} from '../../../src/domain/sharePassword'

describe('sharePassword domain', () => {
  it('normalizes passwords with trim', () => {
    expect(normalizeSharePassword('  secret  ')).toBe('secret')
  })

  it('rejects empty passwords', () => {
    const result = validateSharePassword('   ')

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_PASSWORD',
        }),
      }),
    )
  })

  it('accepts normalized non-empty passwords', () => {
    const result = validateSharePassword(' StrongPassword#2026 ')

    expect(result).toEqual({
      ok: true,
      value: 'StrongPassword#2026',
    })
  })

  it('accepts weak passwords as advisory-only policy', () => {
    const result = validateSharePassword('abc')

    expect(result).toEqual({
      ok: true,
      value: 'abc',
    })
  })

  it('returns no-password assessment for empty input', () => {
    const assessment = assessSharePasswordStrength('')

    expect(assessment.score).toBe(0)
    expect(assessment.level).toBe('very_weak')
    expect(assessment.label).toBe('No password')
  })

  it('scores strong passwords above weak ones', () => {
    const weak = assessSharePasswordStrength('abc123')
    const strong = assessSharePasswordStrength('L0ng!Stable#Passphrase2026')

    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.level === 'strong' || strong.level === 'very_strong').toBe(true)
  })

  it('generates a password with required character classes', () => {
    const result = generateSharePassword()

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.length).toBe(24)
    expect(/[A-Z]/.test(result.value)).toBe(true)
    expect(/[a-z]/.test(result.value)).toBe(true)
    expect(/[0-9]/.test(result.value)).toBe(true)
    expect(/[^A-Za-z0-9]/.test(result.value)).toBe(true)
  })

  it('rejects invalid generated password length', () => {
    const result = generateSharePassword(7)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_PASSWORD',
        }),
      }),
    )
  })
})
