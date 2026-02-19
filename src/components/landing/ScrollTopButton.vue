<script setup lang="ts">
import Button from 'primevue/button'

interface Props {
  visible: boolean
  elevated: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'click'): void
}>()
</script>

<template>
  <Transition name="scroll-top-fade">
    <Button
      v-if="visible"
      type="button"
      icon="pi pi-arrow-up"
      :class="['scroll-top-button', { 'scroll-top-button--elevated': elevated }]"
      aria-label="Scroll back to top"
      @click="emit('click')"
    />
  </Transition>
</template>

<style scoped>
.scroll-top-button {
  position: fixed;
  right: clamp(1rem, 2.2vw, 1.75rem);
  bottom: clamp(1rem, 2.2vw, 1.75rem);
  z-index: 90;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  border: 1px solid var(--scroll-top-border);
  background: var(--scroll-top-bg);
  color: var(--scroll-top-icon);
  padding: 0;
  overflow: hidden;
  isolation: isolate;
  box-shadow: var(--scroll-top-shadow);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  transform: translateZ(0);
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    bottom 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.2s ease,
    box-shadow 0.25s ease,
    color 0.2s ease;
}

.scroll-top-button--elevated {
  bottom: calc(clamp(5rem, 11vw, 6.75rem) + env(safe-area-inset-bottom, 0px));
}

.scroll-top-button::after {
  content: '';
  position: absolute;
  inset: -0.32rem;
  border-radius: inherit;
  border: 1px solid var(--scroll-top-ring);
  opacity: 0;
  transform: scale(0.88);
  transition: opacity 0.24s ease, transform 0.24s ease;
  pointer-events: none;
}

.scroll-top-button:hover {
  transform: translateY(-3px) scale(1.03);
  background: var(--scroll-top-bg-hover);
  border-color: var(--scroll-top-border-hover);
  box-shadow: var(--scroll-top-shadow-hover);
  color: var(--accent-light);
}

.scroll-top-button:hover::after,
.scroll-top-button:focus-visible::after {
  opacity: 1;
  transform: scale(1);
}

.scroll-top-button:active {
  transform: translateY(0) scale(0.97);
}

.scroll-top-button:focus-visible {
  outline: 2px solid rgba(245, 158, 11, 0.65);
  outline-offset: 2px;
}

:deep(.scroll-top-button .p-button-icon) {
  font-size: 0.92rem;
  position: relative;
  z-index: 1;
  transition: transform 0.2s ease;
}

:deep(.scroll-top-button:hover .p-button-icon) {
  transform: translateY(-1px);
}

.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease, filter 0.24s ease;
}

.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(0.7rem) scale(0.92);
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .scroll-top-button,
  .scroll-top-button::after,
  .scroll-top-fade-enter-active,
  .scroll-top-fade-leave-active,
  :deep(.scroll-top-button .p-button-icon) {
    transition: none;
  }
}

@media (max-width: 640px) {
  .scroll-top-button {
    width: 2.5rem;
    height: 2.5rem;
    right: 0.85rem;
    bottom: 0.85rem;
  }

  .scroll-top-button--elevated {
    bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px));
  }
}
</style>
