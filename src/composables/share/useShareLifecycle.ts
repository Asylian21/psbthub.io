import { computed, type ComputedRef, type Ref } from 'vue'
import type { FetchState } from '../useFetch'

const ONE_SECOND_IN_MILLISECONDS = 1000

export type ShareLifecycleCountdownKey = 'days' | 'hours' | 'minutes' | 'seconds'

export interface ShareLifecycleCountdownUnit {
  key: ShareLifecycleCountdownKey
  label: string
  value: string
}

export type ShareLifecycleCountdownStatus =
  | 'deleted'
  | 'expired'
  | 'critical'
  | 'warning'
  | 'active'

export interface ShareLifecycleStatusTag {
  severity: 'success' | 'warn' | 'danger' | 'secondary'
  value: string
}

export interface UseShareLifecycle {
  activeShareId: ComputedRef<string>
  expiresAtTimestamp: ComputedRef<Date | null>
  canExposeLifecycleMetadata: ComputedRef<boolean>
  expiresAtDisplay: ComputedRef<string>
  expiresAtUtcDisplay: ComputedRef<string>
  lifecycleRemainingSeconds: ComputedRef<number>
  lifecycleCountdownUnits: ComputedRef<ShareLifecycleCountdownUnit[]>
  lifecycleCountdownStatus: ComputedRef<ShareLifecycleCountdownStatus>
  lifecycleStatusTag: ComputedRef<ShareLifecycleStatusTag>
  shouldShowLifecycleCard: ComputedRef<boolean>
  shouldShowLifecycleCountdown: ComputedRef<boolean>
  shouldRunLifecycleTicker: ComputedRef<boolean>
  manualDeleteButtonLabel: ComputedRef<string>
  lifecycleSummaryText: ComputedRef<string>
}

/**
 * Read-only lifecycle state (expiry + countdown labels) for a decrypted share.
 */
export function useShareLifecycle(
  fetchState: Ref<FetchState>,
  lifecycleNowTimestamp: Ref<number>,
  isShareManuallyDeleted: Ref<boolean>,
  isDeleteInProgress: Ref<boolean>,
): UseShareLifecycle {
  const activeShareId = computed<string>(() => {
    if (fetchState.value.status === 'success') {
      return fetchState.value.shareId
    }

    return ''
  })

  const expiresAtTimestamp = computed<Date | null>(() => {
    if (fetchState.value.status !== 'success') {
      return null
    }

    if (!fetchState.value.expiresAt) {
      return null
    }

    const parsedTimestamp = new Date(fetchState.value.expiresAt)

    if (Number.isNaN(parsedTimestamp.getTime())) {
      return null
    }

    return parsedTimestamp
  })

  const canExposeLifecycleMetadata = computed<boolean>(() => {
    return fetchState.value.status === 'success'
  })

  const expiresAtDisplay = computed<string>(() => {
    if (!expiresAtTimestamp.value) {
      return ''
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(expiresAtTimestamp.value)
  })

  const expiresAtUtcDisplay = computed<string>(() => {
    if (!expiresAtTimestamp.value) {
      return ''
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(expiresAtTimestamp.value)
  })

  const lifecycleRemainingSeconds = computed<number>(() => {
    if (!expiresAtTimestamp.value || isShareManuallyDeleted.value) {
      return 0
    }

    const deltaMilliseconds = expiresAtTimestamp.value.getTime() - lifecycleNowTimestamp.value
    return Math.max(0, Math.floor(deltaMilliseconds / ONE_SECOND_IN_MILLISECONDS))
  })

  const lifecycleCountdownUnits = computed<ShareLifecycleCountdownUnit[]>(() => {
    const totalSeconds = lifecycleRemainingSeconds.value
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return [
      {
        key: 'days',
        label: 'Days',
        value: String(days).padStart(2, '0'),
      },
      {
        key: 'hours',
        label: 'Hours',
        value: String(hours).padStart(2, '0'),
      },
      {
        key: 'minutes',
        label: 'Minutes',
        value: String(minutes).padStart(2, '0'),
      },
      {
        key: 'seconds',
        label: 'Seconds',
        value: String(seconds).padStart(2, '0'),
      },
    ]
  })

  const lifecycleCountdownStatus = computed<ShareLifecycleCountdownStatus>(() => {
    if (isShareManuallyDeleted.value) {
      return 'deleted'
    }

    const remainingSeconds = lifecycleRemainingSeconds.value

    if (remainingSeconds <= 0) {
      return 'expired'
    }

    if (remainingSeconds <= 5 * 60) {
      return 'critical'
    }

    if (remainingSeconds <= 60 * 60) {
      return 'warning'
    }

    return 'active'
  })

  const lifecycleStatusTag = computed<ShareLifecycleStatusTag>(() => {
    if (lifecycleCountdownStatus.value === 'deleted') {
      return {
        severity: 'success',
        value: 'Deleted manually',
      }
    }

    if (lifecycleCountdownStatus.value === 'expired') {
      return {
        severity: 'danger',
        value: 'Expired',
      }
    }

    if (lifecycleCountdownStatus.value === 'critical') {
      return {
        severity: 'danger',
        value: 'Critical window',
      }
    }

    if (lifecycleCountdownStatus.value === 'warning') {
      return {
        severity: 'warn',
        value: 'Less than 1 hour',
      }
    }

    return {
      severity: 'success',
      value: 'Active',
    }
  })

  const shouldShowLifecycleCard = computed<boolean>(() => {
    if (!canExposeLifecycleMetadata.value) {
      return false
    }

    if (isShareManuallyDeleted.value) {
      return true
    }

    return Boolean(activeShareId.value && expiresAtTimestamp.value)
  })

  const shouldShowLifecycleCountdown = computed<boolean>(() => {
    return (
      canExposeLifecycleMetadata.value &&
      Boolean(expiresAtTimestamp.value) &&
      !isShareManuallyDeleted.value
    )
  })

  const shouldRunLifecycleTicker = computed<boolean>(() => {
    return shouldShowLifecycleCountdown.value && lifecycleRemainingSeconds.value > 0
  })

  const manualDeleteButtonLabel = computed<string>(() => {
    if (isShareManuallyDeleted.value) {
      return 'Share deleted'
    }

    if (isDeleteInProgress.value) {
      return 'Deleting share...'
    }

    return 'Delete share now'
  })

  const lifecycleSummaryText = computed<string>(() => {
    if (isShareManuallyDeleted.value) {
      return 'This share has been removed from the server. Refreshing this page will no longer load it.'
    }

    if (lifecycleCountdownStatus.value === 'expired') {
      return 'This share should already be unavailable from the server due to expiration.'
    }

    return 'This encrypted payload remains available until the timer reaches zero, unless deleted manually first.'
  })

  return {
    activeShareId,
    expiresAtTimestamp,
    canExposeLifecycleMetadata,
    expiresAtDisplay,
    expiresAtUtcDisplay,
    lifecycleRemainingSeconds,
    lifecycleCountdownUnits,
    lifecycleCountdownStatus,
    lifecycleStatusTag,
    shouldShowLifecycleCard,
    shouldShowLifecycleCountdown,
    shouldRunLifecycleTicker,
    manualDeleteButtonLabel,
    lifecycleSummaryText,
  }
}
