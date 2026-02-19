/**
 * Unit coverage for share ID generation and validation.
 */
import { describe, expect, it } from 'vitest'
import { generateShareId, isValidShareId, SHARE_ID_LENGTH } from '../../../src/domain/shareId'

describe('shareId domain', () => {
  it('generates fixed-length alphanumeric IDs', () => {
    const shareId = generateShareId()

    expect(shareId).toHaveLength(SHARE_ID_LENGTH)
    expect(shareId).toMatch(/^[A-Za-z0-9]{22}$/)
    expect(shareId).not.toMatch(/[-_]/)
  })

  it('generates unique IDs across repeated samples', () => {
    const generatedIds = new Set<string>()

    for (let index = 0; index < 128; index += 1) {
      const shareId = generateShareId()
      expect(isValidShareId(shareId)).toBe(true)
      generatedIds.add(shareId)
    }

    expect(generatedIds.size).toBe(128)
  })

  it('accepts valid IDs and rejects legacy formats', () => {
    const validId = 'A1B2C3D4E5F6G7H8I9J0K1'

    expect(isValidShareId(validId)).toBe(true)
    expect(isValidShareId(` ${validId} `)).toBe(true)
    expect(isValidShareId('A1B2C3D4E5F6G7H8I9J0K')).toBe(false)
    expect(isValidShareId('A1B2C3D4E5F6G7H8I9J0K_')).toBe(false)
    expect(isValidShareId('123e4567-e89b-12d3-a456-426614174000')).toBe(false)
  })
})
