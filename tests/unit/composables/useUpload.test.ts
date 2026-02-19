/**
 * Unit coverage for upload orchestration and error mapping.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpload } from '../../../src/composables/useUpload'
import * as cryptoDomain from '../../../src/domain/crypto'
import * as sharePayloadDomain from '../../../src/domain/sharePayload'
import * as deleteCapabilityDomain from '../../../src/domain/shareDeleteCapability'
import { createSamplePsbtBase64 } from '../../shared/psbtFixture'

const { insertShareMock, isSupabaseConfiguredMock } = vi.hoisted(() => ({
  insertShareMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(() => true),
}))

vi.mock('../../../src/infra/repositories/shareRepository', () => ({
  createShareRepository: () => ({
    insertShare: insertShareMock,
  }),
}))

vi.mock('../../../src/infra/supabaseClient', () => ({
  isSupabaseConfigured: () => isSupabaseConfiguredMock(),
}))

describe('useUpload composable', () => {
  const samplePsbtBase64 = createSamplePsbtBase64()
  const RATE_LIMIT_STORAGE_KEY = 'psbthub:share-creation-attempts'

  beforeEach(() => {
    insertShareMock.mockReset()
    isSupabaseConfiguredMock.mockReset()
    isSupabaseConfiguredMock.mockReturnValue(true)
    window.localStorage.removeItem(RATE_LIMIT_STORAGE_KEY)
    insertShareMock.mockResolvedValue({
      ok: true,
      value: {
        id: 'share-id',
        ciphertextPayload: 'cipher',
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: '2026-03-01T00:00:00.000Z',
      },
    })
  })

  it('reports INVALID_PSBT when payload cannot be parsed', async () => {
    const upload = useUpload()
    await upload.createShareLink('not-a-psbt', new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_PSBT',
      }),
    )
  })

  it('reports INVALID_EXPIRY when expiry date is missing', async () => {
    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, null, {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_EXPIRY',
      }),
    )
  })

  it('reports EXPIRY_TOO_SOON and EXPIRY_TOO_LATE for out-of-policy expiries', async () => {
    const upload = useUpload()

    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 5_000), {
      mode: 'link_fragment',
    })
    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'EXPIRY_TOO_SOON',
      }),
    )

    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), {
      mode: 'link_fragment',
    })
    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'EXPIRY_TOO_LATE',
      }),
    )
  })

  it('reports INVALID_PASSWORD in password mode when password missing', async () => {
    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'password',
      password: '   ',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_PASSWORD',
      }),
    )
  })

  it('creates a share in fragment mode and returns URL with key fragment', async () => {
    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value.status).toBe('success')
    if (upload.state.value.status !== 'success') {
      return
    }

    expect(upload.state.value.securityMode).toBe('link_fragment')
    expect(upload.state.value.shareId).toMatch(/^[A-Za-z0-9]{22}$/)
    expect(upload.state.value.shareId).not.toMatch(/[-_]/)
    expect(upload.state.value.shareUrl).toContain(`/p/${upload.state.value.shareId}`)
    expect(upload.state.value.shareUrl).toContain('/p/')
    expect(upload.state.value.shareUrl).toContain('#k=')
    expect(upload.state.value.decryptionPassword).toBeNull()
    expect(insertShareMock).toHaveBeenCalledTimes(1)
    expect(insertShareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    )
  })

  it('creates a share in password mode and stores password in success state', async () => {
    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'password',
      password: 'abc',
    })

    expect(upload.state.value.status).toBe('success')
    if (upload.state.value.status !== 'success') {
      return
    }

    expect(upload.state.value.securityMode).toBe('password')
    expect(upload.state.value.shareId).toMatch(/^[A-Za-z0-9]{22}$/)
    expect(upload.state.value.shareId).not.toMatch(/[-_]/)
    expect(upload.state.value.shareUrl).toContain(`/p/${upload.state.value.shareId}`)
    expect(upload.state.value.decryptionPassword).toBe('abc')
    expect(upload.state.value.shareUrl).not.toContain('#k=')
    expect(insertShareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    )
  })

  it('maps repository misconfiguration to SUPABASE_NOT_CONFIGURED', async () => {
    insertShareMock.mockResolvedValue({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'not configured',
      },
    })

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'SUPABASE_NOT_CONFIGURED',
      }),
    )
  })

  it('maps server-side repository throttling to RATE_LIMITED', async () => {
    insertShareMock.mockResolvedValue({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'RATE_LIMITED',
        message: 'Too many share creation requests in a short time. Please retry in about one minute.',
      },
    })

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'RATE_LIMITED',
      }),
    )
  })

  it('maps generic repository insert failures to STORE_FAILED', async () => {
    insertShareMock.mockResolvedValue({
      ok: false,
      error: {
        kind: 'share_repository_error',
        code: 'INSERT_FAILED',
        message: 'Insert failed.',
      },
    })

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'STORE_FAILED',
      }),
    )
  })

  it('returns RATE_LIMITED when local browser quota is exceeded', async () => {
    const now = Date.now()
    const attempts = Array.from({ length: 6 }, (_, index) => now - index * 1_000)
    window.localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(attempts))

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'RATE_LIMITED',
      }),
    )
    expect(insertShareMock).not.toHaveBeenCalled()
  })

  it('maps thrown runtime errors to UNEXPECTED_ERROR', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    insertShareMock.mockRejectedValue(new Error('Unexpected storage failure.'))

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'UNEXPECTED_ERROR',
      }),
    )
    consoleErrorSpy.mockRestore()
  })

  it('maps encryption-stage errors to ENCRYPTION_FAILED', async () => {
    const encryptSpy = vi
      .spyOn(cryptoDomain, 'encryptBytes')
      .mockResolvedValueOnce({
        ok: false,
        error: {
          kind: 'crypto_error',
          code: 'DECRYPTION_FAILED',
          message: 'Encryption failed.',
        },
      } as never)

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'ENCRYPTION_FAILED',
      }),
    )

    encryptSpy.mockRestore()
  })

  it('maps delete capability hash failures to ENCRYPTION_FAILED', async () => {
    const hashSpy = vi
      .spyOn(deleteCapabilityDomain, 'hashShareDeleteCapabilityToken')
      .mockResolvedValueOnce({
        ok: false,
        error: {
          kind: 'share_delete_capability_error',
          code: 'HASH_FAILED',
          message: 'hash failed',
        },
      } as never)

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'ENCRYPTION_FAILED',
      }),
    )

    hashSpy.mockRestore()
  })

  it('maps delete capability token generation webcrypto failures to ENCRYPTION_FAILED', async () => {
    const tokenSpy = vi
      .spyOn(deleteCapabilityDomain, 'generateShareDeleteCapabilityToken')
      .mockReturnValueOnce({
        ok: false,
        error: {
          kind: 'share_delete_capability_error',
          code: 'WEB_CRYPTO_UNAVAILABLE',
          message: 'webcrypto unavailable',
        },
      } as never)

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'ENCRYPTION_FAILED',
        message: 'WebCrypto API is not available for share capability generation.',
      }),
    )

    tokenSpy.mockRestore()
  })

  it('maps payload encoding errors to INVALID_PSBT when payload parser flags invalid PSBT', async () => {
    const payloadSpy = vi
      .spyOn(sharePayloadDomain, 'encodeSharePayload')
      .mockReturnValueOnce({
        ok: false,
        error: {
          kind: 'share_payload_error',
          code: 'INVALID_PSBT',
          message: 'invalid psbt payload',
        },
      } as never)

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'INVALID_PSBT',
      }),
    )

    payloadSpy.mockRestore()
  })

  it('maps password key derivation failures to ENCRYPTION_FAILED', async () => {
    const deriveSpy = vi
      .spyOn(cryptoDomain, 'deriveShareKeyFromPassword')
      .mockResolvedValueOnce({
        ok: false,
        error: {
          kind: 'crypto_error',
          code: 'KEY_DERIVATION_FAILED',
          message: 'PBKDF2 derivation failed',
        },
      } as never)

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'password',
      password: 'abc',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'ENCRYPTION_FAILED',
      }),
    )

    deriveSpy.mockRestore()
  })

  it('maps obfuscated size masking errors to ENCRYPTION_FAILED', async () => {
    const sizeMaskSpy = vi
      .spyOn(sharePayloadDomain, 'createObfuscatedSizeBytes')
      .mockReturnValueOnce({
        ok: false,
        error: {
          kind: 'share_payload_error',
          code: 'INVALID_PAYLOAD',
          message: 'masking failed',
        },
      } as never)

    const upload = useUpload()
    await upload.createShareLink(samplePsbtBase64, new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value).toEqual(
      expect.objectContaining({
        status: 'error',
        code: 'ENCRYPTION_FAILED',
      }),
    )

    sizeMaskSpy.mockRestore()
  })

  it('reflects Supabase availability state', () => {
    isSupabaseConfiguredMock.mockReturnValue(false)
    const upload = useUpload()

    expect(upload.isSupabaseReady.value).toBe(false)
  })

  it('resets state back to idle', async () => {
    const upload = useUpload()
    await upload.createShareLink('bad-psbt', new Date(Date.now() + 60_000), {
      mode: 'link_fragment',
    })

    expect(upload.state.value.status).toBe('error')
    upload.reset()
    expect(upload.state.value).toEqual({ status: 'idle' })
  })
})
