/**
 * Unit coverage for Home security-mode orchestration and safety gates.
 */
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useHomeSecurityMode } from '../../../../src/composables/home/useHomeSecurityMode'

describe('useHomeSecurityMode composable', () => {
  it('defaults to password mode with an auto-generated password', () => {
    const onSecurityStateChanged = vi.fn()
    const onSecurityError = vi.fn()
    const generatePassword = vi.fn().mockReturnValue({
      ok: true,
      value: 'Generated#2026',
    })

    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged,
      onSecurityError,
      generatePassword,
    })

    expect(securityMode.selectedShareSecurityMode.value).toBe('password')
    expect(securityMode.sharePasswordInput.value).toBe('Generated#2026')
    expect(securityMode.isPasswordSecurityMode.value).toBe(true)
    expect(securityMode.isFragmentModeAcknowledged.value).toBe(true)
    expect(onSecurityError).not.toHaveBeenCalled()
  })

  it('requires explicit acknowledgement in one-link mode', async () => {
    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged: vi.fn(),
      onSecurityError: vi.fn(),
      generatePassword: () => ({
        ok: true,
        value: 'Generated#2026',
      }),
    })

    securityMode.selectedShareSecurityMode.value = 'link_fragment'
    await nextTick()

    expect(securityMode.sharePasswordInput.value).toBe('')
    expect(securityMode.isFragmentModeAcknowledged.value).toBe(false)

    securityMode.hasAcknowledgedFragmentModeRisk.value = true
    expect(securityMode.isFragmentModeAcknowledged.value).toBe(true)
  })

  it('resets acknowledgement when switching back to password mode', async () => {
    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged: vi.fn(),
      onSecurityError: vi.fn(),
      generatePassword: () => ({
        ok: true,
        value: 'Generated#2026',
      }),
    })

    securityMode.selectedShareSecurityMode.value = 'link_fragment'
    await nextTick()
    securityMode.hasAcknowledgedFragmentModeRisk.value = true

    securityMode.selectedShareSecurityMode.value = 'password'
    await nextTick()

    expect(securityMode.hasAcknowledgedFragmentModeRisk.value).toBe(false)
    expect(securityMode.sharePasswordInput.value).toBe('Generated#2026')
  })

  it('resetShareSecuritySelection returns to default password mode', () => {
    const generatePassword = vi
      .fn()
      .mockReturnValueOnce({
        ok: true,
        value: 'Initial#2026',
      })
      .mockReturnValueOnce({
        ok: true,
        value: 'Reset#2026',
      })

    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged: vi.fn(),
      onSecurityError: vi.fn(),
      generatePassword,
    })

    securityMode.selectedShareSecurityMode.value = 'link_fragment'
    securityMode.hasAcknowledgedFragmentModeRisk.value = true
    securityMode.resetShareSecuritySelection()

    expect(securityMode.selectedShareSecurityMode.value).toBe('password')
    expect(securityMode.hasAcknowledgedFragmentModeRisk.value).toBe(false)
    expect(securityMode.sharePasswordInput.value).toBe('Reset#2026')
  })

  it('surfaces password generation errors via callback', () => {
    const onSecurityError = vi.fn()

    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged: vi.fn(),
      onSecurityError,
      generatePassword: () => ({
        ok: false,
        error: {
          message: 'WebCrypto is unavailable.',
        },
      }),
    })

    expect(securityMode.sharePasswordInput.value).toBe('')
    expect(onSecurityError).toHaveBeenCalledWith('WebCrypto is unavailable.')
  })

  it('uses a fallback error message when generator fails without details', () => {
    const onSecurityError = vi.fn()
    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged: vi.fn(),
      onSecurityError,
      generatePassword: () => ({
        ok: false,
      }),
    })

    securityMode.generateAndApplySharePassword()
    expect(onSecurityError).toHaveBeenCalledWith('Unable to generate a secure share password.')
  })

  it('clearSharePassword clears input and notifies state change', () => {
    const onSecurityStateChanged = vi.fn()
    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged,
      onSecurityError: vi.fn(),
      generatePassword: () => ({
        ok: true,
        value: 'Generated#2026',
      }),
    })

    securityMode.clearSharePassword()

    expect(securityMode.sharePasswordInput.value).toBe('')
    expect(onSecurityStateChanged).toHaveBeenCalled()
  })

  it('reset falls back to empty password when generation fails', () => {
    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged: vi.fn(),
      onSecurityError: vi.fn(),
      generatePassword: () => ({
        ok: false,
      }),
    })

    securityMode.sharePasswordInput.value = 'Temporary#2026'
    securityMode.resetShareSecuritySelection()

    expect(securityMode.sharePasswordInput.value).toBe('')
  })

  it('does not emit password-input watch updates outside password mode', async () => {
    const onSecurityStateChanged = vi.fn()
    const securityMode = useHomeSecurityMode({
      onSecurityStateChanged,
      onSecurityError: vi.fn(),
      generatePassword: () => ({
        ok: true,
        value: 'Generated#2026',
      }),
    })

    onSecurityStateChanged.mockClear()
    securityMode.selectedShareSecurityMode.value = 'link_fragment'
    await nextTick()
    onSecurityStateChanged.mockClear()

    securityMode.sharePasswordInput.value = 'IgnoredInFragmentMode'
    await nextTick()
    expect(onSecurityStateChanged).not.toHaveBeenCalled()
  })
})
