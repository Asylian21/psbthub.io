import type { FileUploadSelectEvent } from 'primevue/fileupload'
import {
  validatePsbtBytes,
  validatePsbtPayloadText,
  type ValidatedPsbt,
} from '../../domain/psbt'

export type ParsedFileResult =
  | {
      ok: true
      value: ValidatedPsbt
    }
  | {
      ok: false
      message: string
    }

function isFileListLike(value: unknown): value is FileList {
  if (typeof FileList !== 'undefined' && value instanceof FileList) {
    return true
  }

  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as {
    item?: unknown
    length?: unknown
  }

  return (
    typeof candidate.item === 'function' &&
    typeof candidate.length === 'number'
  )
}

export function extractFirstSelectedFile(event: FileUploadSelectEvent): File | null {
  const { files } = event

  if (Array.isArray(files)) {
    const [firstFile] = files
    return firstFile instanceof File ? firstFile : null
  }

  if (isFileListLike(files)) {
    const firstFile = files.item(0)
    return firstFile instanceof File ? firstFile : null
  }

  return null
}

export async function parsePsbtFile(
  file: File,
  maxPsbtBytes: number,
): Promise<ParsedFileResult> {
  const fileBytes = new Uint8Array(await file.arrayBuffer())
  const binaryValidationResult = validatePsbtBytes(fileBytes, maxPsbtBytes)

  if (binaryValidationResult.ok) {
    return {
      ok: true,
      value: binaryValidationResult.value,
    }
  }

  if (binaryValidationResult.error.code !== 'INVALID_PSBT') {
    return {
      ok: false,
      message: binaryValidationResult.error.message,
    }
  }

  const textValidationResult = validatePsbtPayloadText(await file.text(), maxPsbtBytes)

  if (textValidationResult.ok) {
    return {
      ok: true,
      value: textValidationResult.value,
    }
  }

  return {
    ok: false,
    message: textValidationResult.error.message,
  }
}
