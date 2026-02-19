<script setup lang="ts">
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'
import { type ShareExpiryDisplayMode } from '../../composables/home/useHomeExpiryDateMode'

interface ShareExpiryTagPtSection {
  class?: string
  style?: string
}

interface ShareExpiryTagPt {
  root?: ShareExpiryTagPtSection
  label?: ShareExpiryTagPtSection
}

interface ShareExpiryCountdownUnit {
  id: 'days' | 'hours' | 'minutes' | 'seconds'
  value: string
  label: string
}

interface ShareExpiryCountdownStatus {
  label: string
  modifier: 'safe' | 'warn' | 'critical'
}

interface ShareExpiryCountdownPresentation {
  title: string
  helper: string
  phaseLabel: string
  phaseModifier: 'preview' | 'active'
  liveDotModifier: 'preview' | 'active'
}

interface Props {
  isExpanded: boolean
  isUploading: boolean
  isShareExpiryValid: boolean
  shareExpiryPickerDate: Date | null
  shareExpiryPickerMinDate: Date
  shareExpiryPickerMaxDate: Date
  shareExpiryPickerDateFormat: string
  shareExpiryTagPt: ShareExpiryTagPt
  shareExpiryDisplayMode: ShareExpiryDisplayMode
  shareExpiryLocalDisplay: string
  shareExpiryUtcDisplay: string
  shareExpiryPickerModeHint: string
  shareExpiryValidationMessage: string
  shareExpiryLabelMaxDays: string
  showShareExpiryCountdown: boolean
  shareExpiryCountdownPresentation: ShareExpiryCountdownPresentation
  shareExpiryCountdownStatus: ShareExpiryCountdownStatus | null
  shareExpiryDeletionScheduleLabel: string
  shareExpiryCountdownUnits: ShareExpiryCountdownUnit[]
  handleStepCollapseBeforeEnter: (element: Element) => void
  handleStepCollapseEnter: (element: Element) => void
  handleStepCollapseAfterEnter: (element: Element) => void
  handleStepCollapseBeforeLeave: (element: Element) => void
  handleStepCollapseLeave: (element: Element) => void
  handleStepCollapseAfterLeave: (element: Element) => void
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'expand'): void
  (event: 'toggle-step'): void
  (event: 'update:shareExpiryPickerDate', value: Date | null): void
  (event: 'update:shareExpiryDisplayMode', value: ShareExpiryDisplayMode): void
}>()

function handleShareExpiryPickerDateUpdate(
  value: Date | Date[] | (Date | null)[] | null | undefined,
): void {
  if (value instanceof Date || value === null) {
    emit('update:shareExpiryPickerDate', value)
  }
}
</script>

<template>
  <div
    class="share-expiry-step"
    :class="{ 'share-step--collapsed': !isExpanded }"
    @click="emit('expand')"
  >
    <div class="share-expiry-shell">
      <div class="share-expiry-hero">
        <div class="share-expiry-hero-copy">
          <div class="share-expiry-kicker">
            <span class="share-expiry-kicker-pill">Step 3</span>
            <span class="share-expiry-kicker-text">Share retention</span>
          </div>
          <label for="share-expiry-picker" class="share-expiry-title">
            Choose when this encrypted share should be deleted
          </label>
          <p class="share-expiry-step-copy">
            Every share has a hard max retention of 31 days. Choose a shorter expiration
            window when you can.
          </p>
        </div>
        <Button
          type="button"
          severity="secondary"
          text
          rounded
          size="small"
          class="share-step-collapse-button"
          :icon="isExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          :aria-label="isExpanded ? 'Collapse Step 3' : 'Expand Step 3'"
          :aria-expanded="isExpanded"
          @click.stop="emit('toggle-step')"
        />
      </div>

      <Transition
        name="share-step-collapse"
        @before-enter="handleStepCollapseBeforeEnter"
        @enter="handleStepCollapseEnter"
        @after-enter="handleStepCollapseAfterEnter"
        @before-leave="handleStepCollapseBeforeLeave"
        @leave="handleStepCollapseLeave"
        @after-leave="handleStepCollapseAfterLeave"
      >
        <div
          v-show="isExpanded"
          class="share-step-collapsible-body share-step-collapsible-body--expiry"
        >
          <div class="share-expiry-picker-row">
            <DatePicker
              id="share-expiry-picker"
              :model-value="shareExpiryPickerDate"
              :minDate="shareExpiryPickerMinDate"
              :maxDate="shareExpiryPickerMaxDate"
              :dateFormat="shareExpiryPickerDateFormat"
              showTime
              showSeconds
              hourFormat="24"
              :stepMinute="1"
              :stepSecond="1"
              :manualInput="false"
              showIcon
              iconDisplay="input"
              fluid
              class="share-expiry-picker"
              :disabled="isUploading"
              :invalid="!isShareExpiryValid"
              aria-label="Share expiration date and time"
              @update:model-value="handleShareExpiryPickerDateUpdate"
            />
            <div class="share-expiry-tags">
              <Tag severity="secondary" value="Default: 31 days" :pt="shareExpiryTagPt" />
              <Tag severity="warn" :value="`Max retention: ${shareExpiryLabelMaxDays}`" :pt="shareExpiryTagPt" />
            </div>
          </div>

          <div class="share-expiry-step-timestamps">
            <div
              class="share-expiry-timezone-actions"
              role="radiogroup"
              aria-label="Expiration timezone editing mode"
            >
              <Button
                type="button"
                severity="secondary"
                class="share-expiry-timezone-button"
                :class="{ 'share-expiry-timezone-button--active': shareExpiryDisplayMode === 'local' }"
                :outlined="shareExpiryDisplayMode !== 'local'"
                :aria-pressed="shareExpiryDisplayMode === 'local'"
                @click="emit('update:shareExpiryDisplayMode', 'local')"
              >
                <span class="share-expiry-time-chip">
                  <div class="share-expiry-time-chip-copy">
                    <span class="share-expiry-time-chip-heading">
                      <i class="pi pi-clock" aria-hidden="true"></i>
                      <span class="share-expiry-time-chip-label">Local time</span>
                    </span>
                    <strong class="share-expiry-time-chip-value">
                      {{ shareExpiryLocalDisplay }}
                    </strong>
                  </div>
                </span>
              </Button>

              <Button
                type="button"
                severity="secondary"
                class="share-expiry-timezone-button share-expiry-timezone-button--utc"
                :class="{ 'share-expiry-timezone-button--active': shareExpiryDisplayMode === 'utc' }"
                :outlined="shareExpiryDisplayMode !== 'utc'"
                :aria-pressed="shareExpiryDisplayMode === 'utc'"
                @click="emit('update:shareExpiryDisplayMode', 'utc')"
              >
                <span class="share-expiry-time-chip share-expiry-time-chip--utc">
                  <div class="share-expiry-time-chip-copy">
                    <span class="share-expiry-time-chip-heading">
                      <i class="pi pi-globe" aria-hidden="true"></i>
                      <span class="share-expiry-time-chip-label">UTC reference</span>
                    </span>
                    <strong class="share-expiry-time-chip-value">
                      {{ shareExpiryUtcDisplay }}
                    </strong>
                  </div>
                </span>
              </Button>
            </div>
          </div>

          <p class="share-expiry-step-note">
            {{ shareExpiryPickerModeHint }}. Deletion is enforced server-side in UTC with
            seconds precision.
          </p>
          <div v-if="showShareExpiryCountdown && shareExpiryCountdownStatus" class="share-expiry-countdown-shell" aria-live="polite">
            <div class="share-expiry-countdown-head">
              <div class="share-expiry-countdown-title-row">
                <span
                  class="share-expiry-countdown-live-dot"
                  :class="`share-expiry-countdown-live-dot--${shareExpiryCountdownPresentation.liveDotModifier}`"
                  aria-hidden="true"
                ></span>
                <strong class="share-expiry-countdown-title">
                  {{ shareExpiryCountdownPresentation.title }}
                </strong>
              </div>
              <div class="share-expiry-countdown-chip-row">
                <span
                  class="share-expiry-countdown-phase-chip"
                  :class="`share-expiry-countdown-phase-chip--${shareExpiryCountdownPresentation.phaseModifier}`"
                >
                  {{ shareExpiryCountdownPresentation.phaseLabel }}
                </span>
                <span
                  class="share-expiry-countdown-status-chip"
                  :class="`share-expiry-countdown-status-chip--${shareExpiryCountdownStatus.modifier}`"
                >
                  {{ shareExpiryCountdownStatus.label }}
                </span>
              </div>
            </div>
            <p class="share-expiry-countdown-context">
              {{ shareExpiryCountdownPresentation.helper }}
            </p>
            <p class="share-expiry-countdown-schedule">
              Scheduled deletion:
              <strong>{{ shareExpiryDeletionScheduleLabel }}</strong>
            </p>
            <div class="share-expiry-countdown-grid" role="timer" aria-label="PSBT deletion countdown">
              <div
                v-for="unit in shareExpiryCountdownUnits"
                :key="unit.id"
                class="share-expiry-countdown-unit"
              >
                <Transition name="countdown-tick" mode="out-in">
                  <span :key="`${unit.id}-${unit.value}`" class="share-expiry-countdown-value">
                    {{ unit.value }}
                  </span>
                </Transition>
                <span class="share-expiry-countdown-label">{{ unit.label }}</span>
              </div>
            </div>
          </div>
          <p v-if="shareExpiryValidationMessage" class="share-expiry-error">
            {{ shareExpiryValidationMessage }}
          </p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
@import '../../css/share/step-collapse.css';
@import '../../css/share/countdown-grid.css';

.share-step-collapsible-body--expiry {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-expiry-step {
  position: relative;
  padding: 1px;
  border-radius: 0.95rem;
  background: linear-gradient(
    130deg,
    color-mix(in srgb, var(--p-primary-color) 22%, transparent),
    color-mix(in srgb, var(--accent) 24%, transparent)
  );
  box-shadow:
    0 10px 28px color-mix(in srgb, #000000 16%, transparent),
    0 1px 0 color-mix(in srgb, #ffffff 10%, transparent) inset;
}

.share-expiry-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.08rem 1.12rem 1.04rem;
  border-radius: calc(0.95rem - 1px);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--p-content-background, #0f172a) 95%, var(--p-primary-color) 5%),
    color-mix(in srgb, var(--p-content-background, #0f172a) 98%, transparent)
  );
}

.share-expiry-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.share-expiry-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  max-width: 46rem;
}

.share-expiry-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.share-expiry-kicker-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.5rem;
  padding: 0.14rem 0.44rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  font-family: 'Roboto Mono', monospace;
  font-size: 0.67rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.share-expiry-kicker-text {
  color: var(--p-text-muted-color);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-weight: 600;
}

.share-expiry-title {
  font-size: 0.95rem;
  line-height: 1.45;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.share-expiry-picker-row {
  --share-expiry-control-height: 2.75rem;
  display: flex;
  align-items: stretch;
  gap: 0.7rem;
  margin-top: 0.08rem;
}

.share-expiry-tags {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.4rem;
  min-height: var(--share-expiry-control-height);
  align-self: stretch;
  flex-shrink: 0;
}

:deep(.share-expiry-tag-pill.p-tag) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--share-expiry-control-height) !important;
  min-height: var(--share-expiry-control-height) !important;
  max-height: var(--share-expiry-control-height) !important;
  line-height: 1 !important;
  font-size: 0.67rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0 0.62rem;
  border-radius: 999px;
}

:deep(.share-expiry-tag-pill-label) {
  display: inline-flex;
  align-items: center;
  height: 100%;
  line-height: 1;
}

/* Fallback in case PT classes are not present in a given PrimeVue build. */
:deep(.share-expiry-tags .p-tag.p-component) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--share-expiry-control-height) !important;
  min-height: var(--share-expiry-control-height) !important;
  max-height: var(--share-expiry-control-height) !important;
  line-height: 1 !important;
  padding: 0 0.62rem;
}

:deep(.share-expiry-tags .p-tag.p-component .p-tag-label) {
  display: inline-flex;
  align-items: center;
  height: 100%;
  line-height: 1;
}

.share-expiry-step-copy {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.58;
  color: var(--p-text-muted-color);
}

.share-expiry-picker {
  flex: 1 1 auto;
  min-width: 0;
  margin-top: 0.08rem;
}

:deep(.share-expiry-picker .p-inputtext) {
  box-sizing: border-box;
  height: var(--share-expiry-control-height) !important;
  min-height: var(--share-expiry-control-height) !important;
  border-radius: 0.7rem;
  font-size: 0.9rem;
}

:deep(#share-expiry-picker > input.p-inputtext.p-datepicker-input) {
  box-sizing: border-box;
  height: var(--share-expiry-control-height) !important;
  min-height: var(--share-expiry-control-height) !important;
}

.share-expiry-step-timestamps {
  display: flex;
  width: 100%;
  margin-top: 0.14rem;
}

.share-expiry-timezone-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.68rem;
  width: 100%;
}

:deep(.share-expiry-timezone-button.p-button) {
  width: 100%;
  padding: 0;
  margin: 0;
  border-radius: 0.72rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 90%, transparent);
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 97%, transparent);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

:deep(.share-expiry-timezone-button.p-button:hover) {
  transform: translateY(-1px);
}

:deep(.share-expiry-timezone-button.p-button .p-button-label) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

:deep(.share-expiry-timezone-button.p-button.share-expiry-timezone-button--active) {
  border-color: color-mix(in srgb, var(--p-primary-color) 52%, transparent);
  background: color-mix(in srgb, var(--p-primary-color) 12%, var(--p-content-background, #0f172a));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--p-primary-color) 30%, transparent);
}

:deep(.share-expiry-timezone-button.p-button.share-expiry-timezone-button--active .share-expiry-time-chip--utc) {
  color: color-mix(in srgb, var(--accent-light) 80%, var(--p-text-color));
}

:deep(.share-expiry-timezone-button.p-button:focus-visible) {
  outline: 2px solid color-mix(in srgb, var(--p-primary-color) 65%, transparent);
  outline-offset: 2px;
}

.share-expiry-time-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.6rem 0.7rem;
  border-radius: 0.68rem;
  min-width: 0;
  text-align: center;
}

.share-expiry-time-chip-heading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.34rem;
  line-height: 1;
}

.share-expiry-time-chip-heading .pi {
  margin-top: 0;
  font-size: 0.76rem;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.share-expiry-time-chip--utc .share-expiry-time-chip-heading .pi {
  color: var(--accent-light);
}

.share-expiry-time-chip-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.22rem;
  min-width: 0;
  text-align: center;
}

.share-expiry-time-chip-label {
  font-size: 0.69rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
  color: var(--p-text-muted-color);
}

.share-expiry-time-chip-value {
  font-size: 0.76rem;
  line-height: 1.35;
  color: var(--p-text-muted-color);
  font-family: 'Roboto Mono', monospace;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.share-expiry-step-note {
  margin: 0.12rem 0 0;
  font-size: 0.74rem;
  line-height: 1.52;
  color: var(--text-dim);
}

.share-expiry-error {
  margin-top: -0.12rem;
  color: var(--p-red-500);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .share-expiry-shell {
    gap: 0.86rem;
    padding: 0.94rem;
  }

  .share-expiry-picker-row {
    align-items: stretch;
    flex-direction: column;
    gap: 0.62rem;
  }

  .share-expiry-tags {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .share-expiry-timezone-actions {
    grid-template-columns: 1fr;
  }
}
</style>
