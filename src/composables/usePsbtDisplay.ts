/**
 * PSBT display orchestration composable.
 *
 * Provides multi-format rendering (base64/hex/binary/json) and expandable
 * viewer state for large payload previews.
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { base64ToBytes, decodePsbtTransactionPreview } from '../domain/psbt'

const MAX_BINARY_PREVIEW_BYTES = 4096

export type PsbtDisplayMode = 'base64' | 'hex' | 'binary' | 'json'

export interface PsbtDisplayModeOption {
  label: string
  value: PsbtDisplayMode
}

export const PSBT_DISPLAY_MODE_OPTIONS: PsbtDisplayModeOption[] = [
  { label: 'Base64', value: 'base64' },
  { label: 'Hex', value: 'hex' },
  { label: 'Binary', value: 'binary' },
  { label: 'JSON', value: 'json' },
]

export interface UsePsbtDisplay {
  psbtDisplayMode: Ref<PsbtDisplayMode>
  isPsbtDisplayExpanded: Ref<boolean>
  displayedPsbtPayload: ComputedRef<string>
  psbtDisplayHint: ComputedRef<string>
  togglePsbtDisplayExpansion(): void
}

function formatIntegerWithSpaces(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  })
    .format(value)
    .split(',')
    .join(' ')
}

function bytesToHexString(bytes: Uint8Array): string {
  let output = ''

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0')
  }

  return output
}

function toBinaryPreview(bytes: Uint8Array): {
  text: string
  truncated: boolean
} {
  const visibleByteCount = Math.min(bytes.byteLength, MAX_BINARY_PREVIEW_BYTES)
  const byteChunks: string[] = []

  for (let index = 0; index < visibleByteCount; index += 1) {
    const currentByte = bytes[index]

    if (typeof currentByte === 'undefined') {
      continue
    }

    byteChunks.push(currentByte.toString(2).padStart(8, '0'))
  }

  return {
    // Keep binary bytes as space-separated groups and let the UI wrap by container width.
    text: byteChunks.join(' '),
    truncated: bytes.byteLength > visibleByteCount,
  }
}

export function usePsbtDisplay(psbtBase64: Readonly<Ref<string>>): UsePsbtDisplay {
  const psbtDisplayMode = ref<PsbtDisplayMode>('base64')
  const isPsbtDisplayExpanded = ref(false)

  const psbtBytes = computed<Uint8Array | null>(() => {
    if (!psbtBase64.value) {
      return null
    }

    try {
      return base64ToBytes(psbtBase64.value)
    } catch {
      return null
    }
  })

  const binaryPreview = computed<{
    text: string
    truncated: boolean
  }>(() => {
    if (!psbtBytes.value) {
      return {
        text: '',
        truncated: false,
      }
    }

    return toBinaryPreview(psbtBytes.value)
  })

  const displayedPsbtPayload = computed<string>(() => {
    if (!psbtBase64.value) {
      return ''
    }

    if (!psbtBytes.value) {
      return psbtBase64.value
    }

    if (psbtDisplayMode.value === 'base64') {
      return psbtBase64.value
    }

    if (psbtDisplayMode.value === 'hex') {
      return bytesToHexString(psbtBytes.value)
    }

    if (psbtDisplayMode.value === 'binary') {
      return binaryPreview.value.text
    }

    const decodeResult = decodePsbtTransactionPreview(psbtBase64.value)

    if (decodeResult.ok) {
      return JSON.stringify(decodeResult.value, null, 2)
    }

    return JSON.stringify(
      {
        error: 'Unable to decode PSBT transaction preview.',
      },
      null,
      2,
    )
  })

  const psbtDisplayHint = computed<string>(() => {
    if (psbtDisplayMode.value !== 'binary') {
      return ''
    }

    if (binaryPreview.value.truncated) {
      return `Binary preview shows the first ${formatIntegerWithSpaces(MAX_BINARY_PREVIEW_BYTES)} bytes.`
    }

    return 'Binary preview shows one byte as an 8-bit group.'
  })

  /**
   * Toggles expanded/collapsed state for payload preview UI.
   */
  function togglePsbtDisplayExpansion(): void {
    isPsbtDisplayExpanded.value = !isPsbtDisplayExpanded.value
  }

  return {
    psbtDisplayMode,
    isPsbtDisplayExpanded,
    displayedPsbtPayload,
    psbtDisplayHint,
    togglePsbtDisplayExpansion,
  }
}
