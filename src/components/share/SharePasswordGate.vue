<script setup lang="ts">
import Button from 'primevue/button'
import Password from 'primevue/password'
import ShareCreatedAtInfo from '../ShareCreatedAtInfo.vue'

interface Props {
  createdAtDisplay: string
  createdAtUtcDisplay: string
  passwordInput: string
  passwordPromptMessage: string
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:passwordInput', value: string): void
  (event: 'decrypt'): void
}>()

function handlePasswordInputUpdate(value: string | undefined): void {
  emit('update:passwordInput', value ?? '')
}

function handleDecryptRequest(): void {
  emit('decrypt')
}
</script>

<template>
  <div class="password-gate">
    <p class="password-gate-title">Password-protected share</p>
    <p class="password-gate-copy">
      Enter the password shared by the sender to decrypt this PSBT payload.
    </p>
    <ShareCreatedAtInfo
      v-if="createdAtDisplay"
      :created-at-display="createdAtDisplay"
      :created-at-utc-display="createdAtUtcDisplay"
    />
    <Password
      id="share-password-input"
      :model-value="passwordInput"
      :feedback="false"
      toggle-mask
      input-class="w-full"
      class="password-gate-input"
      fluid
      aria-label="Share decryption password"
      @update:model-value="handlePasswordInputUpdate"
      @keyup.enter="handleDecryptRequest"
    />
    <Button
      label="Decrypt with password"
      icon="pi pi-key"
      class="password-gate-button"
      @click="handleDecryptRequest"
    />
    <p class="password-gate-message">
      {{ passwordPromptMessage }}
    </p>
  </div>
</template>

<style scoped>
.password-gate {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem 0.95rem;
  border: 1px solid color-mix(in srgb, var(--p-content-border-color) 88%, transparent);
  border-radius: 0.72rem;
  background: color-mix(in srgb, var(--p-content-background, #0f172a) 95%, transparent);
}

.password-gate-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.password-gate-copy {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
}

.password-gate-input {
  width: 100%;
}

:deep(.password-gate-input .p-password-input) {
  width: 100%;
}

.password-gate-button {
  align-self: flex-start;
}

.password-gate-message {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
</style>
