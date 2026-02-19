import { describe, expect, it } from 'vitest'
import {
  detectLocalDatePickerFormat,
  fromPickerDateForMode,
  toPickerDateForMode,
} from '../../../../src/composables/home/useHomeExpiryDateMode'

describe('useHomeExpiryDateMode helpers', () => {
  it('returns a supported PrimeVue date format token', () => {
    const format = detectLocalDatePickerFormat()

    expect(['mm/dd/yy', 'yy-mm-dd', 'dd.mm.yy']).toContain(format)
  })

  it('roundtrips local mode date conversion', () => {
    const source = new Date('2026-02-15T13:14:15.000Z')
    const pickerDate = toPickerDateForMode(source, 'local')
    const restored = fromPickerDateForMode(pickerDate, 'local')

    expect(restored.getTime()).toBe(source.getTime())
  })

  it('returns Date instances for utc mode conversion', () => {
    const source = new Date('2026-02-15T13:14:15.000Z')
    const pickerDate = toPickerDateForMode(source, 'utc')
    const restored = fromPickerDateForMode(pickerDate, 'utc')

    expect(pickerDate instanceof Date).toBe(true)
    expect(restored instanceof Date).toBe(true)
  })
})
