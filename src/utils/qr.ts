/**
 * QR utility wrappers for image scan and PNG generation.
 *
 * These helpers normalize third-party errors into typed domain-safe results.
 */
const QR_EXPORT_WIDTH = 360
const QR_EXPORT_MARGIN = 1

export type QrUtilityErrorCode =
  | 'NO_QR_CODE_FOUND'
  | 'SCAN_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'GENERATION_FAILED'

export interface QrUtilityError {
  kind: 'qr_utility_error'
  code: QrUtilityErrorCode
  message: string
}

export type QrUtilityResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      error: QrUtilityError
    }

function createQrUtilityError(
  code: QrUtilityErrorCode,
  message: string,
): QrUtilityResult<never> {
  return {
    ok: false,
    error: {
      kind: 'qr_utility_error',
      code,
      message,
    },
  }
}

function isNoQrCodeError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.toLowerCase().includes('no qr code found')
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes('no qr code found')
  }

  return false
}

function isPayloadTooLargeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const normalizedMessage = error.message.toLowerCase()

  return (
    normalizedMessage.includes('too big') ||
    normalizedMessage.includes('code length overflow') ||
    normalizedMessage.includes('data is too long')
  )
}

export async function scanQrImageFile(file: File): Promise<QrUtilityResult<string>> {
  try {
    const { default: QrScanner } = await import('qr-scanner')
    const scanResult = await QrScanner.scanImage(file, {
      returnDetailedScanResult: true,
    })

    return {
      ok: true,
      value: scanResult.data,
    }
  } catch (error) {
    if (isNoQrCodeError(error)) {
      return createQrUtilityError(
        'NO_QR_CODE_FOUND',
        'No QR code found in the selected image.',
      )
    }

    return createQrUtilityError('SCAN_FAILED', 'Unable to decode QR from image.')
  }
}

/**
 * Generates a single PNG QR image for the given payload.
 * Returns a typed "payload too large" error when the QR encoder overflows.
 */
export async function generateQrPngDataUrl(
  payload: string,
): Promise<QrUtilityResult<string>> {
  const normalizedPayload = payload.trim()

  if (!normalizedPayload) {
    return createQrUtilityError('GENERATION_FAILED', 'QR payload is empty.')
  }

  try {
    const QRCode = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(normalizedPayload, {
      type: 'image/png',
      width: QR_EXPORT_WIDTH,
      margin: QR_EXPORT_MARGIN,
      errorCorrectionLevel: 'M',
    })

    return {
      ok: true,
      value: dataUrl,
    }
  } catch (error) {
    if (isPayloadTooLargeError(error)) {
      return createQrUtilityError(
        'PAYLOAD_TOO_LARGE',
        'PSBT is too large for a single QR image.',
      )
    }

    return createQrUtilityError('GENERATION_FAILED', 'Unable to generate QR image.')
  }
}
