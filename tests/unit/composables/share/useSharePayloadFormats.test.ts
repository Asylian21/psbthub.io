import { describe, expect, it } from 'vitest'
import {
  createQrPayloadForMode,
  formatIntegerWithSpaces,
  formatKilobytesFromBytes,
} from '../../../../src/composables/share/useSharePayloadFormats'
import { createSamplePsbtBase64 } from '../../../shared/psbtFixture'

describe('useSharePayloadFormats helpers', () => {
  it('formats numbers for display', () => {
    expect(formatIntegerWithSpaces(1234567)).toBe('1 234 567')
    expect(formatKilobytesFromBytes(2048)).toBe('2.00')
  })

  it('creates mode-specific QR payloads', () => {
    const psbtBase64 = createSamplePsbtBase64()
    const base64Payload = createQrPayloadForMode(psbtBase64, 'base64')
    const hexPayload = createQrPayloadForMode(psbtBase64, 'hex')
    const binaryPayload = createQrPayloadForMode(psbtBase64, 'binary')
    const jsonPayload = createQrPayloadForMode(psbtBase64, 'json')

    expect(base64Payload).toBe(psbtBase64)
    expect(hexPayload).toMatch(/^[0-9a-f]+$/)
    expect(binaryPayload).toMatch(/^[01 ]+$/)
    expect(jsonPayload).toContain('txid')
  })
})
