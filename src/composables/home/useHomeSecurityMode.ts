/**
 * Home security-mode orchestration.
 *
 * Centralizes default mode selection, password generation behavior,
 * one-link risk acknowledgement, and mode-specific reset side effects.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { generateSharePassword } from '../../domain/sharePassword'
import type { ShareSecurityMode } from '../useUpload'

interface PasswordGeneratorResult {
  ok: boolean
  value?: string
  error?: {
    message: string
  }
}

interface UseHomeSecurityModeOptions {
  onSecurityStateChanged: () => void
  onSecurityError: (message: string) => void
  generatePassword?: () => PasswordGeneratorResult
}

export interface UseHomeSecurityMode {
  selectedShareSecurityMode: Ref<ShareSecurityMode>
  sharePasswordInput: Ref<string>
  hasAcknowledgedFragmentModeRisk: Ref<boolean>
  isPasswordSecurityMode: ComputedRef<boolean>
  isFragmentModeAcknowledged: ComputedRef<boolean>
  generateAndApplySharePassword(): void
  clearSharePassword(): void
  resetShareSecuritySelection(): void
}

function generatePasswordOrEmpty(
  generatePassword: () => PasswordGeneratorResult,
): string {
  const generatedPasswordResult = generatePassword()
  if (!generatedPasswordResult.ok || !generatedPasswordResult.value) {
    return ''
  }

  return generatedPasswordResult.value
}

export function useHomeSecurityMode(
  options: UseHomeSecurityModeOptions,
): UseHomeSecurityMode {
  const generatePassword = options.generatePassword ?? (() => generateSharePassword())
  const selectedShareSecurityMode = ref<ShareSecurityMode>('password')
  const sharePasswordInput = ref('')
  const hasAcknowledgedFragmentModeRisk = ref(false)
  const isPasswordSecurityMode = computed<boolean>(
    () => selectedShareSecurityMode.value === 'password',
  )
  const isFragmentModeAcknowledged = computed<boolean>(() => {
    return (
      selectedShareSecurityMode.value !== 'link_fragment' ||
      hasAcknowledgedFragmentModeRisk.value
    )
  })

  function generateAndApplySharePassword(): void {
    const generatedPasswordResult = generatePassword()

    if (!generatedPasswordResult.ok || !generatedPasswordResult.value) {
      const errorMessageFromResult =
        'error' in generatedPasswordResult &&
        generatedPasswordResult.error &&
        typeof generatedPasswordResult.error.message === 'string'
          ? generatedPasswordResult.error.message
          : null
      const errorMessage =
        errorMessageFromResult ??
        'Unable to generate a secure share password.'
      options.onSecurityError(errorMessage)
      return
    }

    sharePasswordInput.value = generatedPasswordResult.value
    options.onSecurityStateChanged()
  }

  function clearSharePassword(): void {
    sharePasswordInput.value = ''
    options.onSecurityStateChanged()
  }

  function resetShareSecuritySelection(): void {
    selectedShareSecurityMode.value = 'password'
    hasAcknowledgedFragmentModeRisk.value = false
    sharePasswordInput.value = generatePasswordOrEmpty(generatePassword)
  }

  watch(
    selectedShareSecurityMode,
    (nextMode) => {
      options.onSecurityStateChanged()
      hasAcknowledgedFragmentModeRisk.value = false

      if (nextMode === 'password' && !sharePasswordInput.value) {
        generateAndApplySharePassword()
        return
      }

      if (nextMode === 'link_fragment') {
        sharePasswordInput.value = ''
      }
    },
    { immediate: true },
  )

  watch(sharePasswordInput, () => {
    if (selectedShareSecurityMode.value !== 'password') {
      return
    }

    options.onSecurityStateChanged()
  })

  return {
    selectedShareSecurityMode,
    sharePasswordInput,
    hasAcknowledgedFragmentModeRisk,
    isPasswordSecurityMode,
    isFragmentModeAcknowledged,
    generateAndApplySharePassword,
    clearSharePassword,
    resetShareSecuritySelection,
  }
}
