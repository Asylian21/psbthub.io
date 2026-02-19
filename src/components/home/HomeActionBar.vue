<script setup lang="ts">
import Button from 'primevue/button'

interface Props {
  copied: boolean
  isUploading: boolean
  canGenerateLink: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'reset'): void
  (event: 'generate'): void
}>()
</script>

<template>
  <div class="form-actions">
    <Button
      label="Reset"
      severity="secondary"
      outlined
      :disabled="isUploading"
      @click="emit('reset')"
    />
    <div class="form-actions-right">
      <span v-if="copied" class="copy-status">Share link copied to clipboard.</span>
      <Button
        label="Encrypt + copy share link"
        icon="pi pi-link"
        :loading="isUploading"
        :class="['generate-link-button', { 'generate-link-button--animated': canGenerateLink }]"
        :disabled="!canGenerateLink"
        @click="emit('generate')"
      />
    </div>
  </div>
</template>

<style scoped>
.copy-status {
  font-size: 0.875rem;
  color: var(--p-primary-color);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-actions-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-left: auto;
}

:deep(.generate-link-button.p-button.generate-link-button--animated) {
  --generate-link-border-angle: 0deg;
  position: relative;
  overflow: visible;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
  color: #0a0e1a;
  box-shadow:
    0 0 40px rgba(245, 158, 11, 0.25),
    0 0 80px rgba(245, 158, 11, 0.08);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

:deep(.generate-link-button.p-button.generate-link-button--animated):hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 50px rgba(245, 158, 11, 0.35),
    0 0 100px rgba(245, 158, 11, 0.12);
}

:deep(.generate-link-button.p-button.generate-link-button--animated)::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 999px;
  padding: 2px;
  background: conic-gradient(
    from var(--generate-link-border-angle),
    transparent 20%,
    rgba(255, 255, 255, 0.3) 45%,
    rgba(255, 255, 255, 0.65) 50%,
    rgba(255, 255, 255, 0.3) 55%,
    transparent 80%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: generate-link-border-spin 4s linear infinite;
}

:deep(.generate-link-button.p-button.generate-link-button--animated:hover)::before {
  background: conic-gradient(
    from var(--generate-link-border-angle),
    transparent 20%,
    rgba(255, 255, 255, 0.45) 45%,
    rgba(255, 255, 255, 0.85) 50%,
    rgba(255, 255, 255, 0.45) 55%,
    transparent 80%
  );
  animation-duration: 2.5s;
}

:deep(.generate-link-button.p-button.generate-link-button--animated .p-button-icon) {
  transition: transform 0.2s ease;
}

:deep(.generate-link-button.p-button.generate-link-button--animated:hover .p-button-icon) {
  transform: translateX(3px);
}

@keyframes generate-link-border-spin {
  to {
    --generate-link-border-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.generate-link-button.p-button.generate-link-button--animated),
  :deep(.generate-link-button.p-button.generate-link-button--animated)::before,
  :deep(.generate-link-button.p-button.generate-link-button--animated .p-button-icon) {
    animation: none !important;
    transition: none;
  }

  :deep(.generate-link-button.p-button.generate-link-button--animated:hover) {
    transform: none;
  }
}

@media (max-width: 640px) {
  .form-actions,
  .form-actions-right {
    width: 100%;
  }

  .form-actions-right {
    justify-content: space-between;
  }
}
</style>
