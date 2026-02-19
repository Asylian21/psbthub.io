import { type PsbtDisplayMode } from '../usePsbtDisplay'
import { base64ToBytes, decodePsbtTransactionPreview } from '../../domain/psbt'

const ONE_KILOBYTE_IN_BYTES = 1024

function bytesToHexString(bytes: Uint8Array): string {
  let output = ''

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0')
  }

  return output
}

function bytesToBinaryString(bytes: Uint8Array): string {
  let output = ''

  for (const byte of bytes) {
    output += byte.toString(2).padStart(8, '0')
  }

  return output
}

function createJsonQrPayload(psbtBase64: string): string {
  const decodeResult = decodePsbtTransactionPreview(psbtBase64)

  if (decodeResult.ok) {
    return JSON.stringify(decodeResult.value)
  }

  return JSON.stringify({
    error: 'Unable to decode PSBT transaction preview.',
  })
}

export function formatIntegerWithSpaces(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  })
    .format(value)
    .split(',')
    .join(' ')
}

export function formatKilobytesFromBytes(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value / ONE_KILOBYTE_IN_BYTES)
    .split(',')
    .join(' ')
}

export function createQrPayloadForMode(
  psbtBase64: string,
  mode: PsbtDisplayMode,
): string {
  const normalizedBase64 = psbtBase64.trim()

  if (!normalizedBase64) {
    return ''
  }

  if (mode === 'base64') {
    return normalizedBase64
  }

  let psbtBytes: Uint8Array

  try {
    psbtBytes = base64ToBytes(normalizedBase64)
  } catch {
    return normalizedBase64
  }

  if (mode === 'hex') {
    return bytesToHexString(psbtBytes)
  }

  if (mode === 'binary') {
    return bytesToBinaryString(psbtBytes)
  }

  return createJsonQrPayload(normalizedBase64)
}
