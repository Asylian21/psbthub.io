/**
 * Unit coverage for QR camera lifecycle and state mapping.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQrCamera } from '../../../src/composables/useQrCamera'

const scannerState = vi.hoisted(() => ({
  scannerStartMock: vi.fn(),
  scannerStopMock: vi.fn(),
  scannerDestroyMock: vi.fn(),
  emitDecodedPayload: null as ((payload: string) => void) | null,
}))

vi.mock('qr-scanner', () => ({
  default: class MockQrScanner {
    constructor(
      _videoElement: HTMLVideoElement,
      onDetected: (result: { data: string }) => void,
    ) {
      scannerState.emitDecodedPayload = (payload: string): void => {
        onDetected({ data: payload })
      }
    }

    start(): Promise<void> {
      return scannerState.scannerStartMock()
    }

    stop(): void {
      scannerState.scannerStopMock()
    }

    destroy(): void {
      scannerState.scannerDestroyMock()
    }
  },
}))

function setNavigatorMediaDevices(enabled: boolean): void {
  if (enabled) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      configurable: true,
    })
    return
  }

  Object.defineProperty(navigator, 'mediaDevices', {
    value: undefined,
    configurable: true,
  })
}

describe('useQrCamera composable', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => { })
    scannerState.scannerStartMock.mockReset()
    scannerState.scannerStopMock.mockReset()
    scannerState.scannerDestroyMock.mockReset()
    scannerState.emitDecodedPayload = null
    setNavigatorMediaDevices(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns CAMERA_NOT_SUPPORTED when mediaDevices is unavailable', async () => {
    setNavigatorMediaDevices(false)
    const qrCamera = useQrCamera()
    await qrCamera.start(document.createElement('video'), () => { })

    expect(qrCamera.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'CAMERA_NOT_SUPPORTED',
      }),
    )
  })

  it('starts scanning and emits payload callback', async () => {
    scannerState.scannerStartMock.mockResolvedValue(undefined)
    const onDetected = vi.fn()
    const qrCamera = useQrCamera()
    await qrCamera.start(document.createElement('video'), onDetected)

    expect(qrCamera.state.value.status).toBe('scanning')

    scannerState.emitDecodedPayload?.('psbt-payload')
    scannerState.emitDecodedPayload?.('psbt-payload')

    expect(onDetected).toHaveBeenCalledTimes(1)
    expect(onDetected).toHaveBeenCalledWith('psbt-payload')
  })

  it('maps scanner start failures', async () => {
    scannerState.scannerStartMock.mockRejectedValue(new Error('camera failure'))
    const qrCamera = useQrCamera()
    await qrCamera.start(document.createElement('video'), () => { })

    expect(qrCamera.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'CAMERA_START_FAILED',
      }),
    )
  })

  it('stops active scanner and returns to idle', async () => {
    scannerState.scannerStartMock.mockResolvedValue(undefined)
    const qrCamera = useQrCamera()
    await qrCamera.start(document.createElement('video'), () => { })

    qrCamera.stop()

    expect(scannerState.scannerStopMock).toHaveBeenCalledTimes(1)
    expect(scannerState.scannerDestroyMock).toHaveBeenCalledTimes(1)
    expect(qrCamera.state.value).toEqual({ status: 'idle' })
  })
})
