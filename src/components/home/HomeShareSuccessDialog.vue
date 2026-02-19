<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

interface ShareLinkSegments {
  origin: string
  sharePath: string
  keyFragment: string | null
}

interface ShareExpiryCountdownUnit {
  id: string
  value: string
  label: string
}

interface ShareExpiryCountdownStatus {
  label: string
  modifier: 'safe' | 'warn' | 'critical'
}

interface Props {
  visible: boolean
  successShareLink: string
  hasGeneratedSharePassword: boolean
  generatedSharePassword: string
  shareLinkSegments: ShareLinkSegments | null
  showExpiryCountdown: boolean
  successShareExpiryScheduleLabel: string
  successShareExpiryCountdownUnits: ShareExpiryCountdownUnit[]
  successShareExpiryCountdownStatus: ShareExpiryCountdownStatus | null
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'copy-link'): void
  (event: 'copy-password'): void
  (event: 'done'): void
  (event: 'hide'): void
}>()
</script>

<template>
  <Dialog
    :visible="visible"
    header="Share link ready"
    modal
    dismissable-mask
    :style="{ width: '40rem', maxWidth: 'calc(100vw - 2rem)' }"
    @update:visible="emit('update:visible', $event)"
    @hide="emit('hide')"
  >
    <div class="share-success-content">
      <div class="share-success-hero">
        <i class="pi pi-check-circle share-success-icon" aria-hidden="true"></i>
        <div class="share-success-copy">
          <p class="share-success-title">
            {{
              hasGeneratedSharePassword
                ? 'Encrypted share created. Send the password separately.'
                : 'Encrypted share created and copied.'
            }}
          </p>
        </div>
      </div>

      <div class="share-success-link-shell">
        <div class="share-success-link-head">
          <span class="share-success-link-label">Share URL</span>
          <Button
            label="Copy"
            icon="pi pi-copy"
            severity="secondary"
            text
            size="small"
            class="share-success-inline-copy-button"
            @click="emit('copy-link')"
          />
        </div>
        <a :href="successShareLink" target="_blank" rel="noopener noreferrer" class="share-success-link">
          {{ successShareLink }}
        </a>
      </div>

      <div v-if="hasGeneratedSharePassword" class="share-success-password-shell">
        <span class="share-success-link-label">Decryption password</span>
        <code class="share-success-password-value">{{ generatedSharePassword }}</code>
        <p class="share-success-password-note">
          Send this password separately from the URL.
        </p>
      </div>

      <div v-if="shareLinkSegments" class="share-success-segments" aria-label="Share URL segments">
        <div class="share-success-segment">
          <span class="share-success-segment-label">Origin</span>
          <code class="share-success-segment-value">{{ shareLinkSegments.origin }}</code>
        </div>
        <div class="share-success-segment">
          <span class="share-success-segment-label">Share path</span>
          <code class="share-success-segment-value">{{ shareLinkSegments.sharePath }}</code>
        </div>
        <div class="share-success-segment">
          <span class="share-success-segment-label">Key fragment</span>
          <code class="share-success-segment-value">
            {{
              shareLinkSegments.keyFragment ??
              'Not included in URL (password-protected share)'
            }}
          </code>
        </div>
      </div>

      <p class="share-success-note">
        {{
          hasGeneratedSharePassword
            ? 'Recipients need both the URL and the password to decrypt.'
            : 'Anyone with the full link can decrypt. Treat it like a secret and share only with intended signers.'
        }}
      </p>

      <div
        v-if="showExpiryCountdown && successShareExpiryCountdownStatus"
        class="share-success-countdown-shell"
      >
        <span class="share-success-link-label">Automatic deletion timer</span>
        <div class="share-expiry-countdown-shell share-expiry-countdown-shell--success" aria-live="polite">
          <div class="share-expiry-countdown-head">
            <div class="share-expiry-countdown-title-row">
              <span class="share-expiry-countdown-live-dot share-expiry-countdown-live-dot--active" aria-hidden="true"></span>
              <strong class="share-expiry-countdown-title">
                Live auto-delete countdown
              </strong>
            </div>
            <div class="share-expiry-countdown-chip-row">
              <span class="share-expiry-countdown-phase-chip share-expiry-countdown-phase-chip--active">
                Uploaded
              </span>
              <span
                class="share-expiry-countdown-status-chip"
                :class="`share-expiry-countdown-status-chip--${successShareExpiryCountdownStatus.modifier}`"
              >
                {{ successShareExpiryCountdownStatus.label }}
              </span>
            </div>
          </div>
          <p class="share-expiry-countdown-context">
            Upload is complete. The encrypted payload is now scheduled for automatic deletion.
          </p>
          <p class="share-expiry-countdown-schedule">
            Scheduled deletion:
            <strong>{{ successShareExpiryScheduleLabel }}</strong>
          </p>
          <div class="share-expiry-countdown-grid" role="timer" aria-label="PSBT deletion countdown in success dialog">
            <div
              v-for="unit in successShareExpiryCountdownUnits"
              :key="`success-${unit.id}`"
              class="share-expiry-countdown-unit"
            >
              <Transition name="countdown-tick" mode="out-in">
                <span :key="`success-${unit.id}-${unit.value}`" class="share-expiry-countdown-value">
                  {{ unit.value }}
                </span>
              </Transition>
              <span class="share-expiry-countdown-label">{{ unit.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Copy again" icon="pi pi-copy" severity="secondary" text @click="emit('copy-link')" />
      <Button
        v-if="hasGeneratedSharePassword"
        label="Copy password"
        icon="pi pi-key"
        severity="secondary"
        text
        @click="emit('copy-password')"
      />
      <Button label="Done" icon="pi pi-check" autofocus @click="emit('done')" />
    </template>
  </Dialog>
</template>

<style scoped>
@import '../../css/share/countdown-grid.css';

.share-success-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-success-hero {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.share-success-icon {
  color: var(--p-green-500);
  font-size: 1.4rem;
  margin-top: 0.15rem;
}

.share-success-copy {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.share-success-title {
  margin: 0;
  font-weight: 600;
}

.share-success-link-shell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 92%, transparent);
}

.share-success-link-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

:deep(.share-success-inline-copy-button.p-button) {
  padding: 0.18rem 0.42rem;
}

.share-success-countdown-shell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.share-success-password-shell {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 92%, transparent);
}

.share-success-password-value {
  margin: 0;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--p-text-color);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.share-success-password-note {
  margin: 0;
  font-size: 0.76rem;
  color: var(--p-text-muted-color);
}

.share-success-link {
  display: block;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--p-primary-color);
  text-decoration: none;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.share-success-link:hover {
  text-decoration: underline;
}

.share-success-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--p-primary-color) 70%, transparent);
  outline-offset: 3px;
  border-radius: 0.3rem;
}

.share-success-link-label {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.share-success-segments {
  display: grid;
  gap: 0.55rem;
}

.share-success-segment {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  padding: 0.56rem 0.68rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 85%, transparent);
  border-radius: 0.62rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 95%, transparent);
}

.share-success-segment-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.share-success-segment-value {
  margin: 0;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.77rem;
  color: var(--p-text-color);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.share-success-note {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.86rem;
  line-height: 1.45;
}

</style>
