/**
 * QR camera composable.
 *
 * Encapsulates camera scanner lifecycle and translates runtime failures into
 * typed UI-safe states.
 */
import { onBeforeUnmount, ref, type Ref } from 'vue'
import type QrScanner from 'qr-scanner'

export type QrCameraErrorCode =
  | 'CAMERA_NOT_SUPPORTED'
  | 'CAMERA_START_FAILED'
  | 'CAMERA_STREAM_FAILED'

export type QrCameraState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'scanning' }
  | {
      status: 'error'
      code: QrCameraErrorCode
      message: string
    }

export interface UseQrCamera {
  state: Ref<QrCameraState>
  start(
    videoElement: HTMLVideoElement,
    onDetected: (payload: string) => void,
  ): Promise<void>
  stop(): void
}

const DUPLICATE_SCAN_SUPPRESSION_MS = 2_000

function toCameraError(code: QrCameraErrorCode, message: string): QrCameraState {
  return {
    status: 'error',
    code,
    message,
  }
}

async function loadQrScanner(): Promise<typeof import('qr-scanner').default> {
  const module = await import('qr-scanner')
  return module.default
}

export function useQrCamera(): UseQrCamera {
  const state = ref<QrCameraState>({ status: 'idle' })
  let scanner: QrScanner | null = null
  let lastScannedPayload = ''
  let lastScannedAt = 0

  /**
   * Starts QR scanner stream and invokes callback on decoded payload.
   */
  async function start(
    videoElement: HTMLVideoElement,
    onDetected: (payload: string) => void,
  ): Promise<void> {
    stop()

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      state.value = toCameraError(
        'CAMERA_NOT_SUPPORTED',
        'Camera access is not supported by this browser.',
      )
      return
    }

    state.value = { status: 'starting' }

    try {
      const QrScannerLib = await loadQrScanner()

      scanner = new QrScannerLib(
        videoElement,
        (result) => {
          const now = Date.now()

          if (
            result.data === lastScannedPayload &&
            now - lastScannedAt < DUPLICATE_SCAN_SUPPRESSION_MS
          ) {
            return
          }

          lastScannedPayload = result.data
          lastScannedAt = now
          onDetected(result.data)
        },
        {
          preferredCamera: 'environment',
          returnDetailedScanResult: true,
          onDecodeError: () => {
            // Frequent decode misses are expected during active scanning.
          },
        },
      )

      await scanner.start()
      state.value = { status: 'scanning' }
    } catch {
      stop()
      state.value = toCameraError(
        'CAMERA_START_FAILED',
        'Unable to start camera QR scanner.',
      )
    }
  }

  /**
   * Stops scanner, clears state, and releases camera resources.
   */
  function stop(): void {
    if (scanner) {
      scanner.stop()
      scanner.destroy()
      scanner = null
    }

    lastScannedPayload = ''
    lastScannedAt = 0

    if (state.value.status === 'starting' || state.value.status === 'scanning') {
      state.value = { status: 'idle' }
    }
  }

  onBeforeUnmount(() => {
    stop()
  })

  return {
    state,
    start,
    stop,
  }
}
