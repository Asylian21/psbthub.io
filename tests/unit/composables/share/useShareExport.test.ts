import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/utils/fileDownload', () => ({
  downloadBlobFile: vi.fn(),
  downloadDataUrlFile: vi.fn(),
}))

vi.mock('../../../../src/utils/qr', () => ({
  generateQrPngDataUrl: vi.fn(),
}))

vi.mock('../../../../src/domain/psbt', () => ({
  base64ToBytes: vi.fn(() => new Uint8Array([1, 2, 3, 4])),
}))

vi.mock('../../../../src/composables/share/useSharePayloadFormats', () => ({
  createQrPayloadForMode: vi.fn((psbtBase64: string, mode: string) => {
    if (!psbtBase64 || mode === 'json') {
      return null
    }

    return `payload:${mode}:${psbtBase64}`
  }),
}))

import { useShareExport } from '../../../../src/composables/share/useShareExport'
import { downloadBlobFile, downloadDataUrlFile } from '../../../../src/utils/fileDownload'
import { generateQrPngDataUrl } from '../../../../src/utils/qr'
import { createQrPayloadForMode } from '../../../../src/composables/share/useSharePayloadFormats'

describe('useShareExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles copy and file exports only when payload is exportable', async () => {
    const decryptedPsbt = ref('cHNidA==')
    const shareId = ref('AAAAAAAAAAAAAAAAAAAAAA')
    const psbtDisplayMode = ref<'base64' | 'hex' | 'binary' | 'json'>('base64')
    const canExportPsbt = ref(false)
    const copyToClipboard = vi.fn().mockResolvedValue(undefined)

    const { copyPsbt, downloadPsbtBinary, downloadPsbtText, qrExportFileName } = useShareExport({
      decryptedPsbt,
      shareId,
      psbtDisplayMode,
      canExportPsbt,
      copyToClipboard,
    })

    await copyPsbt()
    expect(copyToClipboard).not.toHaveBeenCalled()

    downloadPsbtBinary()
    downloadPsbtText()
    expect(downloadBlobFile).not.toHaveBeenCalled()

    canExportPsbt.value = true
    await copyPsbt()
    expect(copyToClipboard).toHaveBeenCalledWith('cHNidA==')

    downloadPsbtBinary()
    downloadPsbtText()
    expect(downloadBlobFile).toHaveBeenCalledTimes(2)
    expect(qrExportFileName.value).toBe('psbt-AAAAAAAAAAAAAAAAAAAAAA.base64.png')
  })

  it('generates QR preview, handles generation errors, and downloads QR image', async () => {
    const decryptedPsbt = ref('cHNidA==')
    const shareId = ref('AAAAAAAAAAAAAAAAAAAAAA')
    const psbtDisplayMode = ref<'base64' | 'hex' | 'binary' | 'json'>('base64')
    const canExportPsbt = ref(true)
    const copyToClipboard = vi.fn().mockResolvedValue(undefined)

    const { regenerateQrPreview, qrImageDataUrl, qrImageError, downloadQrImage } = useShareExport({
      decryptedPsbt,
      shareId,
      psbtDisplayMode,
      canExportPsbt,
      copyToClipboard,
    })

    vi.mocked(generateQrPngDataUrl).mockResolvedValueOnce({
      ok: true,
      value: 'data:image/png;base64,abc',
    })
    await regenerateQrPreview('cHNidA==', 'base64')
    expect(qrImageDataUrl.value).toBe('data:image/png;base64,abc')
    expect(qrImageError.value).toBe('')

    downloadQrImage()
    expect(downloadDataUrlFile).toHaveBeenCalledWith(
      'data:image/png;base64,abc',
      'psbt-AAAAAAAAAAAAAAAAAAAAAA.base64.png',
    )

    vi.mocked(generateQrPngDataUrl).mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'QR_GENERATION_FAILED',
        message: 'Image too large',
      },
    })
    await regenerateQrPreview('cHNidA==', 'base64')
    expect(qrImageDataUrl.value).toBe('')
    expect(qrImageError.value).toBe('Image too large')

    await regenerateQrPreview('', 'base64')
    expect(vi.mocked(generateQrPngDataUrl)).toHaveBeenCalledTimes(2)
  })

  it('falls back to default labels and no-ops on empty QR download', () => {
    const decryptedPsbt = ref('cHNidA==')
    const shareId = ref('')
    const psbtDisplayMode = ref<'base64' | 'hex' | 'binary' | 'json'>('base64')
    const canExportPsbt = ref(true)

    const { exportFileNamePrefix, qrExportFormatLabel, downloadQrImage } = useShareExport({
      decryptedPsbt,
      shareId,
      psbtDisplayMode,
      canExportPsbt,
      copyToClipboard: vi.fn().mockResolvedValue(undefined),
    })

    expect(exportFileNamePrefix.value).toBe('psbt-share')

    ;(psbtDisplayMode as unknown as { value: string }).value = 'legacy'
    expect(qrExportFormatLabel.value).toBe('Base64')

    downloadQrImage()
    expect(downloadDataUrlFile).not.toHaveBeenCalled()
  })

  it('skips QR generation when payload format is unavailable', async () => {
    const { regenerateQrPreview, qrImageDataUrl, qrImageError } = useShareExport({
      decryptedPsbt: ref('cHNidA=='),
      shareId: ref('AAAAAAAAAAAAAAAAAAAAAA'),
      psbtDisplayMode: ref<'base64' | 'hex' | 'binary' | 'json'>('json'),
      canExportPsbt: ref(true),
      copyToClipboard: vi.fn().mockResolvedValue(undefined),
    })

    await regenerateQrPreview('cHNidA==', 'json')

    expect(createQrPayloadForMode).toHaveBeenCalledWith('cHNidA==', 'json')
    expect(generateQrPngDataUrl).not.toHaveBeenCalled()
    expect(qrImageDataUrl.value).toBe('')
    expect(qrImageError.value).toBe('')
  })

  it('keeps the latest QR preview result during overlapping generations', async () => {
    const { regenerateQrPreview, qrImageDataUrl, qrImageError } = useShareExport({
      decryptedPsbt: ref('cHNidA=='),
      shareId: ref('AAAAAAAAAAAAAAAAAAAAAA'),
      psbtDisplayMode: ref<'base64' | 'hex' | 'binary' | 'json'>('base64'),
      canExportPsbt: ref(true),
      copyToClipboard: vi.fn().mockResolvedValue(undefined),
    })

    let resolveFirst: (value: { ok: true; value: string }) => void
    let resolveSecond: (value: { ok: true; value: string }) => void
    const firstPromise = new Promise<{ ok: true; value: string }>((resolve) => {
      resolveFirst = resolve
    })
    const secondPromise = new Promise<{ ok: true; value: string }>((resolve) => {
      resolveSecond = resolve
    })

    vi.mocked(generateQrPngDataUrl)
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise)

    const firstRequest = regenerateQrPreview('first', 'base64')
    const secondRequest = regenerateQrPreview('second', 'base64')

    resolveSecond!({
      ok: true,
      value: 'data:image/png;base64,new',
    })
    await secondRequest
    expect(qrImageDataUrl.value).toBe('data:image/png;base64,new')

    resolveFirst!({
      ok: true,
      value: 'data:image/png;base64,old',
    })
    await firstRequest
    expect(qrImageDataUrl.value).toBe('data:image/png;base64,new')
    expect(qrImageError.value).toBe('')
  })
})
