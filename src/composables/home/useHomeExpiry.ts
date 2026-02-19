import { computed, type ComputedRef, type Ref } from 'vue'
import {
  resolveShareExpiry,
  type ShareExpiryBounds,
  type ShareExpiryResult,
  type ResolvedShareExpiry,
} from '../../domain/shareExpiry'
import {
  fromPickerDateForMode,
  toPickerDateForMode,
  type ShareExpiryDisplayMode,
} from './useHomeExpiryDateMode'

export interface ShareExpiryCountdownValues {
  remainingSeconds: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export interface ShareExpiryCountdownUnit {
  id: 'days' | 'hours' | 'minutes' | 'seconds'
  value: string
  label: string
}

export interface ShareExpiryCountdownStatus {
  label: string
  modifier: 'safe' | 'warn' | 'critical'
}

export interface ShareExpiryCountdownPresentation {
  title: string
  helper: string
  phaseLabel: string
  phaseModifier: 'preview' | 'active'
  liveDotModifier: 'preview' | 'active'
}

export interface UseHomeExpiry {
  shareExpiryValidationResult: ComputedRef<ShareExpiryResult<ResolvedShareExpiry>>
  isShareExpiryValid: ComputedRef<boolean>
  shareExpiryValidationMessage: ComputedRef<string>
  shareExpiryLocalDisplay: ComputedRef<string>
  shareExpiryUtcDisplay: ComputedRef<string>
  shareExpiryPickerDateFormat: ComputedRef<string>
  shareExpiryPickerDate: ComputedRef<Date | null>
  shareExpiryPickerMinDate: ComputedRef<Date>
  shareExpiryPickerMaxDate: ComputedRef<Date>
  shareExpiryPickerModeHint: ComputedRef<string>
  shouldShowShareExpiryCountdown: ComputedRef<boolean>
  shareExpiryCountdown: ComputedRef<ShareExpiryCountdownValues | null>
  shareExpiryCountdownUnits: ComputedRef<ShareExpiryCountdownUnit[]>
  shareExpiryCountdownStatus: ComputedRef<ShareExpiryCountdownStatus | null>
  shareExpiryDeletionScheduleLabel: ComputedRef<string>
  shareExpiryCountdownPresentation: ComputedRef<ShareExpiryCountdownPresentation>
  shouldShowSuccessShareExpiryCountdown: ComputedRef<boolean>
  successShareExpiryCountdown: ComputedRef<ShareExpiryCountdownValues | null>
  successShareExpiryCountdownUnits: ComputedRef<ShareExpiryCountdownUnit[]>
  successShareExpiryCountdownStatus: ComputedRef<ShareExpiryCountdownStatus | null>
}

interface UseHomeExpiryOptions {
  selectedShareExpiry: Ref<Date | null>
  shareExpiryDisplayMode: Ref<ShareExpiryDisplayMode>
  shareExpiryBounds: Ref<ShareExpiryBounds>
  shareExpiryCountdownNow: Ref<number>
  isPsbtValid: Ref<boolean>
  isShareUploaded: Ref<boolean>
  successShareExpiryTimestamp: Ref<number | null>
  localDatePickerFormat: string
}

function toCountdownValues(timestampDeltaMilliseconds: number): ShareExpiryCountdownValues {
  const remainingSeconds = Math.floor(Math.max(0, timestampDeltaMilliseconds) / 1000)
  const days = Math.floor(remainingSeconds / 86400)
  const hours = Math.floor((remainingSeconds % 86400) / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  return {
    remainingSeconds,
    days,
    hours,
    minutes,
    seconds,
  }
}

function toCountdownUnits(countdown: ShareExpiryCountdownValues | null): ShareExpiryCountdownUnit[] {
  if (!countdown) {
    return []
  }

  return [
    {
      id: 'days',
      value: String(countdown.days),
      label: 'Days',
    },
    {
      id: 'hours',
      value: String(countdown.hours).padStart(2, '0'),
      label: 'Hours',
    },
    {
      id: 'minutes',
      value: String(countdown.minutes).padStart(2, '0'),
      label: 'Minutes',
    },
    {
      id: 'seconds',
      value: String(countdown.seconds).padStart(2, '0'),
      label: 'Seconds',
    },
  ]
}

function toCountdownStatus(
  countdown: ShareExpiryCountdownValues | null,
): ShareExpiryCountdownStatus | null {
  if (!countdown) {
    return null
  }

  if (countdown.remainingSeconds <= 0) {
    return {
      label: 'Deletion due now',
      modifier: 'critical',
    }
  }

  if (countdown.remainingSeconds <= 3600) {
    return {
      label: 'Under 1 hour left',
      modifier: 'warn',
    }
  }

  return {
    label: 'Deletion scheduled',
    modifier: 'safe',
  }
}

/**
 * Consolidates expiry picker, validation, and countdown display derivations.
 */
export function useHomeExpiry(options: UseHomeExpiryOptions): UseHomeExpiry {
  const {
    selectedShareExpiry,
    shareExpiryDisplayMode,
    shareExpiryBounds,
    shareExpiryCountdownNow,
    isPsbtValid,
    isShareUploaded,
    successShareExpiryTimestamp,
    localDatePickerFormat,
  } = options

  const shareExpiryValidationResult = computed<ShareExpiryResult<ResolvedShareExpiry>>(() =>
    resolveShareExpiry(selectedShareExpiry.value),
  )

  const isShareExpiryValid = computed<boolean>(() => shareExpiryValidationResult.value.ok)

  const shareExpiryValidationMessage = computed<string>(() => {
    if (shareExpiryValidationResult.value.ok) {
      return ''
    }

    return shareExpiryValidationResult.value.error.message
  })

  const shareExpiryLocalDisplay = computed<string>(() => {
    if (!selectedShareExpiry.value || Number.isNaN(selectedShareExpiry.value.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).format(selectedShareExpiry.value)
  })

  const shareExpiryUtcDisplay = computed<string>(() => {
    if (!selectedShareExpiry.value || Number.isNaN(selectedShareExpiry.value.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(selectedShareExpiry.value)
  })

  const shareExpiryPickerDateFormat = computed<string>(() => {
    if (shareExpiryDisplayMode.value === 'utc') {
      return 'yy-mm-dd'
    }

    return localDatePickerFormat
  })

  const shareExpiryPickerDate = computed<Date | null>({
    get: (): Date | null => {
      if (!selectedShareExpiry.value || Number.isNaN(selectedShareExpiry.value.getTime())) {
        return null
      }

      return toPickerDateForMode(selectedShareExpiry.value, shareExpiryDisplayMode.value)
    },
    set: (nextValue: Date | null): void => {
      if (!nextValue || Number.isNaN(nextValue.getTime())) {
        selectedShareExpiry.value = null
        return
      }

      selectedShareExpiry.value = fromPickerDateForMode(nextValue, shareExpiryDisplayMode.value)
    },
  })

  const shareExpiryPickerMinDate = computed<Date>(() => {
    return toPickerDateForMode(shareExpiryBounds.value.minDate, shareExpiryDisplayMode.value)
  })

  const shareExpiryPickerMaxDate = computed<Date>(() => {
    return toPickerDateForMode(shareExpiryBounds.value.maxDate, shareExpiryDisplayMode.value)
  })

  const shareExpiryPickerModeHint = computed<string>(() => {
    if (shareExpiryDisplayMode.value === 'utc') {
      return 'Picker editing mode: UTC'
    }

    return 'Picker editing mode: local timezone'
  })

  const shouldShowShareExpiryCountdown = computed<boolean>(() => {
    if (!isPsbtValid.value || !isShareExpiryValid.value || !selectedShareExpiry.value) {
      return false
    }

    return !Number.isNaN(selectedShareExpiry.value.getTime())
  })

  const shareExpiryCountdown = computed<ShareExpiryCountdownValues | null>(() => {
    if (!shouldShowShareExpiryCountdown.value || !selectedShareExpiry.value) {
      return null
    }

    return toCountdownValues(
      selectedShareExpiry.value.getTime() - shareExpiryCountdownNow.value,
    )
  })

  const shareExpiryCountdownUnits = computed<ShareExpiryCountdownUnit[]>(() => {
    return toCountdownUnits(shareExpiryCountdown.value)
  })

  const shareExpiryCountdownStatus = computed<ShareExpiryCountdownStatus | null>(() => {
    return toCountdownStatus(shareExpiryCountdown.value)
  })

  const shareExpiryDeletionScheduleLabel = computed<string>(() => {
    if (shareExpiryDisplayMode.value === 'utc') {
      return shareExpiryUtcDisplay.value
    }

    return shareExpiryLocalDisplay.value
  })

  const shareExpiryCountdownPresentation = computed<ShareExpiryCountdownPresentation>(() => {
    if (isShareUploaded.value) {
      return {
        title: 'Live auto-delete countdown',
        helper: 'Upload is complete. The deletion timer is now active.',
        phaseLabel: 'Uploaded',
        phaseModifier: 'active',
        liveDotModifier: 'active',
      }
    }

    return {
      title: 'Auto-delete preview countdown',
      helper: 'Preview only. Timer starts after you upload and generate the share link.',
      phaseLabel: 'Not uploaded yet',
      phaseModifier: 'preview',
      liveDotModifier: 'preview',
    }
  })

  const shouldShowSuccessShareExpiryCountdown = computed<boolean>(() => {
    return successShareExpiryTimestamp.value !== null
  })

  const successShareExpiryCountdown = computed<ShareExpiryCountdownValues | null>(() => {
    if (successShareExpiryTimestamp.value === null) {
      return null
    }

    return toCountdownValues(successShareExpiryTimestamp.value - shareExpiryCountdownNow.value)
  })

  const successShareExpiryCountdownUnits = computed<ShareExpiryCountdownUnit[]>(() => {
    return toCountdownUnits(successShareExpiryCountdown.value)
  })

  const successShareExpiryCountdownStatus = computed<ShareExpiryCountdownStatus | null>(() => {
    return toCountdownStatus(successShareExpiryCountdown.value)
  })

  return {
    shareExpiryValidationResult,
    isShareExpiryValid,
    shareExpiryValidationMessage,
    shareExpiryLocalDisplay,
    shareExpiryUtcDisplay,
    shareExpiryPickerDateFormat,
    shareExpiryPickerDate,
    shareExpiryPickerMinDate,
    shareExpiryPickerMaxDate,
    shareExpiryPickerModeHint,
    shouldShowShareExpiryCountdown,
    shareExpiryCountdown,
    shareExpiryCountdownUnits,
    shareExpiryCountdownStatus,
    shareExpiryDeletionScheduleLabel,
    shareExpiryCountdownPresentation,
    shouldShowSuccessShareExpiryCountdown,
    successShareExpiryCountdown,
    successShareExpiryCountdownUnits,
    successShareExpiryCountdownStatus,
  }
}
