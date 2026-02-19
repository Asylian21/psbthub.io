import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useHomePasswordStrength } from '../../../../src/composables/home/useHomePasswordStrength'

describe('useHomePasswordStrength', () => {
  it('derives strength UI fields from password input', () => {
    const passwordInput = ref('WeakPass1')
    const {
      sharePasswordStrength,
      sharePasswordStrengthClass,
      sharePasswordStrengthDisplay,
      sharePasswordSignalItems,
    } = useHomePasswordStrength(passwordInput)

    expect(sharePasswordStrength.value.score).toBeGreaterThanOrEqual(0)
    expect(sharePasswordStrengthClass.value).toContain('share-password-meter-bar--')
    expect(sharePasswordStrengthDisplay.value).toContain('/100')
    expect(sharePasswordSignalItems.value).toHaveLength(6)
  })

  it('updates computed strength values when password changes', () => {
    const passwordInput = ref('Short1!')
    const { sharePasswordStrengthDisplay, sharePasswordSignalItems } =
      useHomePasswordStrength(passwordInput)

    const initialDisplay = sharePasswordStrengthDisplay.value

    passwordInput.value = 'VeryStrongPassword#2026'

    expect(sharePasswordStrengthDisplay.value).not.toBe(initialDisplay)
    const lengthSignal = sharePasswordSignalItems.value.find(
      (signalItem) => signalItem.id === 'length',
    )
    expect(lengthSignal?.passed).toBe(true)
  })

  it('flags sequential/repeated patterns and clears them for stronger passwords', () => {
    const passwordInput = ref('abc123333!!!')
    const { sharePasswordSignalItems } = useHomePasswordStrength(passwordInput)

    const sequenceSignalInitial = sharePasswordSignalItems.value.find(
      (signalItem) => signalItem.id === 'sequence',
    )
    const repetitionSignalInitial = sharePasswordSignalItems.value.find(
      (signalItem) => signalItem.id === 'repetition',
    )
    expect(sequenceSignalInitial?.passed).toBe(false)
    expect(repetitionSignalInitial?.passed).toBe(false)

    passwordInput.value = 'Tougher#Pass2026'

    const sequenceSignalNext = sharePasswordSignalItems.value.find(
      (signalItem) => signalItem.id === 'sequence',
    )
    const repetitionSignalNext = sharePasswordSignalItems.value.find(
      (signalItem) => signalItem.id === 'repetition',
    )
    expect(sequenceSignalNext?.passed).toBe(true)
    expect(repetitionSignalNext?.passed).toBe(true)
  })
})
