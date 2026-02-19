<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import Card from 'primevue/card'
import { type FileUploadSelectEvent } from 'primevue/fileupload'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import HomeActionBar from '../components/home/HomeActionBar.vue'
import HomeExpiryStep from '../components/home/HomeExpiryStep.vue'
import HomeImportStep from '../components/home/HomeImportStep.vue'
import HomeResetConfirmDialog from '../components/home/HomeResetConfirmDialog.vue'
import HomeSecurityStep from '../components/home/HomeSecurityStep.vue'
import HomeShareSuccessDialog from '../components/home/HomeShareSuccessDialog.vue'
import ThemeModeToggle from '../components/ThemeModeToggle.vue'
import {
  PSBT_DISPLAY_MODE_OPTIONS,
  usePsbtDisplay,
} from '../composables/usePsbtDisplay'
import {
  detectLocalDatePickerFormat,
  type ShareExpiryDisplayMode,
} from '../composables/home/useHomeExpiryDateMode'
import { useHomeExpiry } from '../composables/home/useHomeExpiry'
import {
  extractFirstSelectedFile,
  parsePsbtFile,
} from '../composables/home/useHomeImport'
import { useHomePasswordStrength } from '../composables/home/useHomePasswordStrength'
import { useHomeSecurityMode } from '../composables/home/useHomeSecurityMode'
import { useStepCollapseTransition } from '../composables/home/useStepCollapseTransition'
import { useCountdownTicker } from '../composables/shared/useCountdownTicker'
import {
  useUpload,
  type ShareSecurityOptions,
} from '../composables/useUpload'
import { useQrCamera } from '../composables/useQrCamera'
import {
  validatePsbtPayloadText,
  type ValidatedPsbt,
} from '../domain/psbt'
import {
  validateSharePassword,
} from '../domain/sharePassword'
import {
  MAX_SHARE_EXPIRY_DAYS,
  createDefaultShareExpiryDate,
  createShareExpiryBounds,
} from '../domain/shareExpiry'
import { useAppStore } from '../stores/app'
import {
  HOME_MAX_QR_IMAGE_FILE_SIZE_BYTES,
  HOME_SHARE_EXPIRY_TAG_PT,
  HOME_SHARE_SECURITY_MODE_OPTIONS,
  type ShareSecurityOptionContent,
} from '../content/homeContent'
import { scanQrImageFile } from '../utils/qr'
import { APP_MAX_PSBT_BYTES, formatByteSize } from '../utils/settings'

/**
 * Main app workspace for creating encrypted shares.
 *
 * Orchestrates a 3-step flow:
 * 1) PSBT import/validation
 * 2) security mode selection
 * 3) retention/expiry policy selection
 */
type ImportPanel = '0' | '1' | '2'
type ShareStep = 'import' | 'security' | 'expiry'

const SHARE_SECURITY_MODE_OPTIONS = HOME_SHARE_SECURITY_MODE_OPTIONS

const MAX_PSBT_IMPORT_FILE_SIZE = APP_MAX_PSBT_BYTES
const MAX_PSBT_IMPORT_FILE_SIZE_LABEL = formatByteSize(MAX_PSBT_IMPORT_FILE_SIZE)
const MAX_QR_IMAGE_FILE_SIZE = HOME_MAX_QR_IMAGE_FILE_SIZE_BYTES
const SHARE_EXPIRY_LABEL_MAX_DAYS = `${MAX_SHARE_EXPIRY_DAYS} days`
const LOCAL_DATE_PICKER_FORMAT = detectLocalDatePickerFormat()
const currentYear = new Date().getFullYear()
const shareExpiryTagPt = HOME_SHARE_EXPIRY_TAG_PT

const appStore = useAppStore()
const psbtInput = ref('')
const activeImportPanel = ref<ImportPanel>('1')
const importedPsbtFileName = ref('')
const shareExpiryReferenceDate = new Date()
const selectedShareExpiry = ref<Date | null>(
  createDefaultShareExpiryDate(shareExpiryReferenceDate),
)
const shareExpiryBounds = ref(createShareExpiryBounds(shareExpiryReferenceDate))
const shareExpiryDisplayMode = ref<ShareExpiryDisplayMode>('local')
const isShareStepExpanded = ref<Record<ShareStep, boolean>>({
  import: true,
  security: false,
  expiry: false,
})
const isResetConfirmVisible = ref(false)
const isShareSuccessDialogVisible = ref(false)
const successShareLink = ref('')
const successSharePassword = ref('')
const successShareExpiryTimestamp = ref<number | null>(null)
const successShareExpiryScheduleLabel = ref('')
const qrVideoElement = ref<HTMLVideoElement | null>(null)
const shareSecurityStepElement = ref<HTMLElement | null>(null)
const shouldScrollAfterImportCollapse = ref(false)
const shareExpiryTicker = useCountdownTicker()
const shareExpiryCountdownNow = shareExpiryTicker.nowTimestamp
const {
  handleStepCollapseBeforeEnter,
  handleStepCollapseEnter,
  handleStepCollapseAfterEnter,
  handleStepCollapseBeforeLeave,
  handleStepCollapseLeave,
  handleStepCollapseAfterLeave,
} = useStepCollapseTransition({
  onAfterLeave: (htmlElement) => {
    if (
      shouldScrollAfterImportCollapse.value &&
      htmlElement.classList.contains('share-step-collapsible-body--import')
    ) {
      shouldScrollAfterImportCollapse.value = false
      void scrollToShareSecurityStepTop()
    }
  },
})

const { copy, copied } = useClipboard()
const toast = useToast()
const { state: uploadState, isSupabaseReady, createShareLink, reset } = useUpload()
const {
  selectedShareSecurityMode,
  sharePasswordInput,
  hasAcknowledgedFragmentModeRisk,
  isPasswordSecurityMode,
  isFragmentModeAcknowledged,
  generateAndApplySharePassword,
  clearSharePassword,
  resetShareSecuritySelection,
} = useHomeSecurityMode({
  onSecurityStateChanged: () => {
    reset()
  },
  onSecurityError: (message: string) => {
    showSecurityError(message)
  },
})
const {
  state: qrCameraState,
  start: startQrCamera,
  stop: stopQrCamera,
} = useQrCamera()

const psbtValidationResult = computed(() =>
  validatePsbtPayloadText(psbtInput.value, MAX_PSBT_IMPORT_FILE_SIZE),
)
const isPsbtValid = computed<boolean>(() => psbtValidationResult.value.ok)
const shouldAnimateImportStep = computed<boolean>(
  () => isShareStepExpanded.value.import && !isPsbtValid.value,
)
const previewPsbtBase64 = computed<string>(() => {
  if (!psbtValidationResult.value.ok) {
    return ''
  }

  return psbtValidationResult.value.value.base64
})
const {
  psbtDisplayMode,
  isPsbtDisplayExpanded,
  displayedPsbtPayload,
  psbtDisplayHint,
  togglePsbtDisplayExpansion,
} = usePsbtDisplay(previewPsbtBase64)
const isUploading = computed<boolean>(() => uploadState.value.status === 'loading')
const isCameraStarting = computed<boolean>(
  () => qrCameraState.value.status === 'starting',
)
const isCameraScanning = computed<boolean>(
  () => qrCameraState.value.status === 'scanning',
)
const shouldShowCameraStatus = computed<boolean>(
  () => qrCameraState.value.status !== 'idle',
)

const uploadError = computed<string>(() => {
  if (uploadState.value.status !== 'error') {
    return ''
  }

  return uploadState.value.message
})
const selectedShareSecurityOption = computed<ShareSecurityOptionContent>(() => {
  return (
    SHARE_SECURITY_MODE_OPTIONS.find(
      (option) => option.value === selectedShareSecurityMode.value,
    ) ?? SHARE_SECURITY_MODE_OPTIONS[0]!
  )
})
const sharePasswordValidationResult = computed(() =>
  validateSharePassword(sharePasswordInput.value),
)
const isSharePasswordValid = computed<boolean>(() => {
  if (!isPasswordSecurityMode.value) {
    return true
  }

  return sharePasswordValidationResult.value.ok
})
const sharePasswordValidationMessage = computed<string>(() => {
  if (!isPasswordSecurityMode.value || sharePasswordValidationResult.value.ok) {
    return ''
  }

  return sharePasswordValidationResult.value.error.message
})
const isShareUploaded = computed<boolean>(() => uploadState.value.status === 'success')
const {
  sharePasswordStrength,
  sharePasswordStrengthClass,
  sharePasswordStrengthDisplay,
  sharePasswordSignalItems,
} = useHomePasswordStrength(sharePasswordInput)
const {
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
} = useHomeExpiry({
  selectedShareExpiry,
  shareExpiryDisplayMode,
  shareExpiryBounds,
  shareExpiryCountdownNow,
  isPsbtValid,
  isShareUploaded,
  successShareExpiryTimestamp,
  localDatePickerFormat: LOCAL_DATE_PICKER_FORMAT,
})

const canGenerateLink = computed<boolean>(() => {
  return (
    isPsbtValid.value &&
    isSharePasswordValid.value &&
    isShareExpiryValid.value &&
    !isUploading.value &&
    isSupabaseReady.value &&
    isFragmentModeAcknowledged.value
  )
})
const hasPsbtInput = computed<boolean>(() => psbtInput.value.trim().length > 0)
const hasValidImportedFile = computed<boolean>(() => {
  return importedPsbtFileName.value.trim().length > 0 && isPsbtValid.value
})
const shareLinkSegments = computed<{
  origin: string
  sharePath: string
  keyFragment: string | null
} | null>(() => {
  const trimmedLink = successShareLink.value.trim()

  if (!trimmedLink) {
    return null
  }

  try {
    const parsedLink = new URL(trimmedLink)
    return {
      origin: parsedLink.origin,
      sharePath: parsedLink.pathname,
      keyFragment: parsedLink.hash || null,
    }
  } catch {
    return null
  }
})
const generatedSharePassword = computed<string>(() => successSharePassword.value)
const hasGeneratedSharePassword = computed<boolean>(
  () => generatedSharePassword.value.length > 0,
)

const cameraStatusLabel = computed<string>(() => {
  if (qrCameraState.value.status === 'starting') {
    return 'QR camera is starting...'
  }

  if (qrCameraState.value.status === 'scanning') {
    return 'QR camera is active'
  }

  if (qrCameraState.value.status === 'error') {
    return qrCameraState.value.message
  }

  return 'QR camera idle'
})

const cameraStatusSeverity = computed<string>(() => {
  if (qrCameraState.value.status === 'error') {
    return 'danger'
  }

  if (qrCameraState.value.status === 'scanning') {
    return 'success'
  }

  if (qrCameraState.value.status === 'starting') {
    return 'info'
  }

  return 'secondary'
})

const isDarkMode = computed({
  get: (): boolean => appStore.themeMode === 'dark',
  set: (value: boolean) => {
    appStore.setThemeMode(value ? 'dark' : 'light')
  },
})

function applyImportedPsbt(psbt: ValidatedPsbt): void {
  psbtInput.value = psbt.base64
  revealPostImportSteps()
  reset()
}

function resetShareStepExpansion(): void {
  shouldScrollAfterImportCollapse.value = false
  isShareStepExpanded.value = {
    import: true,
    security: false,
    expiry: false,
  }
}

function revealPostImportSteps(): void {
  const wasImportStepExpanded = isShareStepExpanded.value.import
  isShareStepExpanded.value = {
    import: false,
    security: true,
    expiry: true,
  }

  if (wasImportStepExpanded) {
    shouldScrollAfterImportCollapse.value = true
    return
  }

  void scrollToShareSecurityStepTop()
}

function startShareExpiryCountdown(): void {
  shareExpiryTicker.start()
}

function stopShareExpiryCountdown(): void {
  shareExpiryTicker.stop()
}

async function scrollToShareSecurityStepTop(): Promise<void> {
  await nextTick()

  const securityStepElement = shareSecurityStepElement.value
  if (!securityStepElement) {
    return
  }

  const navElement = document.querySelector<HTMLElement>('.nav')
  const navOffset = navElement ? navElement.getBoundingClientRect().height : 0
  const targetTop =
    window.scrollY + securityStepElement.getBoundingClientRect().top - navOffset
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  })
}

function showImportError(message: string): void {
  toast.add({
    severity: 'error',
    summary: 'Import failed',
    detail: message,
    life: 5000,
  })
}

function showImportSuccess(message: string): void {
  toast.add({
    severity: 'success',
    summary: 'Import successful',
    detail: message,
    life: 4000,
  })
}

function showSecurityError(message: string): void {
  toast.add({
    severity: 'error',
    summary: 'Security setup failed',
    detail: message,
    life: 5000,
  })
}

async function handlePsbtFileSelection(event: FileUploadSelectEvent): Promise<void> {
  const selectedFile = extractFirstSelectedFile(event)

  if (!selectedFile) {
    return
  }

  if (selectedFile.size > MAX_PSBT_IMPORT_FILE_SIZE) {
    showImportError(
      `PSBT file is larger than ${MAX_PSBT_IMPORT_FILE_SIZE} bytes (${MAX_PSBT_IMPORT_FILE_SIZE_LABEL}).`,
    )
    return
  }

  try {
    const parsedFileResult = await parsePsbtFile(
      selectedFile,
      MAX_PSBT_IMPORT_FILE_SIZE,
    )

    if (!parsedFileResult.ok) {
      showImportError(parsedFileResult.message)
      return
    }

    applyImportedPsbt(parsedFileResult.value)
    importedPsbtFileName.value = selectedFile.name
    showImportSuccess('PSBT file imported successfully.')
  } catch {
    showImportError('Unable to read selected file.')
  }
}

async function handleQrImageSelection(event: FileUploadSelectEvent): Promise<void> {
  const selectedFile = extractFirstSelectedFile(event)

  if (!selectedFile) {
    return
  }

  if (selectedFile.size > MAX_QR_IMAGE_FILE_SIZE) {
    showImportError(
      `QR image is larger than ${MAX_QR_IMAGE_FILE_SIZE} bytes.`,
    )
    return
  }

  const qrScanResult = await scanQrImageFile(selectedFile)

  if (!qrScanResult.ok) {
    showImportError(qrScanResult.error.message)
    return
  }

  const validationResult = validatePsbtPayloadText(
    qrScanResult.value,
    MAX_PSBT_IMPORT_FILE_SIZE,
  )

  if (!validationResult.ok) {
    showImportError(validationResult.error.message)
    return
  }

  applyImportedPsbt(validationResult.value)
  importedPsbtFileName.value = ''
  showImportSuccess('PSBT imported from QR image successfully.')
}

function handleQrCameraPayload(payload: string): void {
  const validationResult = validatePsbtPayloadText(
    payload,
    MAX_PSBT_IMPORT_FILE_SIZE,
  )

  if (!validationResult.ok) {
    showImportError(
      'QR was detected but does not contain a supported PSBT payload.',
    )
    return
  }

  applyImportedPsbt(validationResult.value)
  importedPsbtFileName.value = ''
  stopQrCamera()
  showImportSuccess('PSBT imported from QR camera successfully.')
}

function setQrVideoElement(element: HTMLVideoElement | null): void {
  qrVideoElement.value = element
}

function updatePsbtDisplayMode(mode: string): void {
  if (
    mode === 'base64' ||
    mode === 'hex' ||
    mode === 'binary' ||
    mode === 'json'
  ) {
    psbtDisplayMode.value = mode
  }
}

async function toggleQrCamera(): Promise<void> {
  if (isCameraStarting.value || isCameraScanning.value) {
    stopQrCamera()
    return
  }

  if (!qrVideoElement.value) {
    showImportError('QR camera preview is unavailable.')
    return
  }

  await startQrCamera(qrVideoElement.value, handleQrCameraPayload)
}

function toggleShareStep(step: ShareStep): void {
  const nextExpandedState = !isShareStepExpanded.value[step]
  isShareStepExpanded.value[step] = nextExpandedState

  if (
    step === 'import' &&
    !nextExpandedState &&
    (isCameraStarting.value || isCameraScanning.value)
  ) {
    stopQrCamera()
  }
}

function expandShareStepIfCollapsed(step: ShareStep): void {
  if (isShareStepExpanded.value[step]) {
    return
  }

  toggleShareStep(step)
}

function handleManualPsbtInput(): void {
  importedPsbtFileName.value = ''
  reset()
}

function clearPsbtInput(): void {
  psbtInput.value = ''
  handleManualPsbtInput()
}

function removeImportedPsbtFile(): void {
  clearPsbtInput()
  importedPsbtFileName.value = ''
}

function refreshShareExpiryBounds(referenceDate: Date = new Date()): void {
  const previousMaxTimestamp = shareExpiryBounds.value.maxDate.getTime()
  const nextBounds = createShareExpiryBounds(referenceDate)
  shareExpiryBounds.value = nextBounds

  if (!selectedShareExpiry.value || Number.isNaN(selectedShareExpiry.value.getTime())) {
    selectedShareExpiry.value = new Date(nextBounds.maxDate.getTime())
    return
  }

  const selectedTimestamp = selectedShareExpiry.value.getTime()
  const isUsingPreviousDefault =
    Math.abs(selectedTimestamp - previousMaxTimestamp) <= 1000

  if (isUsingPreviousDefault) {
    selectedShareExpiry.value = new Date(nextBounds.maxDate.getTime())
    return
  }

  if (selectedTimestamp < nextBounds.minDate.getTime()) {
    selectedShareExpiry.value = new Date(nextBounds.minDate.getTime())
    return
  }

  if (selectedTimestamp > nextBounds.maxDate.getTime()) {
    selectedShareExpiry.value = new Date(nextBounds.maxDate.getTime())
  }
}

function resetShareExpirySelection(referenceDate: Date = new Date()): void {
  shareExpiryBounds.value = createShareExpiryBounds(referenceDate)
  selectedShareExpiry.value = createDefaultShareExpiryDate(referenceDate)
  shareExpiryDisplayMode.value = 'local'
}

function captureSuccessDialogState(
  shareUrl: string,
  decryptionPassword: string | null,
): void {
  successShareLink.value = shareUrl
  successSharePassword.value = decryptionPassword ?? ''
  successShareExpiryScheduleLabel.value = shareExpiryDeletionScheduleLabel.value

  if (!selectedShareExpiry.value || Number.isNaN(selectedShareExpiry.value.getTime())) {
    successShareExpiryTimestamp.value = null
    return
  }

  successShareExpiryTimestamp.value = selectedShareExpiry.value.getTime()
}

function clearSuccessDialogState(): void {
  successShareLink.value = ''
  successSharePassword.value = ''
  successShareExpiryTimestamp.value = null
  successShareExpiryScheduleLabel.value = ''
}

async function handleGenerateAndCopy(): Promise<void> {
  refreshShareExpiryBounds()
  const securityOptions: ShareSecurityOptions = {
    mode: selectedShareSecurityMode.value,
  }

  if (
    selectedShareSecurityMode.value === 'link_fragment' &&
    !hasAcknowledgedFragmentModeRisk.value
  ) {
    showSecurityError(
      'Please acknowledge one-link mode risk before generating a share for shared devices.',
    )
    return
  }

  if (selectedShareSecurityMode.value === 'password') {
    const passwordValidationResult = validateSharePassword(sharePasswordInput.value)

    if (!passwordValidationResult.ok) {
      showSecurityError(passwordValidationResult.error.message)
      return
    }

    securityOptions.password = passwordValidationResult.value
  }

  await createShareLink(psbtInput.value, selectedShareExpiry.value, securityOptions)

  if (uploadState.value.status === 'success') {
    captureSuccessDialogState(
      uploadState.value.shareUrl,
      uploadState.value.decryptionPassword,
    )
    isShareSuccessDialogVisible.value = true

    try {
      await copy(uploadState.value.shareUrl)
      toast.add({
        severity: 'success',
        summary: 'Link copied',
        detail: 'Secure link copied to clipboard.',
        life: 2500,
      })
    } catch {
      toast.add({
        severity: 'warn',
        summary: 'Copy unavailable',
        detail: 'Secure link is ready, but automatic clipboard copy failed.',
        life: 3200,
      })
    }

    clearForm({ preserveSuccessDialogData: true })
  }
}

function clearForm(options: { preserveSuccessDialogData?: boolean } = {}): void {
  const { preserveSuccessDialogData = false } = options
  stopQrCamera()
  psbtInput.value = ''
  importedPsbtFileName.value = ''
  resetShareStepExpansion()
  resetShareExpirySelection()
  resetShareSecuritySelection()
  activeImportPanel.value = '1'

  if (!preserveSuccessDialogData) {
    clearSuccessDialogState()
  }

  reset()
}

function openResetConfirmDialog(): void {
  isResetConfirmVisible.value = true
}

function closeResetConfirmDialog(): void {
  isResetConfirmVisible.value = false
}

function confirmReset(): void {
  clearForm()
  closeResetConfirmDialog()
}

async function copyGeneratedShareLink(): Promise<void> {
  if (!successShareLink.value) {
    return
  }

  await copy(successShareLink.value)
  toast.add({
    severity: 'success',
    summary: 'Link copied',
    detail: 'Secure link copied to clipboard again.',
    life: 2500,
  })
}

async function copyGeneratedSharePassword(): Promise<void> {
  if (!generatedSharePassword.value) {
    return
  }

  await copy(generatedSharePassword.value)
  toast.add({
    severity: 'success',
    summary: 'Password copied',
    detail: 'Decryption password copied to clipboard.',
    life: 2500,
  })
}

function closeShareSuccessDialog(): void {
  isShareSuccessDialogVisible.value = false
}

function handleShareSuccessDialogHide(): void {
  clearSuccessDialogState()
}

watch(activeImportPanel, (nextPanel) => {
  if (nextPanel !== '2' && (isCameraStarting.value || isCameraScanning.value)) {
    stopQrCamera()
  }
})

watch(
  () => shouldShowShareExpiryCountdown.value || shouldShowSuccessShareExpiryCountdown.value,
  (shouldRunCountdown) => {
    if (shouldRunCountdown) {
      startShareExpiryCountdown()
      return
    }

    stopShareExpiryCountdown()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopQrCamera()
  stopShareExpiryCountdown()
})
</script>

<template>
  <div class="app-view">
    <Toast position="top-right" />

    <header class="nav">
      <div class="nav-inner">
        <RouterLink to="/" class="back-link" aria-label="Back to homepage">
          <i class="pi pi-arrow-left" aria-hidden="true"></i>
          <span class="back-link-copy">Back to homepage</span>
          <span class="back-link-logo" aria-hidden="true">
            <span class="brand-ns">psbt</span><span class="brand-sep">:</span><span class="brand-name">hub</span>
          </span>
        </RouterLink>
        <ThemeModeToggle
          v-model="isDarkMode"
          mode="rail"
          class="nav-theme-switch"
          input-id="app-nav-theme-toggle"
          aria-label="Toggle dark mode"
        />
      </div>
    </header>

    <main class="page-shell">
      <section class="app-content">
        <header class="app-hero">
          <div class="app-hero-title-row">
            <h1 class="text-3xl font-semibold">
              {{ appStore.appName }}
            </h1>
            <Tag severity="secondary" value="MVP v1" class="hero-version-tag" />
          </div>
          <p class="hero-copy">
            {{ appStore.pitch }}
          </p>
        </header>

        <Card class="handoff-card">
          <template #title>Create encrypted PSBT link</template>
          <template #content>
            <div class="flex flex-col gap-4">
              <HomeImportStep
                :should-animate-import-step="shouldAnimateImportStep"
                :is-expanded="isShareStepExpanded.import"
                :has-valid-imported-file="hasValidImportedFile"
                :max-psbt-import-file-size-label="MAX_PSBT_IMPORT_FILE_SIZE_LABEL"
                :max-psbt-import-file-size="MAX_PSBT_IMPORT_FILE_SIZE"
                :active-import-panel="activeImportPanel"
                :psbt-input="psbtInput"
                :has-psbt-input="hasPsbtInput"
                :imported-psbt-file-name="importedPsbtFileName"
                :max-qr-image-file-size="MAX_QR_IMAGE_FILE_SIZE"
                :is-camera-scanning="isCameraScanning"
                :is-camera-starting="isCameraStarting"
                :should-show-camera-status="shouldShowCameraStatus"
                :camera-status-severity="cameraStatusSeverity"
                :camera-status-label="cameraStatusLabel"
                :preview-psbt-base64="previewPsbtBase64"
                :psbt-display-mode="psbtDisplayMode"
                :psbt-display-mode-options="PSBT_DISPLAY_MODE_OPTIONS"
                :is-psbt-display-expanded="isPsbtDisplayExpanded"
                :psbt-display-hint="psbtDisplayHint"
                :displayed-psbt-payload="displayedPsbtPayload"
                :set-qr-video-element="setQrVideoElement"
                :handle-step-collapse-before-enter="handleStepCollapseBeforeEnter"
                :handle-step-collapse-enter="handleStepCollapseEnter"
                :handle-step-collapse-after-enter="handleStepCollapseAfterEnter"
                :handle-step-collapse-before-leave="handleStepCollapseBeforeLeave"
                :handle-step-collapse-leave="handleStepCollapseLeave"
                :handle-step-collapse-after-leave="handleStepCollapseAfterLeave"
                @expand="expandShareStepIfCollapsed('import')"
                @toggle-step="toggleShareStep('import')"
                @update:active-import-panel="activeImportPanel = $event"
                @update:psbt-input="psbtInput = $event"
                @manual-psbt-input="handleManualPsbtInput"
                @clear-psbt-input="clearPsbtInput"
                @select-psbt-file="handlePsbtFileSelection"
                @remove-imported-psbt-file="removeImportedPsbtFile"
                @toggle-qr-camera="toggleQrCamera"
                @select-qr-image="handleQrImageSelection"
                @update:psbt-display-mode="updatePsbtDisplayMode"
                @toggle-psbt-display-expansion="togglePsbtDisplayExpansion"
              />

              <div ref="shareSecurityStepElement">
                <HomeSecurityStep
                  :is-expanded="isShareStepExpanded.security"
                  :selected-share-security-mode="selectedShareSecurityMode"
                  :share-security-mode-options="SHARE_SECURITY_MODE_OPTIONS"
                  :selected-share-security-option="selectedShareSecurityOption"
                  :is-password-security-mode="isPasswordSecurityMode"
                  :share-password-input="sharePasswordInput"
                  :has-acknowledged-fragment-mode-risk="hasAcknowledgedFragmentModeRisk"
                  :is-uploading="isUploading"
                  :share-password-strength-score="sharePasswordStrength.score"
                  :share-password-strength-display="sharePasswordStrengthDisplay"
                  :share-password-strength-guidance="sharePasswordStrength.guidance"
                  :share-password-strength-class="sharePasswordStrengthClass"
                  :share-password-signal-items="sharePasswordSignalItems"
                  :share-password-validation-message="sharePasswordValidationMessage"
                  :handle-step-collapse-before-enter="handleStepCollapseBeforeEnter"
                  :handle-step-collapse-enter="handleStepCollapseEnter"
                  :handle-step-collapse-after-enter="handleStepCollapseAfterEnter"
                  :handle-step-collapse-before-leave="handleStepCollapseBeforeLeave"
                  :handle-step-collapse-leave="handleStepCollapseLeave"
                  :handle-step-collapse-after-leave="handleStepCollapseAfterLeave"
                  @expand="expandShareStepIfCollapsed('security')"
                  @toggle-step="toggleShareStep('security')"
                  @update:selected-share-security-mode="selectedShareSecurityMode = $event"
                  @update:share-password-input="sharePasswordInput = $event"
                  @update:has-acknowledged-fragment-mode-risk="hasAcknowledgedFragmentModeRisk = $event"
                  @generate-password="generateAndApplySharePassword"
                  @clear-password="clearSharePassword"
                />
              </div>

              <HomeExpiryStep
                :is-expanded="isShareStepExpanded.expiry"
                :is-uploading="isUploading"
                :is-share-expiry-valid="isShareExpiryValid"
                :share-expiry-picker-date="shareExpiryPickerDate"
                :share-expiry-picker-min-date="shareExpiryPickerMinDate"
                :share-expiry-picker-max-date="shareExpiryPickerMaxDate"
                :share-expiry-picker-date-format="shareExpiryPickerDateFormat"
                :share-expiry-tag-pt="shareExpiryTagPt"
                :share-expiry-display-mode="shareExpiryDisplayMode"
                :share-expiry-local-display="shareExpiryLocalDisplay"
                :share-expiry-utc-display="shareExpiryUtcDisplay"
                :share-expiry-picker-mode-hint="shareExpiryPickerModeHint"
                :share-expiry-validation-message="shareExpiryValidationMessage"
                :share-expiry-label-max-days="SHARE_EXPIRY_LABEL_MAX_DAYS"
                :show-share-expiry-countdown="Boolean(shareExpiryCountdown && shareExpiryCountdownStatus)"
                :share-expiry-countdown-presentation="shareExpiryCountdownPresentation"
                :share-expiry-countdown-status="shareExpiryCountdownStatus"
                :share-expiry-deletion-schedule-label="shareExpiryDeletionScheduleLabel"
                :share-expiry-countdown-units="shareExpiryCountdownUnits"
                :handle-step-collapse-before-enter="handleStepCollapseBeforeEnter"
                :handle-step-collapse-enter="handleStepCollapseEnter"
                :handle-step-collapse-after-enter="handleStepCollapseAfterEnter"
                :handle-step-collapse-before-leave="handleStepCollapseBeforeLeave"
                :handle-step-collapse-leave="handleStepCollapseLeave"
                :handle-step-collapse-after-leave="handleStepCollapseAfterLeave"
                @expand="expandShareStepIfCollapsed('expiry')"
                @toggle-step="toggleShareStep('expiry')"
                @update:share-expiry-picker-date="shareExpiryPickerDate = $event"
                @update:share-expiry-display-mode="shareExpiryDisplayMode = $event"
              />

              <HomeActionBar
                :copied="copied"
                :is-uploading="isUploading"
                :can-generate-link="canGenerateLink"
                @reset="openResetConfirmDialog"
                @generate="handleGenerateAndCopy"
              />

              <p v-if="uploadError" class="error-message">{{ uploadError }}</p>
            </div>
          </template>
        </Card>

        <HomeResetConfirmDialog
          v-model:visible="isResetConfirmVisible"
          @confirm="confirmReset"
        />

        <HomeShareSuccessDialog
          v-model:visible="isShareSuccessDialogVisible"
          :success-share-link="successShareLink"
          :has-generated-share-password="hasGeneratedSharePassword"
          :generated-share-password="generatedSharePassword"
          :share-link-segments="shareLinkSegments"
          :show-expiry-countdown="Boolean(successShareExpiryCountdown && successShareExpiryCountdownStatus)"
          :success-share-expiry-schedule-label="successShareExpiryScheduleLabel"
          :success-share-expiry-countdown-units="successShareExpiryCountdownUnits"
          :success-share-expiry-countdown-status="successShareExpiryCountdownStatus"
          @copy-link="copyGeneratedShareLink"
          @copy-password="copyGeneratedSharePassword"
          @done="closeShareSuccessDialog"
          @hide="handleShareSuccessDialogHide"
        />
      </section>
    </main>

    <AppFooter
      v-model="isDarkMode"
      :current-year="currentYear"
      github-url="https://github.com/Asylian21/psbthub.io"
      x-url="https://x.com/Asylian21"
      theme-toggle-input-id="app-footer-theme-toggle"
    />
  </div>
</template>

<style>
/* Keep this custom property global for smooth conic-gradient animation. */
@property --generate-link-border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
</style>

<style scoped>
/* ── View-level design tokens (inherited by child components) ── */
.app-view {
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --brand-primary: #ffffff;
  --accent: #f59e0b;
  --accent-light: #fbbf24;
  --border: rgba(255, 255, 255, 0.08);
  --nav-bg: rgba(5, 10, 21, 0.75);
  --switch-track-bg: rgba(148, 163, 184, 0.05);
  --switch-track-border: rgba(148, 163, 184, 0.25);
  --switch-track-checked-bg: rgba(148, 163, 184, 0.1);
  --switch-track-checked-border: rgba(148, 163, 184, 0.34);
  --switch-handle-bg: rgba(15, 23, 42, 0.9);
  --switch-handle-border: rgba(148, 163, 184, 0.35);
  --switch-icon: rgba(226, 232, 240, 0.95);
  --switch-icon-checked: #f8fafc;
  --footer-bg-start: rgba(15, 23, 42, 0.18);
  --footer-bg-mid: rgba(5, 10, 21, 0.72);
  --footer-bg-end: rgba(5, 10, 21, 0.95);
  --footer-note: rgba(148, 163, 184, 0.85);
  --footer-divider-full: rgba(148, 163, 184, 0.24);
  --footer-actions-divider-mid: rgba(148, 163, 184, 0.35);
  --footer-social-border: rgba(148, 163, 184, 0.25);
  --footer-social-bg: rgba(148, 163, 184, 0.05);
  --footer-social-text: var(--text-dim);
  --content-max-width: 74rem;
  --page-padding-x: clamp(1.25rem, 3.4vw, 2.5rem);

  min-height: 100vh;
  color: var(--text);
  display: flex;
  flex-direction: column;
}

html.app-light .app-view {
  --text: #0f172a;
  --text-muted: #475569;
  --text-dim: #64748b;
  --brand-primary: #0f172a;
  --border: rgba(15, 23, 42, 0.12);
  --nav-bg: rgba(247, 250, 255, 0.82);
  --switch-track-bg: rgba(148, 163, 184, 0.22);
  --switch-track-border: rgba(100, 116, 139, 0.42);
  --switch-track-checked-bg: rgba(245, 158, 11, 0.22);
  --switch-track-checked-border: rgba(217, 119, 6, 0.5);
  --switch-handle-bg: #ffffff;
  --switch-handle-border: rgba(148, 163, 184, 0.6);
  --switch-icon: #475569;
  --switch-icon-checked: #9a3412;
  --footer-bg-start: rgba(15, 23, 42, 0.04);
  --footer-bg-mid: rgba(226, 232, 240, 0.68);
  --footer-bg-end: rgba(226, 232, 240, 0.9);
  --footer-note: rgba(71, 85, 105, 0.9);
  --footer-divider-full: rgba(148, 163, 184, 0.45);
  --footer-actions-divider-mid: rgba(100, 116, 139, 0.42);
  --footer-social-border: rgba(100, 116, 139, 0.32);
  --footer-social-bg: rgba(255, 255, 255, 0.76);
  --footer-social-text: #334155;
}

/* ── Navigation ── */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: var(--nav-bg);
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: 1rem var(--page-padding-x);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  color: var(--accent);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

.back-link:hover {
  opacity: 0.8;
}

.back-link-copy {
  display: inline-block;
}

.back-link-logo {
  display: inline-flex;
  align-items: baseline;
  margin-left: 0.22rem;
  padding-left: 0.52rem;
  border-left: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  font-family: 'Roboto Mono', monospace;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0;
}

.brand-ns {
  color: var(--brand-primary);
}

.brand-sep {
  color: var(--text-dim);
  margin: 0 0.5px;
}

.brand-name {
  color: var(--accent);
  text-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
}

/* ── Nav theme switch (PrimeVue deep overrides) ── */
.nav-theme-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--nav-bg) 90%, transparent);
  color: var(--text-muted);
}

:deep(.nav-theme-switch .app-theme-toggle-label) {
  font-size: 0.875rem;
  font-weight: 500;
}

:deep(.nav-theme-switch .app-theme-toggle-icon) {
  font-size: 0.95rem;
}

:deep(.nav-theme-switch .app-theme-toggle-switch) {
  flex-shrink: 0;
  --p-toggleswitch-width: 3rem;
  --p-toggleswitch-height: 1.85rem;
  --p-toggleswitch-border-radius: 999px;
  --p-toggleswitch-handle-size: 1.38rem;
  --p-toggleswitch-gap: 0.2rem;
  --p-toggleswitch-handle-border-radius: 999px;
}

:deep(.nav-theme-switch .app-theme-toggle-switch .p-toggleswitch-slider) {
  background: var(--switch-track-bg);
  border: 1px solid var(--switch-track-border);
  box-shadow: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

:deep(.nav-theme-switch .app-theme-toggle-switch.p-toggleswitch-checked .p-toggleswitch-slider) {
  background: var(--switch-track-checked-bg);
  border-color: var(--switch-track-checked-border);
}

:deep(.nav-theme-switch .app-theme-toggle-switch .p-toggleswitch-handle) {
  background: var(--switch-handle-bg);
  border: 1px solid var(--switch-handle-border);
  box-shadow: none;
}

:deep(.nav-theme-switch .app-theme-toggle-switch .p-toggleswitch-input:focus-visible + .p-toggleswitch-slider) {
  outline: 2px solid rgba(245, 158, 11, 0.55);
  outline-offset: 2px;
}

/* ── Page layout ── */
.page-shell {
  flex: 1;
  width: 100%;
  padding: 6.25rem var(--page-padding-x) 2.5rem;
  color: var(--p-text-color, var(--text));
}

.app-content {
  margin: 0 auto;
  width: 100%;
  max-width: var(--content-max-width);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Hero section ── */
.app-hero {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.app-hero-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.hero-version-tag {
  flex-shrink: 0;
}

:deep(.hero-version-tag.p-tag) {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.24rem 0.58rem;
  border-radius: 999px;
}

:deep(.hero-version-tag.p-tag.p-tag-secondary) {
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.34);
  color: var(--accent);
}

html.app-light .app-view :deep(.hero-version-tag.p-tag.p-tag-secondary) {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(217, 119, 6, 0.38);
  color: #9a3412;
}

.hero-copy {
  max-width: 52rem;
  color: var(--p-text-muted-color);
}

/* ── Card wrapper ── */
.handoff-card {
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
}

.error-message {
  color: var(--p-red-500);
  font-size: 0.9rem;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .page-shell {
    padding-top: 5.75rem;
  }
}

@media (max-width: 640px) {
  .nav-inner {
    padding-top: 0.85rem;
    padding-bottom: 0.85rem;
  }

  .back-link {
    font-size: 0.84rem;
  }

  .back-link-copy {
    display: none;
  }

  .back-link-logo {
    margin-left: 0.1rem;
    padding-left: 0;
    border-left: 0;
  }

  .nav-theme-switch {
    gap: 0.38rem;
    padding: 0.36rem 0.58rem;
  }

  :deep(.nav-theme-switch .app-theme-toggle-label) {
    display: none;
  }

  .page-shell {
    padding-top: 5.35rem;
  }
}
</style>
