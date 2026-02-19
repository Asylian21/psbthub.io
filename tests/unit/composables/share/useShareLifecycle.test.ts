import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useShareLifecycle } from '../../../../src/composables/share/useShareLifecycle'
import type { FetchState } from '../../../../src/composables/useFetch'

describe('useShareLifecycle', () => {
  function createSuccessState(expiresAt: string | null): FetchState {
    return {
      status: 'success',
      shareId: 'AAAAAAAAAAAAAAAAAAAAAA',
      psbtBase64: 'cHNidA==',
      createdAt: new Date('2026-02-16T10:00:00.000Z').toISOString(),
      expiresAt,
      accessMode: 'fragment',
    }
  }

  it('derives lifecycle metadata and countdown units for active shares', () => {
    const nowTimestamp = Date.parse('2026-02-16T10:00:00.000Z')
    const expiresAt = new Date(nowTimestamp + 90 * 60 * 1000).toISOString()
    const fetchState = ref<FetchState>(createSuccessState(expiresAt))
    const lifecycleNow = ref(nowTimestamp)
    const isDeleted = ref(false)
    const isDeleteInProgress = ref(false)

    const {
      activeShareId,
      shouldShowLifecycleCard,
      shouldShowLifecycleCountdown,
      lifecycleCountdownStatus,
      lifecycleCountdownUnits,
      lifecycleStatusTag,
      manualDeleteButtonLabel,
      expiresAtDisplay,
      expiresAtUtcDisplay,
    } = useShareLifecycle(fetchState, lifecycleNow, isDeleted, isDeleteInProgress)

    expect(activeShareId.value).toBe('AAAAAAAAAAAAAAAAAAAAAA')
    expect(shouldShowLifecycleCard.value).toBe(true)
    expect(shouldShowLifecycleCountdown.value).toBe(true)
    expect(lifecycleCountdownStatus.value).toBe('active')
    expect(lifecycleCountdownUnits.value).toHaveLength(4)
    expect(lifecycleStatusTag.value.value).toBe('Active')
    expect(manualDeleteButtonLabel.value).toBe('Delete share now')
    expect(expiresAtDisplay.value.length).toBeGreaterThan(0)
    expect(expiresAtUtcDisplay.value.length).toBeGreaterThan(0)
  })

  it('switches status labels across warning, critical, expired, and deleted states', () => {
    const nowTimestamp = Date.parse('2026-02-16T10:00:00.000Z')
    const fetchState = ref<FetchState>(
      createSuccessState(new Date(nowTimestamp + 50 * 60 * 1000).toISOString()),
    )
    const lifecycleNow = ref(nowTimestamp)
    const isDeleted = ref(false)
    const isDeleteInProgress = ref(true)

    const {
      lifecycleCountdownStatus,
      lifecycleStatusTag,
      manualDeleteButtonLabel,
      lifecycleSummaryText,
      shouldRunLifecycleTicker,
    } = useShareLifecycle(fetchState, lifecycleNow, isDeleted, isDeleteInProgress)

    expect(lifecycleCountdownStatus.value).toBe('warning')
    expect(lifecycleStatusTag.value.value).toBe('Less than 1 hour')
    expect(manualDeleteButtonLabel.value).toBe('Deleting share...')
    expect(shouldRunLifecycleTicker.value).toBe(true)

    fetchState.value = createSuccessState(new Date(nowTimestamp + 4 * 60 * 1000).toISOString())
    expect(lifecycleCountdownStatus.value).toBe('critical')
    expect(lifecycleStatusTag.value.value).toBe('Critical window')

    fetchState.value = createSuccessState(new Date(nowTimestamp - 1000).toISOString())
    expect(lifecycleCountdownStatus.value).toBe('expired')
    expect(lifecycleSummaryText.value).toContain('already be unavailable')

    isDeleted.value = true
    expect(lifecycleCountdownStatus.value).toBe('deleted')
    expect(lifecycleStatusTag.value.value).toBe('Deleted manually')
    expect(lifecycleSummaryText.value).toContain('removed from the server')
  })

  it('hides lifecycle card when share state is not success', () => {
    const fetchState = ref<FetchState>({ status: 'idle' })
    const lifecycleNow = ref(Date.now())
    const isDeleted = ref(false)
    const isDeleteInProgress = ref(false)

    const { shouldShowLifecycleCard, shouldShowLifecycleCountdown } = useShareLifecycle(
      fetchState,
      lifecycleNow,
      isDeleted,
      isDeleteInProgress,
    )

    expect(shouldShowLifecycleCard.value).toBe(false)
    expect(shouldShowLifecycleCountdown.value).toBe(false)
  })

  it('handles invalid expiry timestamps and keeps deleted shares visible', () => {
    const fetchState = ref<FetchState>(
      createSuccessState('not-a-valid-timestamp'),
    )
    const lifecycleNow = ref(Date.parse('2026-02-16T10:00:00.000Z'))
    const isDeleted = ref(false)
    const isDeleteInProgress = ref(false)

    const {
      expiresAtTimestamp,
      shouldShowLifecycleCard,
      shouldShowLifecycleCountdown,
      shouldRunLifecycleTicker,
      lifecycleCountdownStatus,
      manualDeleteButtonLabel,
    } = useShareLifecycle(fetchState, lifecycleNow, isDeleted, isDeleteInProgress)

    expect(expiresAtTimestamp.value).toBeNull()
    expect(shouldShowLifecycleCard.value).toBe(false)
    expect(shouldShowLifecycleCountdown.value).toBe(false)
    expect(shouldRunLifecycleTicker.value).toBe(false)
    expect(lifecycleCountdownStatus.value).toBe('expired')

    isDeleted.value = true
    expect(shouldShowLifecycleCard.value).toBe(true)
    expect(shouldShowLifecycleCountdown.value).toBe(false)
    expect(shouldRunLifecycleTicker.value).toBe(false)
    expect(manualDeleteButtonLabel.value).toBe('Share deleted')
  })
})
