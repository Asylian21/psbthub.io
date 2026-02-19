/**
 * Unit coverage for fetch/decrypt/delete orchestration paths.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFetch } from '../../../src/composables/useFetch'
import {
  createPasswordKeyDerivation,
  deriveShareKeyFromPassword,
  encodeShareKeyForFragment,
  encryptBytes,
  generateShareKeyBytes,
  serializeEnvelope,
} from '../../../src/domain/crypto'
import * as cryptoDomain from '../../../src/domain/crypto'
import { validatePsbtBase64 } from '../../../src/domain/psbt'
import { encodeSharePayload } from '../../../src/domain/sharePayload'
import { generateShareDeleteCapabilityToken } from '../../../src/domain/shareDeleteCapability'
import { createSamplePsbtBase64 } from '../../shared/psbtFixture'

const { getShareByIdMock, deleteShareByIdMock } = vi.hoisted(() => ({
  getShareByIdMock: vi.fn(),
  deleteShareByIdMock: vi.fn(),
}))

vi.mock('../../../src/infra/repositories/shareRepository', () => ({
  createShareRepository: () => ({
    getShareById: getShareByIdMock,
    deleteShareById: deleteShareByIdMock,
  }),
}))

async function createFragmentEncryptedShare(psbtBase64: string): Promise<{
  ciphertextPayload: string
  fragmentKey: string
}> {
  const validation = validatePsbtBase64(psbtBase64)
  if (!validation.ok) {
    throw new Error(validation.error.message)
  }

  const deleteCapabilityTokenResult = generateShareDeleteCapabilityToken()
  if (!deleteCapabilityTokenResult.ok) {
    throw new Error(deleteCapabilityTokenResult.error.message)
  }

  const encodedPayload = encodeSharePayload(validation.value, {
    deleteToken: deleteCapabilityTokenResult.value,
  })
  if (!encodedPayload.ok) {
    throw new Error(encodedPayload.error.message)
  }

  const keyBytes = generateShareKeyBytes()
  const fragmentResult = encodeShareKeyForFragment(keyBytes)
  if (!fragmentResult.ok) {
    throw new Error(fragmentResult.error.message)
  }

  const encryptedResult = await encryptBytes(encodedPayload.value.bytes, keyBytes)
  if (!encryptedResult.ok) {
    throw new Error(encryptedResult.error.message)
  }

  return {
    ciphertextPayload: serializeEnvelope(encryptedResult.value),
    fragmentKey: fragmentResult.value,
  }
}

async function createPasswordEncryptedShare(
  psbtBase64: string,
  password: string,
): Promise<string> {
  const validation = validatePsbtBase64(psbtBase64)
  if (!validation.ok) {
    throw new Error(validation.error.message)
  }

  const deleteCapabilityTokenResult = generateShareDeleteCapabilityToken()
  if (!deleteCapabilityTokenResult.ok) {
    throw new Error(deleteCapabilityTokenResult.error.message)
  }

  const encodedPayload = encodeSharePayload(validation.value, {
    deleteToken: deleteCapabilityTokenResult.value,
  })
  if (!encodedPayload.ok) {
    throw new Error(encodedPayload.error.message)
  }

  const keyDerivation = createPasswordKeyDerivation()
  if (!keyDerivation.ok) {
    throw new Error(keyDerivation.error.message)
  }

  const keyResult = await deriveShareKeyFromPassword(password, keyDerivation.value)
  if (!keyResult.ok) {
    throw new Error(keyResult.error.message)
  }

  const encryptedResult = await encryptBytes(encodedPayload.value.bytes, keyResult.value, {
    keyDerivation: keyDerivation.value,
  })
  if (!encryptedResult.ok) {
    throw new Error(encryptedResult.error.message)
  }

  return serializeEnvelope(encryptedResult.value)
}

describe('useFetch composable', () => {
  const samplePsbtBase64 = createSamplePsbtBase64()
  const validShareId = 'A1B2C3D4E5F6G7H8I9J0K1'

  beforeEach(() => {
    getShareByIdMock.mockReset()
    deleteShareByIdMock.mockReset()
    window.location.hash = ''
  })

  it('returns INVALID_SHARE_ID for malformed IDs', async () => {
    const fetcher = useFetch()
    await fetcher.fetchShare('bad-id')

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_SHARE_ID',
      }),
    )

    await fetcher.fetchShare('123e4567-e89b-12d3-a456-426614174000')
    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_SHARE_ID',
      }),
    )
  })

  it('returns INVALID_SHARE_ID when share id is empty after trimming', async () => {
    const fetcher = useFetch()
    await fetcher.fetchShare('   ')

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_SHARE_ID',
        message: 'Share ID is missing.',
      }),
    )
  })

  it('returns SHARE_NOT_FOUND when repository does not return a record', async () => {
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: null,
    })

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'SHARE_NOT_FOUND',
      }),
    )
  })

  it('maps repository misconfiguration to SUPABASE_NOT_CONFIGURED', async () => {
    getShareByIdMock.mockResolvedValue({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'missing env',
      },
    })

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'SUPABASE_NOT_CONFIGURED',
      }),
    )
  })

  it('maps generic repository fetch errors to FETCH_FAILED', async () => {
    getShareByIdMock.mockResolvedValue({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'FETCH_FAILED',
        message: 'fetch failed',
      },
    })

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'FETCH_FAILED',
      }),
    )
  })

  it('maps thrown fetch runtime errors to UNEXPECTED_ERROR', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    getShareByIdMock.mockRejectedValue(new Error('Repository is unavailable.'))

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'UNEXPECTED_ERROR',
      }),
    )
    consoleErrorSpy.mockRestore()
  })

  it('decrypts fragment-protected shares when hash key is present', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    window.location.hash = `#k=${encryptedShare.fragmentKey}`

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value.status).toBe('success')
    if (fetcher.state.value.status !== 'success') {
      return
    }

    expect(fetcher.state.value.psbtBase64).toBe(samplePsbtBase64)
    expect(fetcher.state.value.accessMode).toBe('fragment')
    expect(window.location.hash).toBe('')
  })

  it('returns MISSING_FRAGMENT_KEY when fragment share is opened without hash key', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'MISSING_FRAGMENT_KEY',
      }),
    )
  })

  it('returns INVALID_FRAGMENT_KEY when hash key payload is malformed', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    window.location.hash = '#k=not-valid-base64url!!'

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_FRAGMENT_KEY',
      }),
    )
  })

  it('returns INVALID_ENVELOPE when stored ciphertext payload is malformed', async () => {
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: '{"version":1}',
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    window.location.hash = '#k=abc'

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_ENVELOPE',
      }),
    )
  })

  it('removes fragment key while preserving unrelated hash params after success', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    window.location.hash = `#view=full&k=${encryptedShare.fragmentKey}`

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value.status).toBe('success')
    expect(window.location.hash).toBe('#view=full')
  })

  it('requests password and decrypts password-protected shares', async () => {
    const password = 'abc'
    const ciphertextPayload = await createPasswordEncryptedShare(samplePsbtBase64, password)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    expect(fetcher.state.value.status).toBe('awaiting_password')
    await fetcher.decryptWithPassword('   ')
    expect(fetcher.state.value.status).toBe('awaiting_password')
    if (fetcher.state.value.status === 'awaiting_password') {
      expect(fetcher.state.value.message).toBe('Password is required.')
    }

    await fetcher.decryptWithPassword('WrongPassword#2027')
    expect(fetcher.state.value.status).toBe('awaiting_password')
    if (fetcher.state.value.status === 'awaiting_password') {
      expect(fetcher.state.value.message).toContain('incorrect')
    }

    await fetcher.decryptWithPassword(password)
    expect(fetcher.state.value.status).toBe('success')
    if (fetcher.state.value.status !== 'success') {
      return
    }

    expect(fetcher.state.value.psbtBase64).toBe(samplePsbtBase64)
    expect(fetcher.state.value.accessMode).toBe('password')
  })

  it('fails password decryption when no pending password share exists', async () => {
    const fetcher = useFetch()
    await fetcher.decryptWithPassword('anything')

    expect(fetcher.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'UNEXPECTED_ERROR',
      }),
    )
  })

  it('maps password decryption runtime throws to awaiting password state', async () => {
    const password = 'abc'
    const ciphertextPayload = await createPasswordEncryptedShare(samplePsbtBase64, password)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })

    const deriveSpy = vi
      .spyOn(cryptoDomain, 'deriveShareKeyFromPassword')
      .mockRejectedValueOnce(new Error('PBKDF2 runtime failure'))
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)
    await fetcher.decryptWithPassword(password)

    expect(fetcher.state.value.status).toBe('awaiting_password')
    if (fetcher.state.value.status === 'awaiting_password') {
      expect(fetcher.state.value.message).toBe(
        'Unexpected error while decrypting with password.',
      )
    }

    deriveSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('returns MISSING_DELETE_CAPABILITY when delete is requested before decryption', async () => {
    const fetcher = useFetch()
    const result = await fetcher.deleteShare(validShareId)

    expect(result).toEqual({
      ok: false,
      code: 'MISSING_DELETE_CAPABILITY',
      message: 'Delete capability is not available for this share.',
    })
  })

  it('returns INVALID_SHARE_ID when delete is requested with malformed ID', async () => {
    const fetcher = useFetch()
    const result = await fetcher.deleteShare('bad-id')

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_SHARE_ID',
      message: 'Share ID has an invalid format.',
    })
  })

  it('deletes a share and forwards hashed delete capability', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    deleteShareByIdMock.mockResolvedValue({
      ok: true,
      value: true,
    })
    window.location.hash = `#k=${encryptedShare.fragmentKey}`

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)
    const result = await fetcher.deleteShare(validShareId)

    expect(result).toEqual({
      ok: true,
      deleted: true,
    })
    expect(deleteShareByIdMock).toHaveBeenCalledWith(
      validShareId,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    )
  })

  it('keeps delete capability when repository reports already-deleted share', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    window.location.hash = `#k=${encryptedShare.fragmentKey}`
    deleteShareByIdMock
      .mockResolvedValueOnce({
        ok: true,
        value: false,
      })
      .mockResolvedValueOnce({
        ok: true,
        value: true,
      })

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)
    const firstDeleteResult = await fetcher.deleteShare(validShareId)
    const secondDeleteResult = await fetcher.deleteShare(validShareId)

    expect(firstDeleteResult).toEqual({
      ok: true,
      deleted: false,
    })
    expect(secondDeleteResult).toEqual({
      ok: true,
      deleted: true,
    })
    expect(deleteShareByIdMock).toHaveBeenCalledTimes(2)
  })

  it('maps delete repository errors to user-facing delete error codes', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    window.location.hash = `#k=${encryptedShare.fragmentKey}`

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)

    deleteShareByIdMock.mockResolvedValueOnce({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'missing env',
      },
    })
    const configError = await fetcher.deleteShare(validShareId)
    expect(configError).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'SUPABASE_NOT_CONFIGURED',
      }),
    )

    deleteShareByIdMock.mockResolvedValueOnce({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'INVALID_DELETE_CAPABILITY',
        message: 'missing capability',
      },
    })
    const capabilityError = await fetcher.deleteShare(validShareId)
    expect(capabilityError).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'MISSING_DELETE_CAPABILITY',
      }),
    )

    deleteShareByIdMock.mockResolvedValueOnce({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'DELETE_FAILED',
        message: 'delete failed',
      },
    })
    const genericError = await fetcher.deleteShare(validShareId)
    expect(genericError).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'DELETE_FAILED',
      }),
    )
  })

  it('maps thrown delete runtime errors to UNEXPECTED_ERROR', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    deleteShareByIdMock.mockRejectedValue(new Error('network down'))
    window.location.hash = `#k=${encryptedShare.fragmentKey}`

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)
    const result = await fetcher.deleteShare(validShareId)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'UNEXPECTED_ERROR',
      }),
    )
  })

  it('reset clears state and active delete capability', async () => {
    const encryptedShare = await createFragmentEncryptedShare(samplePsbtBase64)
    getShareByIdMock.mockResolvedValue({
      ok: true,
      value: {
        id: validShareId,
        ciphertextPayload: encryptedShare.ciphertextPayload,
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
    window.location.hash = `#k=${encryptedShare.fragmentKey}`

    const fetcher = useFetch()
    await fetcher.fetchShare(validShareId)
    expect(fetcher.state.value.status).toBe('success')

    fetcher.reset()
    expect(fetcher.state.value).toEqual({ status: 'idle' })

    const deleteResult = await fetcher.deleteShare(validShareId)
    expect(deleteResult).toEqual({
      ok: false,
      code: 'MISSING_DELETE_CAPABILITY',
      message: 'Delete capability is not available for this share.',
    })
  })
})
