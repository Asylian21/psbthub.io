<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Tag from 'primevue/tag'

type LifecycleCountdownStatus =
  | 'deleted'
  | 'expired'
  | 'critical'
  | 'warning'
  | 'active'

interface LifecycleCountdownUnit {
  key: 'days' | 'hours' | 'minutes' | 'seconds'
  label: string
  value: string
}

interface LifecycleStatusTag {
  severity: 'success' | 'warn' | 'danger' | 'secondary'
  value: string
}

interface DeleteFeedback {
  severity: 'success' | 'warn' | 'error'
  title: string
  detail: string
}

interface Props {
  lifecycleStatusTag: LifecycleStatusTag
  lifecycleSummaryText: string
  shouldShowLifecycleCountdown: boolean
  lifecycleCountdownStatus: LifecycleCountdownStatus
  lifecycleCountdownUnits: LifecycleCountdownUnit[]
  expiresAtDisplay: string
  expiresAtUtcDisplay: string
  deleteFeedback: DeleteFeedback | null
  manualDeleteButtonLabel: string
  isDeleteInProgress: boolean
  isManualDeleteDisabled: boolean
  isShareManuallyDeleted: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'request-manual-delete'): void
}>()
</script>

<template>
  <Card class="share-lifecycle-card">
    <template #content>
      <div class="share-lifecycle-content">
        <div class="share-lifecycle-header">
          <div class="share-lifecycle-title-wrap">
            <h2 class="share-lifecycle-title">Share lifecycle control</h2>
            <p class="share-lifecycle-subtitle">
              Automatic deletion countdown with optional manual removal.
            </p>
          </div>
          <Tag :severity="lifecycleStatusTag.severity" :value="lifecycleStatusTag.value" />
        </div>

        <p class="share-lifecycle-summary">{{ lifecycleSummaryText }}</p>

        <div
          v-if="shouldShowLifecycleCountdown"
          :class="[
            'share-lifecycle-countdown-shell',
            `share-lifecycle-countdown-shell--${lifecycleCountdownStatus}`,
          ]"
          role="timer"
          aria-live="polite"
        >
          <div class="share-lifecycle-countdown-grid">
            <div
              v-for="countdownUnit in lifecycleCountdownUnits"
              :key="countdownUnit.key"
              class="share-lifecycle-countdown-unit"
            >
              <span class="share-lifecycle-countdown-value">
                {{ countdownUnit.value }}
              </span>
              <span class="share-lifecycle-countdown-label">
                {{ countdownUnit.label }}
              </span>
            </div>
          </div>
        </div>

        <div class="share-lifecycle-schedule">
          <div v-if="expiresAtDisplay" class="share-lifecycle-schedule-line">
            <i class="pi pi-clock" aria-hidden="true"></i>
            <span>Scheduled deletion {{ expiresAtDisplay }}</span>
          </div>
          <div
            v-if="expiresAtUtcDisplay"
            class="share-lifecycle-schedule-line share-lifecycle-schedule-line--secondary"
          >
            <i class="pi pi-globe" aria-hidden="true"></i>
            <span>Scheduled deletion (UTC) {{ expiresAtUtcDisplay }}</span>
          </div>
        </div>

        <Message v-if="deleteFeedback" :severity="deleteFeedback.severity" class="share-lifecycle-feedback">
          <div class="share-lifecycle-feedback-copy" role="status" aria-live="polite">
            <p class="share-lifecycle-feedback-title">{{ deleteFeedback.title }}</p>
            <p class="share-lifecycle-feedback-detail">{{ deleteFeedback.detail }}</p>
          </div>
        </Message>

        <div class="share-lifecycle-actions">
          <Button
            :label="manualDeleteButtonLabel"
            icon="pi pi-trash"
            severity="danger"
            :outlined="!isShareManuallyDeleted"
            :disabled="isManualDeleteDisabled"
            :loading="isDeleteInProgress"
            @click="emit('request-manual-delete')"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.share-lifecycle-card {
  border: 1px solid color-mix(in srgb, var(--p-primary-color) 28%, var(--p-content-border-color));
  border-radius: 1.1rem;
  background: linear-gradient(
    168deg,
    color-mix(in srgb, var(--p-content-background, #0f172a) 96%, var(--p-primary-color) 4%),
    color-mix(in srgb, var(--p-content-background, #0f172a) 99%, transparent)
  );
  box-shadow:
    0 1px 2px color-mix(in srgb, #000000 10%, transparent),
    inset 0 1px 0 color-mix(in srgb, #ffffff 8%, transparent);
}

:deep(.share-lifecycle-card .p-card-body) {
  padding: clamp(1rem, 2.4vw, 1.5rem);
}

:deep(.share-lifecycle-card .p-card-content) {
  padding: 0;
}

.share-lifecycle-content {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.share-lifecycle-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.7rem;
}

.share-lifecycle-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.share-lifecycle-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 650;
  color: var(--p-text-color);
}

.share-lifecycle-subtitle {
  margin: 0;
  font-size: 0.83rem;
  color: var(--p-text-muted-color);
}

.share-lifecycle-summary {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.46;
  color: var(--p-text-muted-color);
}

.share-lifecycle-countdown-shell {
  border: 1px solid color-mix(in srgb, var(--p-primary-color) 18%, var(--p-content-border-color));
  border-radius: 0.8rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 94%, transparent);
  padding: 0.8rem;
}

.share-lifecycle-countdown-shell--warning {
  border-color: color-mix(in srgb, var(--p-yellow-500) 45%, var(--p-content-border-color));
}

.share-lifecycle-countdown-shell--critical {
  border-color: color-mix(in srgb, var(--p-red-500) 45%, var(--p-content-border-color));
}

.share-lifecycle-countdown-shell--expired {
  border-color: color-mix(in srgb, var(--p-red-500) 55%, var(--p-content-border-color));
}

.share-lifecycle-countdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}

.share-lifecycle-countdown-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.22rem;
  padding: 0.58rem 0.35rem;
  border-radius: 0.65rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 88%, transparent);
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 96%, transparent);
}

.share-lifecycle-countdown-value {
  font-family: 'Roboto Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 1.18rem;
  font-weight: 650;
  line-height: 1;
  color: var(--p-text-color);
}

.share-lifecycle-countdown-label {
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.share-lifecycle-schedule {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.share-lifecycle-schedule-line {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.share-lifecycle-schedule-line--secondary {
  opacity: 0.9;
}

.share-lifecycle-feedback {
  margin: 0;
}

:deep(.share-lifecycle-feedback .p-message-content) {
  align-items: flex-start;
}

.share-lifecycle-feedback-copy {
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
}

.share-lifecycle-feedback-title {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.share-lifecycle-feedback-detail {
  margin: 0;
  font-size: 0.81rem;
  line-height: 1.42;
  color: var(--p-text-muted-color);
}

.share-lifecycle-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.1rem;
}

@media (max-width: 640px) {
  .share-lifecycle-countdown-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .share-lifecycle-actions {
    justify-content: stretch;
  }

  :deep(.share-lifecycle-actions .p-button) {
    width: 100%;
    justify-content: center;
  }
}
</style>
