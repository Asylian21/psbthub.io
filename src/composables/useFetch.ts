/**
 * Share retrieval orchestration composable.
 *
 * Handles encrypted share fetch, fragment/password decryption flows,
 * and manual share deletion via repository RPC.
 */
import { ref, type Ref } from 'vue'
import {
  decodeShareKeyFromFragment,
  decryptBytes,
  deriveShareKeyFromPassword,
  isPasswordProtectedEnvelope,
  parseEnvelope,
  type CryptoError,
  type EncryptionEnvelopeV1,
} from '../domain/crypto'
import { decodeSharePayload, type SharePayloadError } from '../domain/sharePayload'
import { isValidShareId } from '../domain/shareId'
import { hashShareDeleteCapabilityToken } from '../domain/shareDeleteCapability'
import { normalizeSharePassword } from '../domain/sharePassword'
import {
  createShareRepository,
  type ShareRepositoryError,
} from '../infra/repositories/shareRepository'
import { sanitizeObservabilityMessage } from '../infra/observability/errorMonitoring'

export type FetchErrorCode =
  | 'INVALID_SHARE_ID'
  | 'SUPABASE_NOT_CONFIGURED'
  | 'FETCH_FAILED'
  | 'SHARE_NOT_FOUND'
  | 'MISSING_FRAGMENT_KEY'
  | 'INVALID_FRAGMENT_KEY'
  | 'INVALID_ENVELOPE'
  | 'DECRYPTION_FAILED'
  | 'INVALID_PAYLOAD'
  | 'INVALID_PSBT'
  | 'UNEXPECTED_ERROR'

export type DeleteShareErrorCode =
  | 'INVALID_SHARE_ID'
  | 'MISSING_DELETE_CAPABILITY'
  | 'SUPABASE_NOT_CONFIGURED'
  | 'DELETE_FAILED'
  | 'UNEXPECTED_ERROR'

export type DeleteShareResult =
  | {
      ok: true
      deleted: boolean
    }
  | {
      ok: false
      code: DeleteShareErrorCode
      message: string
    }

export type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'awaiting_password'
      shareId: string
      createdAt: string
      expiresAt: string | null
      message: string | null
    }
  | {
      status: 'success'
      shareId: string
      psbtBase64: string
      createdAt: string
      expiresAt: string | null
      accessMode: 'fragment' | 'password'
    }
  | {
      status: 'error'
      code: FetchErrorCode
      message: string
    }

export interface UseFetch {
  state: Ref<FetchState>
  fetchShare(shareId: string): Promise<void>
  decryptWithPassword(password: string): Promise<void>
  deleteShare(shareId: string): Promise<DeleteShareResult>
  reset(): void
}

const shareRepository = createShareRepository()
const FRAGMENT_KEY_PARAM = 'k'

interface PasswordPendingShare {
  shareId: string
  createdAt: string
  expiresAt: string | null
  envelope: EncryptionEnvelopeV1
}

interface DecryptEnvelopeResult {
  state: FetchState
  deleteCapabilityHash: string | null
}

function toFetchError(code: FetchErrorCode, message: string): FetchState {
  return {
    status: 'error',
    code,
    message,
  }
}

function normalizeUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'number' || typeof error === 'boolean') {
    return String(error)
  }

  return 'Unknown runtime error'
}

function reportUnexpectedError(scope: string, error: unknown): void {
  if (!import.meta.env.DEV) {
    return
  }

  const normalizedMessage = sanitizeObservabilityMessage(
    normalizeUnknownErrorMessage(error),
  )
  console.error(`[useFetch:${scope}] ${normalizedMessage}`, error)
}

function extractFragmentKey(): string | null {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  if (!hash) {
    return null
  }

  const params = new URLSearchParams(hash)
  return params.get(FRAGMENT_KEY_PARAM)
}

function clearFragmentKeyFromUrlHash(): void {
  try {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash

    if (!hash) {
      return
    }

    const hashParams = new URLSearchParams(hash)

    if (!hashParams.has(FRAGMENT_KEY_PARAM)) {
      return
    }

    hashParams.delete(FRAGMENT_KEY_PARAM)
    const nextHash = hashParams.toString()
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`
    window.history.replaceState(window.history.state, '', nextUrl)
  } catch (error: unknown) {
    reportUnexpectedError('clearFragmentKeyFromUrlHash', error)
  }
}

function mapRepositoryError(error: ShareRepositoryError): FetchState {
  if (error.code === 'SUPABASE_NOT_CONFIGURED') {
    return toFetchError(
      'SUPABASE_NOT_CONFIGURED',
      'Supabase environment variables are not configured.',
    )
  }

  return toFetchError('FETCH_FAILED', 'Unable to fetch encrypted PSBT payload.')
}

function mapCryptoError(error: CryptoError, mode: 'fragment' | 'password'): FetchState {
  if (error.code === 'INVALID_FRAGMENT_KEY') {
    return toFetchError(
      'INVALID_FRAGMENT_KEY',
      'Fragment key is missing or invalid.',
    )
  }

  if (error.code === 'INVALID_ENVELOPE') {
    return toFetchError(
      'INVALID_ENVELOPE',
      'Stored encrypted payload has an invalid format.',
    )
  }

  if (
    error.code === 'INVALID_PASSWORD' ||
    error.code === 'INVALID_KEY_DERIVATION' ||
    error.code === 'KEY_DERIVATION_FAILED'
  ) {
    return toFetchError(
      'DECRYPTION_FAILED',
      mode === 'password'
        ? 'Unable to derive a decryption key from provided password.'
        : 'Unable to derive a valid decryption key from URL fragment.',
    )
  }

  if (error.code === 'DECRYPTION_FAILED') {
    return toFetchError(
      'DECRYPTION_FAILED',
      mode === 'password'
        ? 'Unable to decrypt PSBT with the provided password.'
        : 'Unable to decrypt PSBT with the provided fragment key.',
    )
  }

  return toFetchError('DECRYPTION_FAILED', 'Unable to decrypt PSBT payload.')
}

function mapSharePayloadError(error: SharePayloadError): FetchState {
  if (error.code === 'INVALID_PSBT') {
    return toFetchError(
      'INVALID_PSBT',
      'Decrypted payload does not contain a valid PSBT.',
    )
  }

  return toFetchError(
    'INVALID_PAYLOAD',
    'Decrypted payload has an invalid structure or unsupported format.',
  )
}

function toAwaitingPasswordState(
  pendingShare: PasswordPendingShare,
  message: string | null,
): FetchState {
  return {
    status: 'awaiting_password',
    shareId: pendingShare.shareId,
    createdAt: pendingShare.createdAt,
    expiresAt: pendingShare.expiresAt,
    message,
  }
}

async function decryptEnvelopeToState(
  envelope: EncryptionEnvelopeV1,
  shareId: string,
  createdAt: string,
  expiresAt: string | null,
  keyBytes: Uint8Array,
  mode: 'fragment' | 'password',
): Promise<DecryptEnvelopeResult> {
  const decryptedResult = await decryptBytes(envelope, keyBytes)

  if (!decryptedResult.ok) {
    return {
      state: mapCryptoError(decryptedResult.error, mode),
      deleteCapabilityHash: null,
    }
  }

  const decodedPayloadResult = decodeSharePayload(decryptedResult.value)

  if (!decodedPayloadResult.ok) {
    return {
      state: mapSharePayloadError(decodedPayloadResult.error),
      deleteCapabilityHash: null,
    }
  }

  let deleteCapabilityHash: string | null = null

  if (decodedPayloadResult.value.deleteToken) {
    const deleteCapabilityHashResult = await hashShareDeleteCapabilityToken(
      decodedPayloadResult.value.deleteToken,
    )

    if (!deleteCapabilityHashResult.ok) {
      return {
        state: toFetchError(
          'INVALID_PAYLOAD',
          'Decrypted payload has invalid delete capability metadata.',
        ),
        deleteCapabilityHash: null,
      }
    }

    deleteCapabilityHash = deleteCapabilityHashResult.value
  }

  return {
    state: {
      status: 'success',
      shareId,
      psbtBase64: decodedPayloadResult.value.psbtBase64,
      createdAt,
      expiresAt,
      accessMode: mode,
    },
    deleteCapabilityHash,
  }
}

export function useFetch(): UseFetch {
  const state = ref<FetchState>({ status: 'idle' })
  const passwordPendingShare = ref<PasswordPendingShare | null>(null)
  const activeDeleteCapabilityShareId = ref<string | null>(null)
  const activeDeleteCapabilityHash = ref<string | null>(null)

  function clearActiveDeleteCapability(): void {
    activeDeleteCapabilityShareId.value = null
    activeDeleteCapabilityHash.value = null
  }

  function setActiveDeleteCapability(
    shareId: string,
    deleteCapabilityHash: string | null,
  ): void {
    if (!deleteCapabilityHash) {
      clearActiveDeleteCapability()
      return
    }

    activeDeleteCapabilityShareId.value = shareId
    activeDeleteCapabilityHash.value = deleteCapabilityHash
  }

  /**
   * Fetches a share by ID and resolves whether fragment or password mode is required.
   */
  async function fetchShare(shareId: string): Promise<void> {
    const normalizedShareId = shareId.trim()

    if (!normalizedShareId) {
      state.value = toFetchError('INVALID_SHARE_ID', 'Share ID is missing.')
      return
    }

    if (!isValidShareId(normalizedShareId)) {
      state.value = toFetchError('INVALID_SHARE_ID', 'Share ID has an invalid format.')
      return
    }

    state.value = { status: 'loading' }
    passwordPendingShare.value = null
    clearActiveDeleteCapability()

    try {
      const repositoryResult = await shareRepository.getShareById(normalizedShareId)

      if (!repositoryResult.ok) {
        state.value = mapRepositoryError(repositoryResult.error)
        return
      }

      if (!repositoryResult.value) {
        state.value = toFetchError(
          'SHARE_NOT_FOUND',
          'Share was not found or has expired.',
        )
        return
      }

      const envelopeResult = parseEnvelope(repositoryResult.value.ciphertextPayload)

      if (!envelopeResult.ok) {
        state.value = mapCryptoError(envelopeResult.error, 'fragment')
        return
      }

      if (isPasswordProtectedEnvelope(envelopeResult.value)) {
        const pendingShare: PasswordPendingShare = {
          shareId: normalizedShareId,
          createdAt: repositoryResult.value.createdAt,
          expiresAt: repositoryResult.value.expiresAt,
          envelope: envelopeResult.value,
        }

        passwordPendingShare.value = pendingShare
        state.value = toAwaitingPasswordState(pendingShare, null)
        return
      }

      const fragmentKey = extractFragmentKey()

      if (!fragmentKey) {
        state.value = toFetchError(
          'MISSING_FRAGMENT_KEY',
          'Missing fragment key in URL hash.',
        )
        return
      }

      const decodedKeyResult = decodeShareKeyFromFragment(fragmentKey)

      if (!decodedKeyResult.ok) {
        state.value = mapCryptoError(decodedKeyResult.error, 'fragment')
        return
      }

      const decryptedStateResult = await decryptEnvelopeToState(
        envelopeResult.value,
        normalizedShareId,
        repositoryResult.value.createdAt,
        repositoryResult.value.expiresAt,
        decodedKeyResult.value,
        'fragment',
      )

      state.value = decryptedStateResult.state

      if (decryptedStateResult.state.status === 'success') {
        setActiveDeleteCapability(
          normalizedShareId,
          decryptedStateResult.deleteCapabilityHash,
        )
        clearFragmentKeyFromUrlHash()
      }
    } catch (error: unknown) {
      reportUnexpectedError('fetchShare', error)
      state.value = toFetchError(
        'UNEXPECTED_ERROR',
        'Unexpected error while loading shared PSBT.',
      )
    }
  }

  /**
   * Attempts password-based decryption for a previously fetched password-protected share.
   */
  async function decryptWithPassword(password: string): Promise<void> {
    if (!passwordPendingShare.value) {
      state.value = toFetchError(
        'UNEXPECTED_ERROR',
        'No password-protected share is currently loaded.',
      )
      return
    }

    const pendingShare = passwordPendingShare.value
    const normalizedPassword = normalizeSharePassword(password)

    if (!normalizedPassword) {
      state.value = toAwaitingPasswordState(pendingShare, 'Password is required.')
      return
    }

    if (!isPasswordProtectedEnvelope(pendingShare.envelope)) {
      state.value = toFetchError(
        'INVALID_ENVELOPE',
        'Stored encrypted payload is missing password derivation metadata.',
      )
      return
    }

    state.value = { status: 'loading' }

    try {
      const passwordKeyResult = await deriveShareKeyFromPassword(
        normalizedPassword,
        pendingShare.envelope.keyDerivation,
      )

      if (!passwordKeyResult.ok) {
        const passwordKeyErrorState = mapCryptoError(passwordKeyResult.error, 'password')
        state.value = toAwaitingPasswordState(
          pendingShare,
          passwordKeyErrorState.status === 'error'
            ? passwordKeyErrorState.message
            : 'Unable to decrypt this share with provided password.',
        )
        return
      }

      const decryptionResult = await decryptEnvelopeToState(
        pendingShare.envelope,
        pendingShare.shareId,
        pendingShare.createdAt,
        pendingShare.expiresAt,
        passwordKeyResult.value,
        'password',
      )

      if (
        decryptionResult.state.status === 'error' &&
        decryptionResult.state.code === 'DECRYPTION_FAILED'
      ) {
        state.value = toAwaitingPasswordState(
          pendingShare,
          'Password is incorrect or does not match this share.',
        )
        return
      }

      state.value = decryptionResult.state

      if (decryptionResult.state.status === 'success') {
        setActiveDeleteCapability(
          pendingShare.shareId,
          decryptionResult.deleteCapabilityHash,
        )
        passwordPendingShare.value = null
      }
    } catch (error: unknown) {
      reportUnexpectedError('decryptWithPassword', error)
      state.value = toAwaitingPasswordState(
        pendingShare,
        'Unexpected error while decrypting with password.',
      )
    }
  }

  /**
   * Requests immediate server-side deletion of a share by ID.
   */
  async function deleteShare(shareId: string): Promise<DeleteShareResult> {
    const normalizedShareId = shareId.trim()

    if (!normalizedShareId || !isValidShareId(normalizedShareId)) {
      return {
        ok: false,
        code: 'INVALID_SHARE_ID',
        message: 'Share ID has an invalid format.',
      }
    }

    if (
      activeDeleteCapabilityShareId.value !== normalizedShareId ||
      !activeDeleteCapabilityHash.value
    ) {
      return {
        ok: false,
        code: 'MISSING_DELETE_CAPABILITY',
        message: 'Delete capability is not available for this share.',
      }
    }

    try {
      const deleteResult = await shareRepository.deleteShareById(
        normalizedShareId,
        activeDeleteCapabilityHash.value,
      )

      if (!deleteResult.ok) {
        if (deleteResult.error.code === 'SUPABASE_NOT_CONFIGURED') {
          return {
            ok: false,
            code: 'SUPABASE_NOT_CONFIGURED',
            message: 'Supabase environment variables are not configured.',
          }
        }

        if (deleteResult.error.code === 'INVALID_DELETE_CAPABILITY') {
          return {
            ok: false,
            code: 'MISSING_DELETE_CAPABILITY',
            message: 'Delete capability is not available for this share.',
          }
        }

        return {
          ok: false,
          code: 'DELETE_FAILED',
          message: 'Unable to delete shared PSBT payload.',
        }
      }

      if (deleteResult.value) {
        clearActiveDeleteCapability()
      }

      return {
        ok: true,
        deleted: deleteResult.value,
      }
    } catch (error: unknown) {
      reportUnexpectedError('deleteShare', error)
      return {
        ok: false,
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected error while deleting shared PSBT payload.',
      }
    }
  }

  /**
   * Resets fetch/decrypt state back to idle.
   */
  function reset(): void {
    state.value = { status: 'idle' }
    passwordPendingShare.value = null
    clearActiveDeleteCapability()
  }

  return {
    state,
    fetchShare,
    decryptWithPassword,
    deleteShare,
    reset,
  }
}
