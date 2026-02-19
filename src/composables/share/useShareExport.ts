import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { SHARE_QR_EXPORT_FORMAT_SEVERITY } from '../../content/shareContent'
import { base64ToBytes } from '../../domain/psbt'
import { downloadBlobFile, downloadDataUrlFile } from '../../utils/fileDownload'
import { generateQrPngDataUrl } from '../../utils/qr'
import {
  PSBT_DISPLAY_MODE_OPTIONS,
  type PsbtDisplayMode,
} from '../usePsbtDisplay'
import { createQrPayloadForMode } from './useSharePayloadFormats'

export type QrExportSeverity = 'secondary' | 'info' | 'warn' | 'success'

export interface UseShareExport {
  qrImageDataUrl: Ref<string>
  qrImageError: Ref<string>
  exportFileNamePrefix: ComputedRef<string>
  qrExportFormatLabel: ComputedRef<string>
  qrExportFormatSeverity: ComputedRef<QrExportSeverity>
  qrExportFileName: ComputedRef<string>
  copyPsbt(): Promise<void>
  downloadPsbtBinary(): void
  downloadPsbtText(): void
  downloadQrImage(): void
  regenerateQrPreview(psbtBase64: string, mode: PsbtDisplayMode): Promise<void>
}

interface UseShareExportOptions {
  decryptedPsbt: Ref<string>
  shareId: Ref<string>
  psbtDisplayMode: Ref<PsbtDisplayMode>
  canExportPsbt: Ref<boolean>
  copyToClipboard: (value: string) => Promise<void>
}

/**
 * Encapsulates clipboard + file + QR export behavior for decrypted shares.
 */
export function useShareExport(options: UseShareExportOptions): UseShareExport {
  const {
    decryptedPsbt,
    shareId,
    psbtDisplayMode,
    canExportPsbt,
    copyToClipboard,
  } = options

  const qrImageDataUrl = ref('')
  const qrImageError = ref('')
  let qrGenerationRequestId = 0

  const exportFileNamePrefix = computed<string>(() => {
    return shareId.value ? `psbt-${shareId.value}` : 'psbt-share'
  })

  const qrExportFormatLabel = computed<string>(() => {
    const selectedFormat = PSBT_DISPLAY_MODE_OPTIONS.find(
      (option) => option.value === psbtDisplayMode.value,
    )

    return selectedFormat?.label ?? 'Base64'
  })

  const qrExportFormatSeverity = computed<QrExportSeverity>(() => {
    return SHARE_QR_EXPORT_FORMAT_SEVERITY[psbtDisplayMode.value]
  })

  const qrExportFileName = computed<string>(() => {
    return `${exportFileNamePrefix.value}.${psbtDisplayMode.value}.png`
  })

  async function copyPsbt(): Promise<void> {
    if (!decryptedPsbt.value || !canExportPsbt.value) {
      return
    }

    await copyToClipboard(decryptedPsbt.value)
  }

  function downloadPsbtBinary(): void {
    if (!decryptedPsbt.value || !canExportPsbt.value) {
      return
    }

    const psbtBytes = base64ToBytes(decryptedPsbt.value)
    const binaryPayload = new Uint8Array(psbtBytes.byteLength)
    binaryPayload.set(psbtBytes)
    const psbtBlob = new Blob([binaryPayload.buffer], {
      type: 'application/octet-stream',
    })
    downloadBlobFile(psbtBlob, `${exportFileNamePrefix.value}.psbt`)
  }

  function downloadPsbtText(): void {
    if (!decryptedPsbt.value || !canExportPsbt.value) {
      return
    }

    const textBlob = new Blob([`${decryptedPsbt.value}\n`], {
      type: 'text/plain;charset=utf-8',
    })
    downloadBlobFile(textBlob, `${exportFileNamePrefix.value}.txt`)
  }

  function downloadQrImage(): void {
    if (!qrImageDataUrl.value) {
      return
    }

    downloadDataUrlFile(qrImageDataUrl.value, qrExportFileName.value)
  }

  async function regenerateQrPreview(
    psbtBase64: string,
    mode: PsbtDisplayMode,
  ): Promise<void> {
    qrGenerationRequestId += 1
    const currentRequestId = qrGenerationRequestId
    qrImageDataUrl.value = ''
    qrImageError.value = ''

    if (!psbtBase64) {
      return
    }

    const qrPayload = createQrPayloadForMode(psbtBase64, mode)

    if (!qrPayload) {
      return
    }

    const qrResult = await generateQrPngDataUrl(qrPayload)

    if (currentRequestId !== qrGenerationRequestId) {
      return
    }

    if (!qrResult.ok) {
      qrImageError.value = qrResult.error.message
      return
    }

    qrImageDataUrl.value = qrResult.value
  }

  return {
    qrImageDataUrl,
    qrImageError,
    exportFileNamePrefix,
    qrExportFormatLabel,
    qrExportFormatSeverity,
    qrExportFileName,
    copyPsbt,
    downloadPsbtBinary,
    downloadPsbtText,
    downloadQrImage,
    regenerateQrPreview,
  }
}
