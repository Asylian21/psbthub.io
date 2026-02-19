import type { FileUploadSelectEvent } from 'primevue/fileupload'
import { describe, expect, it } from 'vitest'
import {
  extractFirstSelectedFile,
  parsePsbtFile,
} from '../../../../src/composables/home/useHomeImport'
import { base64ToBytes } from '../../../../src/utils/encoding'
import { createSamplePsbtBase64 } from '../../../shared/psbtFixture'

describe('useHomeImport helpers', () => {
  it('extracts first selected file from event array', () => {
    const file = new File(['hello'], 'sample.txt', { type: 'text/plain' })
    const event = {
      files: [file],
    } as unknown as FileUploadSelectEvent

    expect(extractFirstSelectedFile(event)).toBe(file)
  })

  it('extracts first selected file from FileList and returns null when missing', () => {
    const file = new File(['hello'], 'sample.txt', { type: 'text/plain' })
    const fileListLike = {
      0: file,
      length: 1,
      item(index: number): File | null {
        return index === 0 ? file : null
      },
    }

    const fileListEvent = {
      files: fileListLike,
    } as unknown as FileUploadSelectEvent
    const missingEvent = {
      files: [],
    } as unknown as FileUploadSelectEvent

    expect(extractFirstSelectedFile(fileListEvent)?.name).toBe('sample.txt')
    expect(extractFirstSelectedFile(missingEvent)).toBeNull()
  })

  it('parses valid PSBT from binary file', async () => {
    const samplePsbtBase64 = createSamplePsbtBase64()
    const bytes = base64ToBytes(samplePsbtBase64)
    const file = new File([bytes], 'sample.psbt', {
      type: 'application/octet-stream',
    })

    const result = await parsePsbtFile(file, 1024 * 1024)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.base64).toBe(samplePsbtBase64)
  })

  it('returns error for invalid file payload', async () => {
    const file = new File(['not-a-psbt'], 'bad.txt', { type: 'text/plain' })
    const result = await parsePsbtFile(file, 1024 * 1024)

    expect(result.ok).toBe(false)
  })

  it('parses valid PSBT from text file fallback path', async () => {
    const samplePsbtBase64 = createSamplePsbtBase64()
    const file = new File([samplePsbtBase64], 'sample.txt', { type: 'text/plain' })
    const result = await parsePsbtFile(file, 1024 * 1024)

    expect(result.ok).toBe(true)
  })

  it('returns non-INVALID_PSBT validation errors directly', async () => {
    const samplePsbtBase64 = createSamplePsbtBase64()
    const bytes = base64ToBytes(samplePsbtBase64)
    const file = new File([bytes], 'sample.psbt', {
      type: 'application/octet-stream',
    })
    const result = await parsePsbtFile(file, 10)

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }

    expect(result.message).toContain('larg')
  })
})
