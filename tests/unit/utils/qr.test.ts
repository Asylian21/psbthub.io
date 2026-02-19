/**
 * Unit coverage for QR utility error/result mapping.
 */
import { describe, expect, it, vi } from 'vitest'
import { generateQrPngDataUrl, scanQrImageFile } from '../../../src/utils/qr'

const { scanImageMock, toDataUrlMock } = vi.hoisted(() => ({
  scanImageMock: vi.fn(),
  toDataUrlMock: vi.fn(),
}))

vi.mock('qr-scanner', () => ({
  default: {
    scanImage: (...args: unknown[]) => scanImageMock(...args),
  },
}))

vi.mock('qrcode', () => ({
  toDataURL: (...args: unknown[]) => toDataUrlMock(...args),
}))

describe('qr utils', () => {
  it('scans QR image files successfully', async () => {
    scanImageMock.mockResolvedValue({
      data: 'psbt-from-qr',
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'test.png', {
      type: 'image/png',
    })
    const result = await scanQrImageFile(file)

    expect(result).toEqual({
      ok: true,
      value: 'psbt-from-qr',
    })
  })

  it('maps no-QR error from scanner', async () => {
    scanImageMock.mockRejectedValue(new Error('No QR code found'))

    const file = new File([new Uint8Array([1, 2, 3])], 'test.png', {
      type: 'image/png',
    })
    const result = await scanQrImageFile(file)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'NO_QR_CODE_FOUND',
        }),
      }),
    )
  })

  it('rejects empty payload on QR generation', async () => {
    const result = await generateQrPngDataUrl('   ')

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'GENERATION_FAILED',
        }),
      }),
    )
  })

  it('generates QR PNG data URL', async () => {
    toDataUrlMock.mockResolvedValue('data:image/png;base64,abc')

    const result = await generateQrPngDataUrl('payload')

    expect(result).toEqual({
      ok: true,
      value: 'data:image/png;base64,abc',
    })
  })

  it('maps payload too large generation errors', async () => {
    toDataUrlMock.mockRejectedValue(new Error('code length overflow'))

    const result = await generateQrPngDataUrl('x'.repeat(200_000))

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'PAYLOAD_TOO_LARGE',
        }),
      }),
    )
  })
})
