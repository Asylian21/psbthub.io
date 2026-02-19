/**
 * Unit coverage for browser download helper utilities.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlobFile, downloadDataUrlFile } from '../../../src/utils/fileDownload'

describe('fileDownload utils', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('downloads a blob via object URL and revokes it', () => {
    vi.useFakeTimers()
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:psbthub-test')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { })

    downloadBlobFile(new Blob(['payload'], { type: 'text/plain' }), 'payload.txt')

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:psbthub-test')
  })

  it('downloads data URL directly', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { })

    downloadDataUrlFile('data:text/plain;base64,cHNi', 'psbt.txt')

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
