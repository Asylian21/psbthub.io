import { computed, type ComputedRef, type Ref } from 'vue'
import {
  assessSharePasswordStrength,
  type SharePasswordStrengthAssessment,
} from '../../domain/sharePassword'

export interface PasswordStrengthSignalItem {
  id: string
  label: string
  passed: boolean
}

export interface UseHomePasswordStrength {
  sharePasswordStrength: ComputedRef<SharePasswordStrengthAssessment>
  sharePasswordStrengthClass: ComputedRef<string>
  sharePasswordStrengthDisplay: ComputedRef<string>
  sharePasswordSignalItems: ComputedRef<PasswordStrengthSignalItem[]>
}

/**
 * Password strength UI derivations for Home security step.
 */
export function useHomePasswordStrength(
  sharePasswordInput: Ref<string>,
): UseHomePasswordStrength {
  const sharePasswordStrength = computed<SharePasswordStrengthAssessment>(() =>
    assessSharePasswordStrength(sharePasswordInput.value),
  )

  const sharePasswordStrengthClass = computed<string>(() => {
    return `share-password-meter-bar--${sharePasswordStrength.value.level}`
  })

  const sharePasswordStrengthDisplay = computed<string>(() => {
    return `${sharePasswordStrength.value.label} (${sharePasswordStrength.value.score}/100)`
  })

  const sharePasswordSignalItems = computed<PasswordStrengthSignalItem[]>(() => {
    const { signals } = sharePasswordStrength.value

    return [
      {
        id: 'length',
        label: `Length ${signals.length >= 12 ? '12+' : `${signals.length}`}`,
        passed: signals.length >= 12,
      },
      {
        id: 'mixed-case',
        label: 'Mixed upper/lowercase',
        passed: signals.hasLowercase && signals.hasUppercase,
      },
      {
        id: 'digit',
        label: 'Includes numbers',
        passed: signals.hasDigit,
      },
      {
        id: 'symbol',
        label: 'Includes symbols',
        passed: signals.hasSymbol,
      },
      {
        id: 'sequence',
        label: 'Avoids sequential patterns',
        passed: !signals.hasSequentialPattern,
      },
      {
        id: 'repetition',
        label: 'Avoids repeated runs',
        passed: !signals.hasLongRepeatedRun,
      },
    ]
  })

  return {
    sharePasswordStrength,
    sharePasswordStrengthClass,
    sharePasswordStrengthDisplay,
    sharePasswordSignalItems,
  }
}
