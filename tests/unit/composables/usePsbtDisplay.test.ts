/**
 * Unit coverage for PSBT display format and expansion behavior.
 */
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { usePsbtDisplay } from '../../../src/composables/usePsbtDisplay'
import { bytesToBase64 } from '../../../src/utils/encoding'
import { createSamplePsbtBase64 } from '../../shared/psbtFixture'

describe('usePsbtDisplay composable', () => {
  it('uses base64 mode by default', () => {
    const psbtBase64 = ref(createSamplePsbtBase64())
    const display = usePsbtDisplay(psbtBase64)

    expect(display.psbtDisplayMode.value).toBe('base64')
    expect(display.displayedPsbtPayload.value).toBe(psbtBase64.value)
  })

  it('renders hex and binary display modes', () => {
    const psbtBase64 = ref(createSamplePsbtBase64())
    const display = usePsbtDisplay(psbtBase64)

    display.psbtDisplayMode.value = 'hex'
    expect(display.displayedPsbtPayload.value).toMatch(/^[0-9a-f]+$/)

    display.psbtDisplayMode.value = 'binary'
    expect(display.displayedPsbtPayload.value).toMatch(/^[01 ]+$/)
    expect(display.psbtDisplayHint.value).toContain('Binary preview shows one byte')
  })

  it('provides JSON transaction preview', () => {
    const psbtBase64 = ref(createSamplePsbtBase64())
    const display = usePsbtDisplay(psbtBase64)
    display.psbtDisplayMode.value = 'json'

    expect(display.displayedPsbtPayload.value).toContain('"txid"')
    expect(display.displayedPsbtPayload.value).toContain('"inputs"')
  })

  it('shows truncation hint for large binary payloads', () => {
    const oversizedBytes = new Uint8Array(5000)
    oversizedBytes.fill(1)
    const psbtBase64 = ref(bytesToBase64(oversizedBytes))
    const display = usePsbtDisplay(psbtBase64)
    display.psbtDisplayMode.value = 'binary'

    expect(display.psbtDisplayHint.value).toContain('first 4 096 bytes')
  })

  it('toggles payload expansion state', () => {
    const psbtBase64 = ref(createSamplePsbtBase64())
    const display = usePsbtDisplay(psbtBase64)

    expect(display.isPsbtDisplayExpanded.value).toBe(false)
    display.togglePsbtDisplayExpansion()
    expect(display.isPsbtDisplayExpanded.value).toBe(true)
  })
})
