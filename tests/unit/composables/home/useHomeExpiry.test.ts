import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useHomeExpiry } from '../../../../src/composables/home/useHomeExpiry'
import { createShareExpiryBounds } from '../../../../src/domain/shareExpiry'

describe('useHomeExpiry', () => {
  function createBaseOptions() {
    const now = Date.now()
    const selectedShareExpiry = ref(new Date(now + 2 * 60 * 60 * 1000))
    const shareExpiryDisplayMode = ref<'local' | 'utc'>('local')
    const shareExpiryBounds = ref(createShareExpiryBounds(new Date(now)))
    const shareExpiryCountdownNow = ref(now)
    const isPsbtValid = ref(true)
    const isShareUploaded = ref(false)
    const successShareExpiryTimestamp = ref<number | null>(null)

    return {
      selectedShareExpiry,
      shareExpiryDisplayMode,
      shareExpiryBounds,
      shareExpiryCountdownNow,
      isPsbtValid,
      isShareUploaded,
      successShareExpiryTimestamp,
      localDatePickerFormat: 'mm/dd/yy',
    }
  }

  it('derives expiry validation, picker values, and countdown in local mode', () => {
    const options = createBaseOptions()
    const {
      isShareExpiryValid,
      shareExpiryValidationMessage,
      shareExpiryPickerDateFormat,
      shareExpiryPickerDate,
      shareExpiryCountdown,
      shareExpiryCountdownStatus,
      shareExpiryCountdownUnits,
      shareExpiryDeletionScheduleLabel,
      shareExpiryCountdownPresentation,
      shareExpiryPickerModeHint,
      shareExpiryPickerMinDate,
      shareExpiryPickerMaxDate,
    } = useHomeExpiry(options)

    expect(isShareExpiryValid.value).toBe(true)
    expect(shareExpiryValidationMessage.value).toBe('')
    expect(shareExpiryPickerDateFormat.value).toBe('mm/dd/yy')
    expect(shareExpiryPickerDate.value).toBeInstanceOf(Date)
    expect(shareExpiryCountdown.value?.remainingSeconds).toBeGreaterThan(0)
    expect(shareExpiryCountdownStatus.value?.modifier).toBe('safe')
    expect(shareExpiryCountdownUnits.value).toHaveLength(4)
    expect(shareExpiryDeletionScheduleLabel.value.length).toBeGreaterThan(0)
    expect(shareExpiryCountdownPresentation.value.phaseModifier).toBe('preview')
    expect(shareExpiryPickerModeHint.value).toContain('local')
    expect(shareExpiryPickerMinDate.value).toBeInstanceOf(Date)
    expect(shareExpiryPickerMaxDate.value).toBeInstanceOf(Date)

    const nextDate = new Date(Date.now() + 3 * 60 * 60 * 1000)
    shareExpiryPickerDate.value = nextDate
    expect(options.selectedShareExpiry.value).toBeInstanceOf(Date)

    shareExpiryPickerDate.value = null
    expect(options.selectedShareExpiry.value).toBeNull()
  })

  it('switches to utc picker mode and handles warning/critical countdown states', () => {
    const options = createBaseOptions()
    options.shareExpiryDisplayMode.value = 'utc'
    options.isShareUploaded.value = true
    options.selectedShareExpiry.value = new Date(options.shareExpiryCountdownNow.value + 30 * 60 * 1000)
    options.successShareExpiryTimestamp.value = options.shareExpiryCountdownNow.value + 30 * 60 * 1000

    const {
      shareExpiryPickerDateFormat,
      shareExpiryPickerModeHint,
      shareExpiryCountdownStatus,
      shareExpiryCountdownPresentation,
      shouldShowSuccessShareExpiryCountdown,
      successShareExpiryCountdownStatus,
      successShareExpiryCountdownUnits,
    } = useHomeExpiry(options)

    expect(shareExpiryPickerDateFormat.value).toBe('yy-mm-dd')
    expect(shareExpiryPickerModeHint.value).toContain('UTC')
    expect(shareExpiryCountdownStatus.value?.modifier).toBe('warn')
    expect(shareExpiryCountdownPresentation.value.phaseModifier).toBe('active')
    expect(shouldShowSuccessShareExpiryCountdown.value).toBe(true)
    expect(successShareExpiryCountdownStatus.value?.modifier).toBe('warn')
    expect(successShareExpiryCountdownUnits.value).toHaveLength(4)

    options.successShareExpiryTimestamp.value = options.shareExpiryCountdownNow.value
    expect(successShareExpiryCountdownStatus.value?.modifier).toBe('critical')
  })

  it('reports invalid expiry and hides countdown when prerequisites are missing', () => {
    const options = createBaseOptions()
    options.selectedShareExpiry.value = null
    options.isPsbtValid.value = false
    options.successShareExpiryTimestamp.value = null

    const {
      isShareExpiryValid,
      shareExpiryValidationMessage,
      shouldShowShareExpiryCountdown,
      shareExpiryCountdownStatus,
      shouldShowSuccessShareExpiryCountdown,
      successShareExpiryCountdownStatus,
    } = useHomeExpiry(options)

    expect(isShareExpiryValid.value).toBe(false)
    expect(shareExpiryValidationMessage.value.length).toBeGreaterThan(0)
    expect(shouldShowShareExpiryCountdown.value).toBe(false)
    expect(shareExpiryCountdownStatus.value).toBeNull()
    expect(shouldShowSuccessShareExpiryCountdown.value).toBe(false)
    expect(successShareExpiryCountdownStatus.value).toBeNull()
  })

  it('handles invalid Date objects from picker inputs safely', () => {
    const options = createBaseOptions()
    options.selectedShareExpiry.value = new Date(Number.NaN)

    const {
      isShareExpiryValid,
      shareExpiryValidationMessage,
      shareExpiryPickerDate,
      shareExpiryLocalDisplay,
      shareExpiryUtcDisplay,
      shouldShowShareExpiryCountdown,
    } = useHomeExpiry(options)

    expect(isShareExpiryValid.value).toBe(false)
    expect(shareExpiryValidationMessage.value.length).toBeGreaterThan(0)
    expect(shareExpiryPickerDate.value).toBeNull()
    expect(shareExpiryLocalDisplay.value).toBe('')
    expect(shareExpiryUtcDisplay.value).toBe('')
    expect(shouldShowShareExpiryCountdown.value).toBe(false)
  })
})
