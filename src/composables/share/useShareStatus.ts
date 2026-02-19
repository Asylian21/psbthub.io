import { computed, type ComputedRef, type Ref } from 'vue'
import {
  SHARE_FETCH_ERROR_PRESENTATIONS,
  type FetchErrorPresentationContent,
} from '../../content/shareContent'
import type { FetchState } from '../useFetch'

export interface CredentialStatusTag {
  severity: 'success' | 'warn' | 'info'
  value: string
}

export type ShareStatusSeverity = 'secondary' | 'info' | 'warn' | 'danger' | 'success'

export interface UseShareStatus {
  isAwaitingPassword: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  statusSeverity: ComputedRef<ShareStatusSeverity>
  statusLabel: ComputedRef<string>
  credentialStatusTag: ComputedRef<CredentialStatusTag>
  fetchErrorPresentation: ComputedRef<FetchErrorPresentationContent | null>
  passwordPromptMessage: ComputedRef<string>
  emptyStateMessage: ComputedRef<string>
}

/**
 * UI-facing status derivations for share decrypt flow.
 */
export function useShareStatus(
  fetchState: Ref<FetchState>,
  hasFragmentKey: Ref<boolean>,
): UseShareStatus {
  const isAwaitingPassword = computed<boolean>(
    () => fetchState.value.status === 'awaiting_password',
  )
  const isLoading = computed<boolean>(() => fetchState.value.status === 'loading')

  const statusSeverity = computed<ShareStatusSeverity>(() => {
    if (fetchState.value.status === 'success') {
      return 'success'
    }

    if (fetchState.value.status === 'awaiting_password') {
      return 'warn'
    }

    if (fetchState.value.status === 'error') {
      return 'danger'
    }

    if (fetchState.value.status === 'loading') {
      return 'info'
    }

    return 'secondary'
  })

  const statusLabel = computed<string>(() => {
    if (fetchState.value.status === 'success') {
      return 'Decryption successful'
    }

    if (fetchState.value.status === 'awaiting_password') {
      return 'Password required'
    }

    if (fetchState.value.status === 'error') {
      return 'Decryption unavailable'
    }

    if (fetchState.value.status === 'loading') {
      return 'Loading encrypted payload'
    }

    return 'Waiting for share ID'
  })

  const credentialStatusTag = computed<CredentialStatusTag>(() => {
    if (fetchState.value.status === 'awaiting_password') {
      return {
        severity: 'info',
        value: 'Password-protected',
      }
    }

    if (fetchState.value.status === 'success' && fetchState.value.accessMode === 'password') {
      return {
        severity: 'success',
        value: 'Password mode',
      }
    }

    if (hasFragmentKey.value) {
      return {
        severity: 'success',
        value: 'Fragment key present',
      }
    }

    return {
      severity: 'info',
      value: 'Missing fragment key (#k=...)',
    }
  })

  const fetchErrorPresentation = computed<FetchErrorPresentationContent | null>(() => {
    if (fetchState.value.status !== 'error') {
      return null
    }

    return SHARE_FETCH_ERROR_PRESENTATIONS[fetchState.value.code]
  })

  const passwordPromptMessage = computed<string>(() => {
    if (fetchState.value.status !== 'awaiting_password') {
      return ''
    }

    if (fetchState.value.message) {
      return fetchState.value.message
    }

    return 'Enter the decryption password from the sender to open this share.'
  })

  const emptyStateMessage = computed<string>(() => {
    if (fetchErrorPresentation.value) {
      return fetchErrorPresentation.value.retryHint
    }

    return 'Unable to open this share right now.'
  })

  return {
    isAwaitingPassword,
    isLoading,
    statusSeverity,
    statusLabel,
    credentialStatusTag,
    fetchErrorPresentation,
    passwordPromptMessage,
    emptyStateMessage,
  }
}
