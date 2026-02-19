/**
 * Unit coverage for shared runtime type guards.
 */
import { describe, expect, it } from 'vitest'
import { isRecord } from '../../../src/utils/typeGuards'

describe('typeGuards utils', () => {
  it('returns true for plain objects and arrays', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ hello: 'world' })).toBe(true)
    expect(isRecord([])).toBe(true)
  })

  it('returns false for null and primitives', () => {
    expect(isRecord(null)).toBe(false)
    expect(isRecord(undefined)).toBe(false)
    expect(isRecord(123)).toBe(false)
    expect(isRecord('test')).toBe(false)
    expect(isRecord(false)).toBe(false)
  })
})
