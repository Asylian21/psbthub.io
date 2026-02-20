<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShareCreatedAtInfo from '../components/ShareCreatedAtInfo.vue'
import ShareDeleteDialog from '../components/share/ShareDeleteDialog.vue'
import ShareLifecycleCard from '../components/share/ShareLifecycleCard.vue'
import SharePasswordGate from '../components/share/SharePasswordGate.vue'
import ThemeModeToggle from '../components/ThemeModeToggle.vue'
import {
  SHARE_DELETE_ERROR_PRESENTATIONS,
} from '../content/shareContent'
import {
  PSBT_DISPLAY_MODE_OPTIONS,
  usePsbtDisplay,
} from '../composables/usePsbtDisplay'
import {
  formatIntegerWithSpaces,
  formatKilobytesFromBytes,
} from '../composables/share/useSharePayloadFormats'
import { useShareExport } from '../composables/share/useShareExport'
import { useShareHashSync } from '../composables/share/useShareHashSync'
import { useShareLifecycle } from '../composables/share/useShareLifecycle'
import { useShareStatus } from '../composables/share/useShareStatus'
import { useCountdownTicker } from '../composables/shared/useCountdownTicker'
import {
  useFetch,
} from '../composables/useFetch'
import {
  validatePsbtBase64,
} from '../domain/psbt'
import { useAppStore } from '../stores/app'

/**
 * Share open/decrypt workspace.
 *
 * Handles fragment/password decryption flows, payload export, and
 * lifecycle management (countdown + optional manual deletion).
 */
const appStore = useAppStore()
const route = useRoute()
const router = useRouter()
const { copy, copied } = useClipboard()
const toast = useToast()
const {
  state: fetchState,
  fetchShare,
  decryptWithPassword,
  deleteShare,
  decryptCooldownEndTime,
} = useFetch()

const ONE_SECOND_IN_MILLISECONDS = 1000
const COLLAPSED_PSBT_VIEWER_HEIGHT_PX = 108

const { currentHash, syncCurrentHash } = useShareHashSync(() => {
  void loadShare()
})
const passwordInput = ref('')
const psbtViewerElement = ref<HTMLElement | null>(null)
const isPsbtViewerOverflowing = ref(false)
const psbtViewerAnimatedMaxHeightPx = ref<number>(COLLAPSED_PSBT_VIEWER_HEIGHT_PX)
const lifecycleTicker = useCountdownTicker({
  intervalMs: ONE_SECOND_IN_MILLISECONDS,
})
const lifecycleNowTimestamp = lifecycleTicker.nowTimestamp
const decryptTicker = useCountdownTicker({
  intervalMs: ONE_SECOND_IN_MILLISECONDS,
})
const decryptCooldownSeconds = computed<number>(() => {
  const remaining = decryptCooldownEndTime.value - decryptTicker.nowTimestamp.value
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
})
const isDeleteConfirmDialogVisible = ref(false)
const isDeleteInProgress = ref(false)
const isShareManuallyDeleted = ref(false)
const deleteFeedback = ref<{
  severity: 'success' | 'warn' | 'error'
  title: string
  detail: string
} | null>(null)
let deleteRedirectTimeoutId: number | null = null

const isDarkMode = computed({
  get: (): boolean => appStore.themeMode === 'dark',
  set: (value: boolean) => {
    appStore.setThemeMode(value ? 'dark' : 'light')
  },
})

const shareId = computed<string>(() => {
  const rawId = route.params.id
  return typeof rawId === 'string' ? rawId : ''
})

const hasFragmentKey = computed<boolean>(() => {
  const hash = currentHash.value.startsWith('#')
    ? currentHash.value.slice(1)
    : currentHash.value
  return new URLSearchParams(hash).has('k')
})

const {
  isAwaitingPassword,
  isLoading,
  statusSeverity,
  statusLabel,
  credentialStatusTag,
  fetchErrorPresentation,
  passwordPromptMessage,
  emptyStateMessage,
} = useShareStatus(fetchState, hasFragmentKey)

const decryptedPsbt = computed<string>(() => {
  if (fetchState.value.status !== 'success') {
    return ''
  }

  return fetchState.value.psbtBase64
})

const {
  psbtDisplayMode,
  isPsbtDisplayExpanded,
  displayedPsbtPayload,
  psbtDisplayHint,
  togglePsbtDisplayExpansion,
} = usePsbtDisplay(decryptedPsbt)

const createdAtTimestamp = computed<Date | null>(() => {
  if (
    fetchState.value.status !== 'success' &&
    fetchState.value.status !== 'awaiting_password'
  ) {
    return null
  }

  const parsedTimestamp = new Date(fetchState.value.createdAt)

  if (Number.isNaN(parsedTimestamp.getTime())) {
    return null
  }

  return parsedTimestamp
})

const createdAtDisplay = computed<string>(() => {
  if (
    fetchState.value.status !== 'success' &&
    fetchState.value.status !== 'awaiting_password'
  ) {
    return ''
  }

  if (!createdAtTimestamp.value) {
    return fetchState.value.createdAt
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(createdAtTimestamp.value)
})

const createdAtUtcDisplay = computed<string>(() => {
  if (!createdAtTimestamp.value) {
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
  }).format(createdAtTimestamp.value)
})

const {
  activeShareId,
  expiresAtDisplay,
  expiresAtUtcDisplay,
  lifecycleCountdownUnits,
  lifecycleCountdownStatus,
  lifecycleStatusTag,
  shouldShowLifecycleCard,
  shouldShowLifecycleCountdown,
  shouldRunLifecycleTicker,
  manualDeleteButtonLabel,
  lifecycleSummaryText,
} = useShareLifecycle(
  fetchState,
  lifecycleNowTimestamp,
  isShareManuallyDeleted,
  isDeleteInProgress,
)

const psbtIntegrityStatus = computed<{
  severity: 'success' | 'danger'
  label: string
  detail: string
  metrics: {
    bytes: string
    kilobytes: string
  } | null
} | null>(() => {
  if (!decryptedPsbt.value) {
    return null
  }

  const validationResult = validatePsbtBase64(decryptedPsbt.value)

  if (validationResult.ok) {
    return {
      severity: 'success',
      label: 'PSBT integrity check passed',
      detail: 'PSBT payload parsed successfully.',
      metrics: {
        bytes: formatIntegerWithSpaces(validationResult.value.byteLength),
        kilobytes: formatKilobytesFromBytes(validationResult.value.byteLength),
      },
    }
  }

  return {
    severity: 'danger',
    label: 'PSBT integrity check failed',
    detail: validationResult.error.message,
    metrics: null,
  }
})

const canExportPsbt = computed<boolean>(() => {
  return psbtIntegrityStatus.value?.severity === 'success'
})

const {
  qrImageDataUrl,
  qrImageError,
  qrExportFormatLabel,
  qrExportFormatSeverity,
  qrExportFileName,
  copyPsbt,
  downloadPsbtBinary,
  downloadPsbtText,
  downloadQrImage,
  regenerateQrPreview,
} = useShareExport({
  decryptedPsbt,
  shareId,
  psbtDisplayMode,
  canExportPsbt,
  copyToClipboard: copy,
})

const shouldShowFullPsbtToggle = computed<boolean>(() => {
  return !isPsbtDisplayExpanded.value && isPsbtViewerOverflowing.value
})

const shouldShowLessPsbtToggle = computed<boolean>(() => {
  return isPsbtDisplayExpanded.value && Boolean(displayedPsbtPayload.value)
})

const psbtViewerStyle = computed<Record<'maxHeight', string>>(() => {
  const maxHeightPx = isPsbtDisplayExpanded.value
    ? psbtViewerAnimatedMaxHeightPx.value
    : COLLAPSED_PSBT_VIEWER_HEIGHT_PX

  return {
    maxHeight: `${maxHeightPx}px`,
  }
})

function resetLifecycleManagementState(): void {
  if (deleteRedirectTimeoutId !== null) {
    window.clearTimeout(deleteRedirectTimeoutId)
    deleteRedirectTimeoutId = null
  }
  isDeleteConfirmDialogVisible.value = false
  isDeleteInProgress.value = false
  isShareManuallyDeleted.value = false
  deleteFeedback.value = null
}

function startLifecycleTicker(): void {
  lifecycleTicker.start()
}

function stopLifecycleTicker(): void {
  lifecycleTicker.stop()
}

function openDeleteConfirmDialog(): void {
  if (!activeShareId.value || isDeleteInProgress.value || isShareManuallyDeleted.value) {
    return
  }

  isDeleteConfirmDialogVisible.value = true
}

function closeDeleteConfirmDialog(): void {
  if (isDeleteInProgress.value) {
    return
  }

  isDeleteConfirmDialogVisible.value = false
}

function handleDeleteDialogVisibility(nextVisible: boolean): void {
  if (nextVisible) {
    isDeleteConfirmDialogVisible.value = true
    return
  }

  closeDeleteConfirmDialog()
}

function scheduleRedirectToHomeAfterDelete(): void {
  if (deleteRedirectTimeoutId !== null) {
    window.clearTimeout(deleteRedirectTimeoutId)
  }

  deleteRedirectTimeoutId = window.setTimeout(() => {
    deleteRedirectTimeoutId = null
    void router.push({ name: 'home' })
  }, 850)
}

async function confirmManualDelete(): Promise<void> {
  if (!activeShareId.value || isDeleteInProgress.value || isShareManuallyDeleted.value) {
    return
  }

  isDeleteInProgress.value = true
  deleteFeedback.value = null

  const deleteResult = await deleteShare(activeShareId.value)

  isDeleteInProgress.value = false
  isDeleteConfirmDialogVisible.value = false

  if (!deleteResult.ok) {
    const deleteErrorPresentation = SHARE_DELETE_ERROR_PRESENTATIONS[deleteResult.code]
    deleteFeedback.value = {
      severity: 'error',
      title: deleteErrorPresentation.title,
      detail: deleteErrorPresentation.detail,
    }
    return
  }

  isShareManuallyDeleted.value = true

  if (!deleteResult.deleted) {
    deleteFeedback.value = {
      severity: 'warn',
      title: 'Share already removed',
      detail:
        'This share is no longer present on the server. Refreshing this page should show it as unavailable.',
    }
    toast.add({
      severity: 'warn',
      summary: 'Share already removed',
      detail: 'Redirecting to homepage.',
      life: 2400,
    })
    scheduleRedirectToHomeAfterDelete()
    return
  }

  deleteFeedback.value = {
    severity: 'success',
    title: 'Share deleted from server',
    detail:
      'The remote ciphertext was removed successfully. Refreshing this page will show this share as unavailable.',
  }
  toast.add({
    severity: 'success',
    summary: 'Share deleted',
    detail: 'Redirecting to homepage.',
    life: 2200,
  })
  scheduleRedirectToHomeAfterDelete()
}

async function loadShare(): Promise<void> {
  passwordInput.value = ''
  await fetchShare(shareId.value)
}

async function decryptWithSubmittedPassword(): Promise<void> {
  await decryptWithPassword(passwordInput.value)
}

function refreshPsbtViewerAnimatedHeight(): void {
  const viewerElement = psbtViewerElement.value
  if (!viewerElement) {
    return
  }

  const measuredHeightPx = Math.ceil(viewerElement.scrollHeight)
  psbtViewerAnimatedMaxHeightPx.value = Math.max(
    measuredHeightPx,
    COLLAPSED_PSBT_VIEWER_HEIGHT_PX,
  )
}

function togglePsbtViewerExpansion(): void {
  if (!isPsbtDisplayExpanded.value) {
    refreshPsbtViewerAnimatedHeight()
  }

  togglePsbtDisplayExpansion()
}

function showFullPsbtPayload(): void {
  refreshPsbtViewerAnimatedHeight()
  isPsbtDisplayExpanded.value = true
}

function showLessPsbtPayload(): void {
  isPsbtDisplayExpanded.value = false
}

function updatePsbtViewerOverflowState(): void {
  const viewerElement = psbtViewerElement.value

  if (!viewerElement || isPsbtDisplayExpanded.value) {
    isPsbtViewerOverflowing.value = false
    return
  }

  isPsbtViewerOverflowing.value = viewerElement.scrollHeight > viewerElement.clientHeight + 1
}

function handleWindowResize(): void {
  refreshPsbtViewerAnimatedHeight()
  updatePsbtViewerOverflowState()
}

watch(
  () => route.params.id,
  () => {
    resetLifecycleManagementState()
    void loadShare()
  },
  { immediate: true },
)

watch(
  () => shouldRunLifecycleTicker.value,
  (shouldRunTicker) => {
    if (shouldRunTicker) {
      startLifecycleTicker()
      return
    }

    stopLifecycleTicker()
  },
  { immediate: true },
)

watch(
  () => decryptCooldownEndTime.value,
  (endTime) => {
    if (endTime > Date.now()) {
      decryptTicker.syncNow()
      decryptTicker.start()
      return
    }

    decryptTicker.stop()
  },
)

watch(
  () => fetchState.value.status,
  (nextStatus) => {
    if (nextStatus === 'success') {
      passwordInput.value = ''
      syncCurrentHash()
    }
  },
)

watch(
  decryptedPsbt,
  (nextValue) => {
    void regenerateQrPreview(nextValue, psbtDisplayMode.value)
  },
  { immediate: true },
)

watch(
  psbtDisplayMode,
  (nextMode) => {
    void regenerateQrPreview(decryptedPsbt.value, nextMode)
  },
)

watch(
  psbtDisplayMode,
  () => {
    isPsbtDisplayExpanded.value = false
  },
)

watch(
  [displayedPsbtPayload, psbtDisplayMode, isPsbtDisplayExpanded],
  async () => {
    await nextTick()
    refreshPsbtViewerAnimatedHeight()
    updatePsbtViewerOverflowState()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  if (deleteRedirectTimeoutId !== null) {
    window.clearTimeout(deleteRedirectTimeoutId)
    deleteRedirectTimeoutId = null
  }
  window.removeEventListener('resize', handleWindowResize)
  stopLifecycleTicker()
  decryptTicker.stop()
})
</script>

<template>
  <main
    class="page-shell min-h-screen px-[clamp(1rem,4vw,2.3rem)] py-[clamp(1.75rem,4.4vw,3.2rem)] text-(--p-text-color) transition-[background-color,color] duration-200 ease-in-out"
  >
    <Toast position="top-right" />
    <section class="page-content mx-auto flex w-full max-w-4xl flex-col gap-[clamp(1.35rem,2.5vw,2rem)]">
      <header class="page-header flex flex-wrap items-start justify-between gap-[clamp(0.9rem,2vw,1.35rem)]">
        <div class="header-copy flex flex-col gap-[0.85rem]">
          <div class="header-meta flex flex-wrap items-center gap-[0.85rem]">
            <RouterLink class="back-link inline-flex items-center gap-[0.4rem] text-[0.9rem] text-(--p-primary-color) no-underline" to="/">
              <i class="pi pi-arrow-left" aria-hidden="true"></i>
              Back to upload
            </RouterLink>
            <Tag severity="secondary" value="PSBT share" />
          </div>
          <h1 class="text-3xl font-semibold">
            {{ appStore.appName }}
          </h1>
        </div>

        <ThemeModeToggle
          v-model="isDarkMode"
          mode="rail"
          class="theme-switch inline-flex items-center gap-2 rounded-full border border-(--p-content-border-color) bg-(--p-content-background) px-[0.8rem] py-[0.45rem] text-(--p-text-muted-color)"
          input-id="theme-toggle"
          aria-label="Toggle dark mode"
        />
      </header>

      <Card class="handoff-card rounded-[1.1rem] border border-(--p-content-border-color)">
        <template #content>
          <div class="share-card-content">
            <div class="share-card-header">
              <h2 class="share-card-title">Decrypt PSBT share</h2>
              <div class="share-card-status-tags">
                <Tag :severity="credentialStatusTag.severity" :value="credentialStatusTag.value" />
                <Tag :severity="statusSeverity" :value="statusLabel" />
              </div>
            </div>
            <Divider class="share-card-divider" />

            <Message
              v-if="fetchErrorPresentation"
              severity="error"
              class="fetch-error-message"
            >
              <div class="fetch-error-content" role="alert" aria-live="polite">
                <p class="fetch-error-title">{{ fetchErrorPresentation.title }}</p>
                <p class="fetch-error-detail">{{ fetchErrorPresentation.detail }}</p>
              </div>
            </Message>

            <div v-if="isLoading" class="loading-state">
              Loading encrypted share...
            </div>

            <SharePasswordGate
              v-else-if="isAwaitingPassword"
              :created-at-display="createdAtDisplay"
              :created-at-utc-display="createdAtUtcDisplay"
              :password-input="passwordInput"
              :password-prompt-message="passwordPromptMessage"
              :decrypt-cooldown-seconds="decryptCooldownSeconds"
              @update:password-input="passwordInput = $event"
              @decrypt="decryptWithSubmittedPassword"
            />

            <div v-else-if="decryptedPsbt" class="share-result-stack">
              <div v-if="psbtIntegrityStatus" class="integrity-status">
                <div class="integrity-detail">
                  <template v-if="psbtIntegrityStatus.metrics">
                    <div class="integrity-metrics">
                      <span class="integrity-metrics-title">Transaction size:</span>
                      <span class="integrity-metric">
                        <span class="integrity-metric-value">{{ psbtIntegrityStatus.metrics.bytes }}</span>
                        <span class="integrity-metric-label">B</span>
                      </span>
                      <span class="integrity-metric">
                        <span class="integrity-metric-value">{{ psbtIntegrityStatus.metrics.kilobytes }}</span>
                        <span class="integrity-metric-label">KB</span>
                      </span>
                    </div>
                  </template>
                  <template v-else>
                    <span class="integrity-detail-note">{{ psbtIntegrityStatus.detail }}</span>
                  </template>
                </div>
                <Tag
                  :severity="psbtIntegrityStatus.severity"
                  :value="psbtIntegrityStatus.label"
                  class="integrity-status-tag"
                />
              </div>

              <ShareCreatedAtInfo
                v-if="createdAtDisplay"
                :created-at-display="createdAtDisplay"
                :created-at-utc-display="createdAtUtcDisplay"
              />

              <p class="verify-note">
                Verify outputs, amounts, and fee in your wallet before signing. PSBTHub never signs or broadcasts.
              </p>

              <div class="psbt-view-toolbar">
                <span class="psbt-view-label">
                  Decrypted PSBT payload
                </span>
                <div class="psbt-view-controls">
                  <SelectButton
                    v-model="psbtDisplayMode"
                    :options="PSBT_DISPLAY_MODE_OPTIONS"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                    aria-label="PSBT display format selector"
                  >
                    <template #option="{ option }">
                      <span class="psbt-mode-option">
                        <span
                          class="psbt-mode-option-dot"
                          :class="{ 'psbt-mode-option-dot--active': psbtDisplayMode === option.value }"
                          aria-hidden="true"
                        ></span>
                        <span>{{ option.label }}</span>
                        <i
                          v-if="psbtDisplayMode === option.value"
                          class="pi pi-check psbt-mode-option-check"
                          aria-hidden="true"
                        ></i>
                      </span>
                    </template>
                  </SelectButton>
                  <Button
                    :label="isPsbtDisplayExpanded ? 'Collapse' : 'Expand'"
                    :icon="isPsbtDisplayExpanded ? 'pi pi-compress' : 'pi pi-expand'"
                    severity="secondary"
                    text
                    size="small"
                    @click="togglePsbtViewerExpansion"
                  />
                </div>
              </div>
              <p v-if="psbtDisplayHint" class="psbt-display-hint">
                {{ psbtDisplayHint }}
              </p>
              <div
                ref="psbtViewerElement"
                id="decrypted-psbt"
                :class="[
                  'decrypted-psbt-viewer',
                  { 'decrypted-psbt-viewer--expanded': isPsbtDisplayExpanded },
                ]"
                :style="psbtViewerStyle"
                role="region"
                aria-label="Decrypted PSBT payload"
              >
                <pre class="decrypted-psbt-content">{{ displayedPsbtPayload }}</pre>
                <div v-if="!isPsbtDisplayExpanded" class="decrypted-psbt-fade" aria-hidden="true"></div>
              </div>
              <Button
                v-if="shouldShowFullPsbtToggle || shouldShowLessPsbtToggle"
                :label="isPsbtDisplayExpanded ? 'Show less' : 'Show full'"
                :icon="isPsbtDisplayExpanded ? 'pi pi-angle-up' : 'pi pi-angle-down'"
                icon-pos="right"
                severity="secondary"
                text
                size="small"
                class="psbt-show-full-button"
                @click="isPsbtDisplayExpanded ? showLessPsbtPayload() : showFullPsbtPayload()"
              />
              <div class="share-actions-row">
                <Button label="Copy PSBT" icon="pi pi-copy" :disabled="!canExportPsbt" @click="copyPsbt" />
                <Button
                  label="Download .psbt"
                  icon="pi pi-download"
                  severity="secondary"
                  :disabled="!canExportPsbt"
                  @click="downloadPsbtBinary"
                />
                <Button
                  label="Download .txt"
                  icon="pi pi-file"
                  severity="secondary"
                  outlined
                  :disabled="!canExportPsbt"
                  @click="downloadPsbtText"
                />
              </div>
              <span v-if="copied" class="copy-status">PSBT copied to clipboard.</span>

              <div :class="['qr-export-panel', { 'qr-export-panel--error': qrImageError }]">
                <template v-if="qrImageError">
                  <div class="qr-error-state" role="alert" aria-live="polite">
                    <i class="pi pi-exclamation-triangle qr-error-icon" aria-hidden="true"></i>
                    <p class="qr-error-title">QR export unavailable</p>
                    <p class="qr-error-message">{{ qrImageError }}</p>
                    <p class="qr-error-description">
                      Download the transaction using <strong>Download .psbt</strong> or
                      <strong>Download .txt</strong> above.
                    </p>
                  </div>
                </template>
                <template v-else>
                  <p class="font-medium qr-export-title">
                    QR export (single image) -
                    <Tag
                      :severity="qrExportFormatSeverity"
                      :value="`${qrExportFormatLabel} format`"
                      class="qr-export-format-tag"
                    />
                  </p>
                  <p class="qr-export-meta">
                    If QR image generation fails, use base64 copy or .psbt export.
                  </p>
                  <img
                    v-if="qrImageDataUrl"
                    :src="qrImageDataUrl"
                    alt="PSBT QR export"
                    class="qr-preview-image"
                  />
                  <p class="qr-download-filename">
                    <span class="qr-download-filename-value">{{ qrExportFileName }}</span>
                  </p>
                  <Button
                    label="Download QR image"
                    icon="pi pi-qrcode"
                    severity="secondary"
                    outlined
                    class="qr-download-button"
                    :disabled="!qrImageDataUrl"
                    @click="downloadQrImage"
                  />
                </template>
              </div>
            </div>

            <div v-else class="empty-state">
              <p>{{ emptyStateMessage }}</p>
              <Button
                label="Retry"
                severity="secondary"
                outlined
                icon="pi pi-refresh"
                @click="loadShare"
              />
            </div>
          </div>
        </template>
      </Card>

      <ShareLifecycleCard
        v-if="shouldShowLifecycleCard"
        :lifecycle-status-tag="lifecycleStatusTag"
        :lifecycle-summary-text="lifecycleSummaryText"
        :should-show-lifecycle-countdown="shouldShowLifecycleCountdown"
        :lifecycle-countdown-status="lifecycleCountdownStatus"
        :lifecycle-countdown-units="lifecycleCountdownUnits"
        :expires-at-display="expiresAtDisplay"
        :expires-at-utc-display="expiresAtUtcDisplay"
        :delete-feedback="deleteFeedback"
        :manual-delete-button-label="manualDeleteButtonLabel"
        :is-delete-in-progress="isDeleteInProgress"
        :is-manual-delete-disabled="!activeShareId || isShareManuallyDeleted || isDeleteInProgress"
        :is-share-manually-deleted="isShareManuallyDeleted"
        @request-manual-delete="openDeleteConfirmDialog"
      />

      <ShareDeleteDialog
        :visible="isDeleteConfirmDialogVisible"
        :is-delete-in-progress="isDeleteInProgress"
        @update:visible="handleDeleteDialogVisibility"
        @confirm="confirmManualDelete"
      />
    </section>
  </main>
</template>

<style scoped>
@import '../css/share/psbt-viewer.css';

:deep(.handoff-card .p-card-body) {
  padding: clamp(1rem, 2.2vw, 1.65rem);
}

:deep(.handoff-card .p-card-content) {
  padding: 0;
}

.share-card-content {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.share-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.share-card-title {
  margin: 0;
  font-size: 1.14rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.share-card-status-tags {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.share-card-divider {
  margin: 0.1rem 0 0.2rem;
}

.fetch-error-message {
  margin: 0;
}

:deep(.fetch-error-message .p-message-content) {
  align-items: flex-start;
}

.fetch-error-content {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.fetch-error-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.fetch-error-detail {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
}

.loading-state,
.empty-state {
  color: var(--p-text-muted-color);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}








.copy-status {
  font-size: 0.875rem;
  color: var(--p-primary-color);
  text-align: center;
}

.share-result-stack {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.integrity-status {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.66rem 0.78rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 88%, transparent);
  border-radius: 0.7rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 96%, transparent);
}

.integrity-status-tag {
  justify-self: end;
  flex-shrink: 0;
}

.integrity-detail {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
  color: var(--p-text-muted-color);
  font-size: 0.82rem;
}

.integrity-metrics {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.integrity-metrics-title {
  font-size: 0.74rem;
  color: var(--p-text-muted-color);
}

.integrity-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 86%, transparent);
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 94%, transparent);
}

.integrity-metric-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.69rem;
  color: var(--p-text-muted-color);
}

.integrity-metric-value {
  min-width: 5ch;
  text-align: right;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
  color: var(--p-text-color);
  font-variant-numeric: tabular-nums;
}

.integrity-detail-note {
  color: var(--p-text-muted-color);
  line-height: 1.3;
}

.decrypted-psbt-viewer {
  position: relative;
  min-height: 6.75rem;
  max-height: 6.75rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--p-primary-color) 16%, var(--p-content-border-color));
  border-radius: 0.72rem;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--p-content-background, #0f172a) 94%, var(--p-primary-color) 6%),
    color-mix(in srgb, var(--p-content-background, #0f172a) 98%, transparent)
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #ffffff 10%, transparent),
    0 1px 2px color-mix(in srgb, #000000 15%, transparent);
  transition: max-height 0.3s cubic-bezier(0.2, 0, 0.1, 1);
  will-change: max-height;
}

.decrypted-psbt-content {
  margin: 0;
  min-height: 100%;
  padding: 0.72rem 0.82rem;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.79rem;
  line-height: 1.43;
  letter-spacing: 0.01em;
  color: var(--p-text-color);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.decrypted-psbt-fade {
  position: absolute;
  inset: auto 0 0;
  height: 2.1rem;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--p-content-background, #0f172a) 0%, transparent),
    color-mix(in srgb, var(--p-content-background, #0f172a) 93%, var(--p-primary-color) 7%)
  );
}

.psbt-show-full-button {
  align-self: center;
  margin-top: -0.2rem;
}

.verify-note {
  margin: 0;
  padding: 0.65rem 0.78rem;
  border: 1px solid color-mix(in srgb, var(--p-primary-color) 14%, var(--p-content-border-color));
  border-radius: 0.72rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 96%, transparent);
  color: var(--p-text-muted-color);
  font-size: 0.82rem;
  line-height: 1.45;
  text-align: center;
}

.share-actions-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.82rem;
  padding-top: 0.1rem;
}

.qr-export-panel {
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.88rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 97%, transparent);
}

.qr-export-panel--error {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--p-content-border-color) 90%, transparent);
  border-radius: 0;
  background: transparent;
  padding-inline: 0.25rem;
}

.qr-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.56rem;
  text-align: center;
  width: 100%;
  padding: 1rem 0.25rem 0.55rem;
  background: color-mix(in srgb, var(--p-red-500) 10%, var(--p-content-background, #0f172a));
  border-radius: 0.68rem;
}

.qr-error-icon {
  font-size: 1.32rem;
  color: var(--p-red-500);
}

.qr-error-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.qr-error-message {
  margin: 0;
  font-size: 0.86rem;
  color: var(--p-red-500);
}

.qr-error-description {
  margin: 0;
  max-width: 48ch;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
  line-height: 1.4;
}

.qr-export-meta {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
  text-align: center;
}

.qr-export-title {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  width: 100%;
  text-align: center;
}

.qr-export-format-tag {
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.qr-preview-image {
  width: min(100%, 20rem);
  display: block;
  margin-inline: auto;
  border-radius: 0.5rem;
  border: 1px solid var(--p-content-border-color);
  background: white;
  padding: 0.35rem;
}

.qr-download-button {
  align-self: center;
}

.qr-download-filename {
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.qr-download-filename-value {
  font-family: 'Roboto Mono', monospace;
  color: var(--p-text-color);
}

@media (prefers-reduced-motion: reduce) {
  .decrypted-psbt-viewer {
    transition: none;
  }
}

@media (max-width: 640px) {
  .page-shell {
    padding:
      1.15rem
      0.8rem;
  }

  .integrity-status {
    grid-template-columns: 1fr;
  }

  .integrity-status-tag {
    justify-self: start;
  }

}
</style>
