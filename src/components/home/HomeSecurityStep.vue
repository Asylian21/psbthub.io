<script setup lang="ts">
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import Password from 'primevue/password'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import { type ShareSecurityMode } from '../../composables/useUpload'
import { type ShareSecurityOptionContent } from '../../content/homeContent'

interface PasswordStrengthSignalItem {
  id: string
  label: string
  passed: boolean
}

interface Props {
  isExpanded: boolean
  selectedShareSecurityMode: ShareSecurityMode
  shareSecurityModeOptions: ShareSecurityOptionContent[]
  selectedShareSecurityOption: ShareSecurityOptionContent
  isPasswordSecurityMode: boolean
  sharePasswordInput: string
  hasAcknowledgedFragmentModeRisk: boolean
  isUploading: boolean
  sharePasswordStrengthScore: number
  sharePasswordStrengthDisplay: string
  sharePasswordStrengthGuidance: string
  sharePasswordStrengthClass: string
  sharePasswordSignalItems: PasswordStrengthSignalItem[]
  sharePasswordValidationMessage: string
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
  (event: 'update:selectedShareSecurityMode', value: ShareSecurityMode): void
  (event: 'update:sharePasswordInput', value: string): void
  (event: 'update:hasAcknowledgedFragmentModeRisk', value: boolean): void
  (event: 'generate-password'): void
  (event: 'clear-password'): void
}>()

function handleSharePasswordInputUpdate(value: string | undefined): void {
  emit('update:sharePasswordInput', value ?? '')
}

function handleFragmentModeRiskAcknowledgementUpdate(value: boolean | undefined): void {
  emit('update:hasAcknowledgedFragmentModeRisk', Boolean(value))
}
</script>

<template>
  <div
    class="share-security-step"
    :class="{ 'share-step--collapsed': !isExpanded }"
    @click="emit('expand')"
  >
    <div class="share-security-shell">
      <div class="share-security-hero">
        <div class="share-security-hero-copy">
          <div class="share-security-kicker">
            <span class="share-security-kicker-pill">Step 2</span>
            <span class="share-security-kicker-text">Security mode</span>
          </div>
          <p class="share-security-title">
            Choose how recipients decrypt this encrypted share
          </p>
          <p class="share-security-step-copy">
            Both modes keep private decryption material client-side only. The key
            difference is how decryption secret is delivered to recipients.
          </p>
          <p class="share-security-step-subcopy">
            One-link fragment mode prioritizes speed. Link + password mode prioritizes
            split-channel separation and operational control.
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
          :aria-label="isExpanded ? 'Collapse Step 2' : 'Expand Step 2'"
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
          class="share-step-collapsible-body share-step-collapsible-body--security"
        >
          <div class="security-mode-grid" role="radiogroup" aria-label="Share security mode selector">
            <button
              v-for="option in shareSecurityModeOptions"
              :key="option.value"
              type="button"
              class="security-mode-card"
              :class="{
                'security-mode-card--active': selectedShareSecurityMode === option.value,
              }"
              :aria-pressed="selectedShareSecurityMode === option.value"
              @click="emit('update:selectedShareSecurityMode', option.value)"
            >
              <div class="security-mode-card-header">
                <span class="security-mode-card-icon" aria-hidden="true">
                  <i class="pi" :class="option.icon"></i>
                </span>
                <div class="security-mode-card-heading">
                  <p class="security-mode-card-title">{{ option.title }}</p>
                  <p class="security-mode-card-subtitle">{{ option.subtitle }}</p>
                </div>
                <Tag severity="secondary" :value="option.capabilityTag" class="security-mode-card-tag" />
              </div>
              <ul class="security-mode-card-list">
                <li>
                  <i class="pi pi-check-circle" aria-hidden="true"></i>
                  <span>{{ option.primaryBenefit }}</span>
                </li>
                <li>
                  <i class="pi pi-info-circle" aria-hidden="true"></i>
                  <span>{{ option.tradeoff }}</span>
                </li>
              </ul>
              <p class="security-mode-card-hint">
                {{ option.usageHint }}
              </p>
            </button>
          </div>

          <Transition name="security-detail-fade" mode="out-in">
            <div :key="selectedShareSecurityMode" class="share-security-detail-panel">
              <p class="share-security-detail-title">
                {{ selectedShareSecurityOption.title }} - how it works
              </p>
              <p class="share-security-step-note">
                <template v-if="isPasswordSecurityMode">
                  The URL contains only a share ID. Recipients must enter the password to
                  derive the decryption key locally before decryption starts.
                </template>
                <template v-else>
                  The URL includes the decryption key in the fragment (<code>#k=...</code>).
                  Browsers do not send fragments to the server, but anyone with the full
                  link can decrypt.
                </template>
              </p>

              <div v-if="isPasswordSecurityMode" class="share-password-shell">
                <label for="share-password-input" class="share-password-label">
                  Decryption password
                </label>
                <Password
                  id="share-password-input"
                  :model-value="sharePasswordInput"
                  :feedback="false"
                  toggle-mask
                  input-class="w-full"
                  class="share-security-password-input"
                  fluid
                  :disabled="isUploading"
                  aria-label="Decryption password input"
                  @update:model-value="handleSharePasswordInputUpdate"
                />
                <div class="share-password-actions">
                  <Button
                    label="Generate secure password"
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    :disabled="isUploading"
                    @click="emit('generate-password')"
                  />
                  <Button
                    label="Clear password"
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    :disabled="isUploading || !sharePasswordInput"
                    @click="emit('clear-password')"
                  />
                </div>

                <div class="share-password-meter-shell">
                  <div class="share-password-meter-header">
                    <span class="share-password-meter-title">
                      Password strength estimate
                    </span>
                    <strong class="share-password-meter-score">
                      {{ sharePasswordStrengthDisplay }}
                    </strong>
                  </div>
                  <ProgressBar
                    :value="sharePasswordStrengthScore"
                    :showValue="false"
                    :class="['share-password-meter-bar', sharePasswordStrengthClass]"
                  />
                  <p class="share-password-meter-guidance">
                    {{ sharePasswordStrengthGuidance }}
                  </p>
                  <div class="share-password-signal-grid" aria-label="Password quality signals">
                    <span
                      v-for="item in sharePasswordSignalItems"
                      :key="item.id"
                      class="share-password-signal-chip"
                      :class="{
                        'share-password-signal-chip--pass': item.passed,
                        'share-password-signal-chip--warn': !item.passed,
                      }"
                    >
                      <i
                        class="pi"
                        :class="item.passed ? 'pi-check-circle' : 'pi-circle'"
                        aria-hidden="true"
                      ></i>
                      <span>{{ item.label }}</span>
                    </span>
                  </div>
                  <p class="share-password-meter-note">
                    Password is required. Strength score is advisory only; longer
                    passphrases are safer.
                  </p>
                </div>

                <p v-if="sharePasswordValidationMessage" class="share-security-error">
                  {{ sharePasswordValidationMessage }}
                </p>
              </div>

              <div v-else class="share-fragment-detail">
                <Message severity="warn" icon="pi pi-exclamation-triangle" class="share-fragment-warning">
                  <div class="share-fragment-warning-copy">
                    <p class="share-fragment-warning-title">Shared-device warning</p>
                    <p class="share-fragment-warning-detail">
                      One-link mode keeps the decryption key inside the URL fragment.
                      Anyone with browser history access on a shared device may recover
                      this link and open the share.
                    </p>
                  </div>
                </Message>
                <div class="share-fragment-ack-shell">
                  <Checkbox
                    input-id="fragment-mode-risk-acknowledgement"
                    :binary="true"
                    :model-value="hasAcknowledgedFragmentModeRisk"
                    :disabled="isUploading"
                    @update:model-value="handleFragmentModeRiskAcknowledgementUpdate"
                  />
                  <label
                    for="fragment-mode-risk-acknowledgement"
                    class="share-fragment-ack-label"
                  >
                    I understand this mode is not recommended on shared devices and I
                    accept the risk.
                  </label>
                </div>
                <p v-if="!hasAcknowledgedFragmentModeRisk" class="share-fragment-ack-note">
                  Confirm this warning to enable share generation in one-link mode.
                </p>
                <ul class="share-security-detail-list">
                  <li>
                    <i class="pi pi-bolt" aria-hidden="true"></i>
                    <span>Fast recipient flow: open URL and decrypt immediately.</span>
                  </li>
                  <li>
                    <i class="pi pi-shield" aria-hidden="true"></i>
                    <span>
                      URL fragments are not sent in HTTP requests, so the server never
                      receives the fragment key.
                    </span>
                  </li>
                  <li>
                    <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
                    <span>
                      Treat the full link like a secret because it contains decryption
                      material.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
@import '../../css/share/step-collapse.css';

.share-step-collapsible-body--security {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-security-step {
  position: relative;
  padding: 1px;
  border-radius: 1rem;
  background: linear-gradient(
    140deg,
    color-mix(in srgb, var(--p-primary-color) 26%, transparent),
    color-mix(in srgb, #3b82f6 28%, transparent)
  );
  box-shadow:
    0 12px 30px color-mix(in srgb, #000000 16%, transparent),
    0 1px 0 color-mix(in srgb, #ffffff 10%, transparent) inset;
}

.share-security-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.1rem 1.14rem 1.08rem;
  border-radius: calc(1rem - 1px);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--p-content-background, #0f172a) 96%, var(--p-primary-color) 4%),
    color-mix(in srgb, var(--p-content-background, #0f172a) 99%, transparent)
  );
}

.share-security-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.share-security-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 0.48rem;
  max-width: 56rem;
}

.share-security-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.share-security-kicker-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.5rem;
  padding: 0.14rem 0.44rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #60a5fa 42%, transparent);
  background: color-mix(in srgb, #60a5fa 12%, transparent);
  color: #60a5fa;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.67rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.share-security-kicker-text {
  color: var(--p-text-muted-color);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-weight: 600;
}

.share-security-title {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.42;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.share-security-step-copy {
  margin: 0;
  font-size: 0.81rem;
  line-height: 1.56;
  color: var(--p-text-muted-color);
}

.share-security-step-subcopy {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.52;
  color: var(--text-dim);
}

.security-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.72rem;
}

.security-mode-card {
  appearance: none;
  text-align: left;
  cursor: pointer;
  width: 100%;
  margin: 0;
  padding: 0.82rem 0.84rem;
  border-radius: 0.82rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 90%, transparent);
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 95%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0.56rem;
  transition:
    border-color 0.25s ease,
    background-color 0.25s ease,
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.security-mode-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, #60a5fa 44%, var(--p-content-border-color));
}

.security-mode-card:focus-visible {
  outline: 2px solid color-mix(in srgb, #60a5fa 60%, transparent);
  outline-offset: 2px;
}

.security-mode-card--active {
  border-color: color-mix(in srgb, var(--p-primary-color) 58%, transparent);
  background: color-mix(in srgb, var(--p-primary-color) 11%, var(--p-content-background, #0f172a));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--p-primary-color) 24%, transparent),
    0 10px 20px color-mix(in srgb, var(--p-primary-color) 10%, transparent);
}

.security-mode-card-header {
  display: flex;
  align-items: center;
  gap: 0.52rem;
}

.security-mode-card-icon {
  width: 1.95rem;
  height: 1.95rem;
  border-radius: 0.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, #60a5fa 42%, transparent);
  background: color-mix(in srgb, #60a5fa 14%, transparent);
  color: #60a5fa;
}

.security-mode-card-heading {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.security-mode-card-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 620;
  color: var(--p-text-color);
}

.security-mode-card-subtitle {
  margin: 0;
  font-size: 0.74rem;
  color: var(--p-text-muted-color);
}

.security-mode-card-tag {
  margin-left: auto;
  flex-shrink: 0;
}

:deep(.security-mode-card-tag.p-tag) {
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 999px;
}

.security-mode-card-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.34rem;
}

.security-mode-card-list li {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.42rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
}

.security-mode-card-list li .pi {
  margin-top: 0.12rem;
  flex-shrink: 0;
  color: color-mix(in srgb, var(--p-primary-color) 78%, transparent);
}

.security-mode-card-hint {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--text-dim);
}

.share-security-detail-panel {
  display: flex;
  flex-direction: column;
  gap: 0.66rem;
  border-radius: 0.76rem;
  padding: 0.76rem 0.82rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 84%, transparent);
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 96%, transparent);
}

.share-security-detail-title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 620;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--p-text-color);
}

.share-password-shell {
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
}

.share-password-label {
  font-size: 0.84rem;
  font-weight: 600;
}

.share-password-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.share-security-password-input {
  width: 100%;
}

:deep(.share-security-password-input .p-password-input) {
  width: 100%;
}

.share-security-step-note {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.52;
  color: var(--p-text-muted-color);
}

.share-password-meter-shell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: none;
  border-radius: 0.72rem;
  padding: 0.68rem 0;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 95%, transparent);
}

.share-password-meter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.share-password-meter-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
}

.share-password-meter-score {
  font-size: 0.77rem;
  color: var(--p-text-color);
}

.share-password-meter-bar {
  height: 0.6rem;
}

:deep(.share-password-meter-bar .p-progressbar-value) {
  transition: width 0.35s ease, background-color 0.35s ease;
}

:deep(.share-password-meter-bar--very_weak .p-progressbar-value) {
  background: #ef4444;
}

:deep(.share-password-meter-bar--weak .p-progressbar-value) {
  background: #f97316;
}

:deep(.share-password-meter-bar--fair .p-progressbar-value) {
  background: #f59e0b;
}

:deep(.share-password-meter-bar--strong .p-progressbar-value) {
  background: #22c55e;
}

:deep(.share-password-meter-bar--very_strong .p-progressbar-value) {
  background: #14b8a6;
}

.share-password-meter-guidance {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
}

.share-password-signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.42rem;
}

.share-password-signal-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.34rem 0.45rem;
  border-radius: 0.52rem;
  font-size: 0.7rem;
  line-height: 1.35;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 85%, transparent);
}

.share-password-signal-chip .pi {
  flex-shrink: 0;
  font-size: 0.68rem;
}

.share-password-signal-chip--pass {
  color: color-mix(in srgb, #22c55e 82%, var(--p-text-color));
  border-color: color-mix(in srgb, #22c55e 36%, transparent);
  background: color-mix(in srgb, #22c55e 10%, transparent);
}

.share-password-signal-chip--warn {
  color: color-mix(in srgb, #f59e0b 85%, var(--p-text-color));
  border-color: color-mix(in srgb, #f59e0b 38%, transparent);
  background: color-mix(in srgb, #f59e0b 11%, transparent);
}

.share-password-meter-note {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--text-dim);
}

.share-fragment-detail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.share-fragment-warning {
  margin: 0;
}

.share-fragment-warning-copy {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.share-fragment-warning-title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 620;
  color: var(--p-text-color);
}

.share-fragment-warning-detail {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
}

.share-fragment-ack-shell {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.52rem;
}

.share-fragment-ack-label {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--p-text-color);
  cursor: pointer;
}

.share-fragment-ack-note {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: color-mix(in srgb, var(--p-yellow-500) 78%, var(--p-text-color));
}

.share-security-detail-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
}

.share-security-detail-list li {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.46rem;
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
}

.share-security-detail-list li .pi {
  margin-top: 0.12rem;
  flex-shrink: 0;
  color: color-mix(in srgb, var(--p-primary-color) 78%, transparent);
}

.security-detail-fade-enter-active,
.security-detail-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.security-detail-fade-enter-from,
.security-detail-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.share-security-error {
  margin-top: 0.05rem;
  color: var(--p-red-500);
  font-size: 0.9rem;
}

@media (prefers-reduced-motion: reduce) {
  .share-step-collapse-enter-active,
  .share-step-collapse-leave-active,
  .security-mode-card,
  .security-detail-fade-enter-active,
  .security-detail-fade-leave-active {
    animation: none !important;
    transition: none;
  }

  .security-mode-card:hover {
    transform: none;
  }
}

@media (max-width: 640px) {
  .share-security-shell {
    gap: 0.88rem;
    padding: 0.94rem;
  }

  .security-mode-grid {
    grid-template-columns: 1fr;
  }

  .security-mode-card {
    padding: 0.72rem 0.74rem;
  }

  .share-password-meter-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .share-password-signal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
