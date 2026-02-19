import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useShareStatus } from '../../../../src/composables/share/useShareStatus'
import type { FetchState } from '../../../../src/composables/useFetch'

describe('useShareStatus', () => {
  it('maps fetch states to severity labels and status copy', () => {
    const fetchState = ref<FetchState>({ status: 'idle' })
    const hasFragmentKey = ref(false)
    const { statusSeverity, statusLabel, isLoading, isAwaitingPassword } = useShareStatus(
      fetchState,
      hasFragmentKey,
    )

    expect(statusSeverity.value).toBe('secondary')
    expect(statusLabel.value).toBe('Waiting for share ID')
    expect(isLoading.value).toBe(false)
    expect(isAwaitingPassword.value).toBe(false)

    fetchState.value = { status: 'loading' }
    expect(statusSeverity.value).toBe('info')
    expect(statusLabel.value).toBe('Loading encrypted payload')
    expect(isLoading.value).toBe(true)

    fetchState.value = {
      status: 'awaiting_password',
      shareId: 'abc',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      message: null,
    }
    expect(statusSeverity.value).toBe('warn')
    expect(statusLabel.value).toBe('Password required')
    expect(isAwaitingPassword.value).toBe(true)

    fetchState.value = {
      status: 'success',
      shareId: 'abc',
      psbtBase64: 'cHNidA==',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      accessMode: 'fragment',
    }
    expect(statusSeverity.value).toBe('success')
    expect(statusLabel.value).toBe('Decryption successful')

    fetchState.value = {
      status: 'error',
      code: 'INVALID_SHARE_ID',
      message: 'Bad id',
    }
    expect(statusSeverity.value).toBe('danger')
    expect(statusLabel.value).toBe('Decryption unavailable')
  })

  it('builds credential tag and prompt/error helpers', () => {
    const fetchState = ref<FetchState>({
      status: 'awaiting_password',
      shareId: 'abc',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      message: '',
    })
    const hasFragmentKey = ref(false)
    const {
      credentialStatusTag,
      passwordPromptMessage,
      fetchErrorPresentation,
      emptyStateMessage,
    } = useShareStatus(fetchState, hasFragmentKey)

    expect(credentialStatusTag.value).toEqual({
      severity: 'info',
      value: 'Password-protected',
    })
    expect(passwordPromptMessage.value).toContain('Enter the decryption password')

    fetchState.value = {
      status: 'success',
      shareId: 'abc',
      psbtBase64: 'cHNidA==',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      accessMode: 'password',
    }
    expect(credentialStatusTag.value).toEqual({
      severity: 'success',
      value: 'Password mode',
    })

    fetchState.value = {
      status: 'success',
      shareId: 'abc',
      psbtBase64: 'cHNidA==',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      accessMode: 'fragment',
    }
    hasFragmentKey.value = true
    expect(credentialStatusTag.value).toEqual({
      severity: 'success',
      value: 'Fragment key present',
    })

    hasFragmentKey.value = false
    expect(credentialStatusTag.value).toEqual({
      severity: 'info',
      value: 'Missing fragment key (#k=...)',
    })

    fetchState.value = {
      status: 'error',
      code: 'INVALID_SHARE_ID',
      message: 'Bad id',
    }
    expect(fetchErrorPresentation.value).not.toBeNull()
    expect(emptyStateMessage.value).toBe(fetchErrorPresentation.value?.retryHint)
  })

  it('prefers explicit password prompt message and default empty-state fallback', () => {
    const fetchState = ref<FetchState>({
      status: 'awaiting_password',
      shareId: 'abc',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      message: 'Use signer-provided passphrase only.',
    })
    const hasFragmentKey = ref(true)
    const { passwordPromptMessage, emptyStateMessage, fetchErrorPresentation } = useShareStatus(
      fetchState,
      hasFragmentKey,
    )

    expect(passwordPromptMessage.value).toBe('Use signer-provided passphrase only.')
    expect(fetchErrorPresentation.value).toBeNull()
    expect(emptyStateMessage.value).toBe('Unable to open this share right now.')
  })
})
