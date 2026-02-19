<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionContent from 'primevue/accordioncontent'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanel from 'primevue/accordionpanel'
import Button from 'primevue/button'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import {
  type PsbtDisplayMode,
  type PsbtDisplayModeOption,
} from '../../composables/usePsbtDisplay'
import { ref, watch } from 'vue'

type ImportPanel = '0' | '1' | '2'

interface Props {
  shouldAnimateImportStep: boolean
  isExpanded: boolean
  hasValidImportedFile: boolean
  maxPsbtImportFileSizeLabel: string
  maxPsbtImportFileSize: number
  activeImportPanel: ImportPanel
  psbtInput: string
  hasPsbtInput: boolean
  importedPsbtFileName: string
  maxQrImageFileSize: number
  isCameraScanning: boolean
  isCameraStarting: boolean
  shouldShowCameraStatus: boolean
  cameraStatusSeverity: string
  cameraStatusLabel: string
  previewPsbtBase64: string
  psbtDisplayMode: PsbtDisplayMode
  psbtDisplayModeOptions: PsbtDisplayModeOption[]
  isPsbtDisplayExpanded: boolean
  psbtDisplayHint: string
  displayedPsbtPayload: string
  setQrVideoElement: (element: HTMLVideoElement | null) => void
  handleStepCollapseBeforeEnter: (element: Element) => void
  handleStepCollapseEnter: (element: Element) => void
  handleStepCollapseAfterEnter: (element: Element) => void
  handleStepCollapseBeforeLeave: (element: Element) => void
  handleStepCollapseLeave: (element: Element) => void
  handleStepCollapseAfterLeave: (element: Element) => void
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'expand'): void
  (event: 'toggle-step'): void
  (event: 'update:activeImportPanel', value: ImportPanel): void
  (event: 'update:psbtInput', value: string): void
  (event: 'manual-psbt-input'): void
  (event: 'clear-psbt-input'): void
  (event: 'select-psbt-file', eventPayload: FileUploadSelectEvent): void
  (event: 'remove-imported-psbt-file'): void
  (event: 'toggle-qr-camera'): void
  (event: 'select-qr-image', eventPayload: FileUploadSelectEvent): void
  (event: 'update:psbtDisplayMode', value: PsbtDisplayMode): void
  (event: 'toggle-psbt-display-expansion'): void
}>()

function handlePsbtInputUpdate(value: string | undefined): void {
  emit('update:psbtInput', value ?? '')
  emit('manual-psbt-input')
}

function handleImportPanelUpdate(
  value: string | string[] | null | undefined,
): void {
  if (value === '0' || value === '1' || value === '2') {
    emit('update:activeImportPanel', value)
  }
}

function handlePsbtDisplayModeUpdate(value: string | undefined): void {
  if (
    value === 'base64' ||
    value === 'hex' ||
    value === 'binary' ||
    value === 'json'
  ) {
    emit('update:psbtDisplayMode', value)
  }
}

function handlePsbtFileSelect(event: FileUploadSelectEvent): void {
  emit('select-psbt-file', event)
}

function handleQrImageSelect(event: FileUploadSelectEvent): void {
  emit('select-qr-image', event)
}

const qrVideoElement = ref<HTMLVideoElement | null>(null)

watch(
  qrVideoElement,
  (nextVideoElement) => {
    props.setQrVideoElement(nextVideoElement)
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="share-import-step"
    :class="{
      'share-import-step--animated': shouldAnimateImportStep,
      'share-step--collapsed': !isExpanded,
    }"
    @click="emit('expand')"
  >
    <div class="share-import-shell">
      <div class="share-import-hero">
        <div class="share-import-hero-copy">
          <div class="share-import-kicker">
            <span class="share-import-kicker-pill">Step 1</span>
            <span class="share-import-kicker-text">PSBT input</span>
          </div>
          <p class="share-import-title">Import the PSBT payload</p>
          <p class="share-import-step-copy">
            Pick one input method below. All options parse the same PSBT payload and
            feed the next steps.
          </p>
          <ol class="hero-validation-list">
            <li>
              <span class="hero-validation-item-text">
                Imported PSBT must be a valid, parseable PSBT payload.
              </span>
              <i
                v-if="hasValidImportedFile"
                class="pi pi-check hero-validation-check"
                aria-hidden="true"
              ></i>
            </li>
            <li>
              <span class="hero-validation-item-text">
                Maximum accepted PSBT size:
                {{ maxPsbtImportFileSizeLabel }}
                ({{ maxPsbtImportFileSize }} bytes).
              </span>
              <i
                v-if="hasValidImportedFile"
                class="pi pi-check hero-validation-check"
                aria-hidden="true"
              ></i>
            </li>
          </ol>
        </div>
        <Button
          type="button"
          severity="secondary"
          text
          rounded
          size="small"
          class="share-step-collapse-button"
          :icon="isExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          :aria-label="isExpanded ? 'Collapse Step 1' : 'Expand Step 1'"
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
          class="share-step-collapsible-body share-step-collapsible-body--import"
        >
          <Accordion
            :value="activeImportPanel"
            class="import-options-accordion"
            @update:value="handleImportPanelUpdate"
          >
            <AccordionPanel value="0">
              <AccordionHeader>
                <span class="import-accordion-header">
                  <i
                    class="pi pi-pencil import-header-icon import-header-icon--base64"
                    aria-hidden="true"
                  ></i>
                  <span>Paste base64 / hex</span>
                </span>
              </AccordionHeader>
              <AccordionContent>
                <div class="import-block">
                  <div class="flex flex-col gap-2">
                    <label for="psbt-input" class="text-sm font-medium">PSBT (base64 or hex)</label>
                    <Textarea
                      id="psbt-input"
                      :model-value="psbtInput"
                      rows="6"
                      auto-resize
                      placeholder="Paste PSBT in base64 or hex format..."
                      @update:model-value="handlePsbtInputUpdate"
                    />
                    <Button
                      v-if="hasPsbtInput"
                      label="Clear PSBT input"
                      icon="pi pi-times"
                      severity="danger"
                      size="small"
                      outlined
                      class="self-start"
                      @click="emit('clear-psbt-input')"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionPanel>

            <AccordionPanel value="1">
              <AccordionHeader>
                <span class="import-accordion-header">
                  <i
                    class="pi pi-file import-header-icon import-header-icon--file"
                    aria-hidden="true"
                  ></i>
                  <span>Import file (.psbt or .txt)</span>
                </span>
              </AccordionHeader>
              <AccordionContent>
                <div class="import-block">
                  <div class="import-file-row">
                    <FileUpload
                      mode="basic"
                      accept=".psbt,.txt,application/octet-stream,text/plain"
                      :max-file-size="maxPsbtImportFileSize"
                      :custom-upload="true"
                      :auto="true"
                      choose-label="Choose PSBT file"
                      @select="handlePsbtFileSelect"
                    />
                    <div v-if="importedPsbtFileName" class="imported-file-meta">
                      <Tag
                        severity="secondary"
                        :value="`Imported: ${importedPsbtFileName}`"
                        class="imported-file-tag"
                      />
                      <Button
                        label="Remove"
                        icon="pi pi-times"
                        severity="danger"
                        text
                        size="small"
                        class="import-remove-file-button"
                        @click="emit('remove-imported-psbt-file')"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionPanel>

            <AccordionPanel value="2">
              <AccordionHeader>
                <span class="import-accordion-header">
                  <i
                    class="pi pi-camera import-header-icon import-header-icon--qr"
                    aria-hidden="true"
                  ></i>
                  <span>Import QR (camera or image)</span>
                </span>
              </AccordionHeader>
              <AccordionContent>
                <div class="import-block">
                  <div class="flex flex-wrap items-center gap-3">
                    <Button
                      :label="
                        isCameraScanning || isCameraStarting
                          ? 'Stop QR camera'
                          : 'Start QR camera'
                      "
                      icon="pi pi-camera"
                      severity="secondary"
                      :outlined="!(isCameraScanning || isCameraStarting)"
                      :loading="isCameraStarting"
                      @click="emit('toggle-qr-camera')"
                    />
                    <FileUpload
                      mode="basic"
                      accept="image/*"
                      :max-file-size="maxQrImageFileSize"
                      :custom-upload="true"
                      :auto="true"
                      choose-label="Scan QR from image"
                      @select="handleQrImageSelect"
                    />
                  </div>
                  <Tag
                    v-if="shouldShowCameraStatus"
                    :severity="cameraStatusSeverity"
                    :value="cameraStatusLabel"
                  />
                  <video
                    v-show="isCameraScanning || isCameraStarting"
                    ref="qrVideoElement"
                    class="qr-video-preview"
                    muted
                    playsinline
                  />
                </div>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>

          <div v-if="previewPsbtBase64" class="psbt-preview-stack">
            <div class="psbt-view-toolbar">
              <label for="imported-psbt-preview" class="psbt-view-label">
                Imported PSBT preview
              </label>
              <div class="psbt-view-controls">
                <SelectButton
                  :model-value="psbtDisplayMode"
                  :options="psbtDisplayModeOptions"
                  option-label="label"
                  option-value="value"
                  :allow-empty="false"
                  aria-label="Imported PSBT display format selector"
                  @update:model-value="handlePsbtDisplayModeUpdate"
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
                  @click="emit('toggle-psbt-display-expansion')"
                />
              </div>
            </div>
            <p v-if="psbtDisplayHint" class="psbt-display-hint">
              {{ psbtDisplayHint }}
            </p>
            <Textarea
              id="imported-psbt-preview"
              :model-value="displayedPsbtPayload"
              rows="3"
              readonly
              :class="[
                'decrypted-psbt-textarea',
                { 'decrypted-psbt-textarea--expanded': isPsbtDisplayExpanded },
              ]"
            />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
@import '../../css/share/step-collapse.css';
@import '../../css/share/psbt-viewer.css';

.hero-validation-list {
  margin: 0.28rem 0 0;
  padding-left: calc(1.1rem + 8px);
  list-style: decimal;
  max-width: 52rem;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  font-size: 0.81rem;
  line-height: 1.45;
  letter-spacing: 0.01em;
  color: var(--text-dim);
}

.hero-validation-list li {
  display: list-item;
  padding-left: 0;
}

.hero-validation-list li::marker {
  color: var(--accent-light);
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
  font-weight: 600;
}

.hero-validation-item-text {
  display: inline;
}

.hero-validation-check {
  display: inline-block;
  color: var(--p-green-500);
  margin-left: 0.4rem;
  font-size: 0.8rem;
  vertical-align: text-top;
}

.psbt-preview-stack {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.decrypted-psbt-textarea {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.76rem;
  line-height: 1.35;
  min-height: 5.25rem;
  max-height: 5.25rem;
  overflow: auto;
  padding: 0.72rem 0.82rem;
  border-radius: 0.72rem;
}

.decrypted-psbt-textarea--expanded {
  min-height: min(55vh, 26rem);
  max-height: min(55vh, 26rem);
}

.share-import-step {
  position: relative;
  padding: 1px;
  border-radius: 0.95rem;
  background: linear-gradient(
    130deg,
    color-mix(in srgb, #f59e0b 34%, transparent),
    color-mix(in srgb, var(--p-primary-color) 24%, transparent)
  );
  box-shadow:
    0 10px 28px color-mix(in srgb, #000000 14%, transparent),
    0 1px 0 color-mix(in srgb, #ffffff 10%, transparent) inset;
}

.share-step-collapsible-body--import {
  display: flex;
  flex-direction: column;
  gap: 0.94rem;
}

.share-import-step--animated {
  --generate-link-border-angle: 0deg;
  box-shadow:
    0 10px 28px color-mix(in srgb, #000000 14%, transparent),
    0 1px 0 color-mix(in srgb, #ffffff 10%, transparent) inset,
    0 0 16px color-mix(in srgb, #f59e0b 12%, transparent);
}

.share-import-step--animated::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: calc(0.95rem + 1px);
  padding: 1px;
  background: conic-gradient(
    from var(--generate-link-border-angle),
    transparent 24%,
    color-mix(in srgb, #f59e0b 22%, transparent) 46%,
    color-mix(in srgb, #ffffff 38%, transparent) 50%,
    color-mix(in srgb, #fbbf24 22%, transparent) 54%,
    transparent 76%
  );
  opacity: 0.72;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: generate-link-border-spin 8s linear infinite;
}

.share-import-shell {
  display: flex;
  flex-direction: column;
  gap: 0.94rem;
  padding: 1.05rem 1.12rem 1.02rem;
  border-radius: calc(0.95rem - 1px);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--p-content-background, #0f172a) 95%, #f59e0b 5%),
    color-mix(in srgb, var(--p-content-background, #0f172a) 98%, transparent)
  );
}

.share-import-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.share-import-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 0.44rem;
  max-width: 46rem;
}

.share-import-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.share-import-kicker-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.5rem;
  padding: 0.14rem 0.44rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #f59e0b 42%, transparent);
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  color: #f59e0b;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.67rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.share-import-kicker-text {
  color: var(--p-text-muted-color);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-weight: 600;
}

.share-import-title {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.45;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.share-import-step-copy {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.58;
  color: var(--p-text-muted-color);
}

.import-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.import-file-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.imported-file-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1 1 20rem;
  min-width: 0;
  max-width: 100%;
}

.imported-file-tag {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}

.import-remove-file-button {
  margin-left: auto;
  flex-shrink: 0;
}

:deep(.imported-file-tag .p-tag-value) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-accordion-header {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

/* Remove the bottom divider on the last import option (Import QR). */
:deep(.import-options-accordion > .p-accordionpanel:last-child) {
  border-bottom-width: 0 !important;
}

:deep(.import-options-accordion > .p-accordionpanel:last-child > .p-accordionheader) {
  border-bottom-width: 0 !important;
  box-shadow: none !important;
}

.import-header-icon {
  font-size: 0.95rem;
}

.import-header-icon--base64 {
  color: #f59e0b;
}

.import-header-icon--file {
  color: #3b82f6;
}

.import-header-icon--qr {
  color: #10b981;
}

.qr-video-preview {
  width: min(100%, 22rem);
  border-radius: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  background: var(--p-surface-900);
}

@keyframes generate-link-border-spin {
  to {
    --generate-link-border-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .share-import-step--animated,
  .share-import-step--animated::before,
  .share-step-collapse-enter-active,
  .share-step-collapse-leave-active {
    animation: none !important;
    transition: none;
  }
}

@media (max-width: 640px) {
  .share-import-shell {
    gap: 0.82rem;
    padding: 0.94rem;
  }
}
</style>
