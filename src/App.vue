<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView } from 'vue-router'

/**
 * Root application shell.
 *
 * Adds a non-intrusive pointer glow effect for desktop pointers while honoring
 * reduced-motion preferences.
 */
const CURSOR_GLOW_X_VAR = '--cursor-glow-x'
const CURSOR_GLOW_Y_VAR = '--cursor-glow-y'
const CURSOR_GLOW_OPACITY_VAR = '--cursor-glow-opacity'

let isCursorGlowEnabled = false

function updateCursorGlowPosition(event: PointerEvent): void {
  if (event.pointerType === 'touch') {
    return
  }

  const root = document.documentElement
  root.style.setProperty(CURSOR_GLOW_X_VAR, `${event.clientX}px`)
  root.style.setProperty(CURSOR_GLOW_Y_VAR, `${event.clientY}px`)
  root.style.setProperty(CURSOR_GLOW_OPACITY_VAR, '1')
}

function hideCursorGlow(): void {
  document.documentElement.style.setProperty(CURSOR_GLOW_OPACITY_VAR, '0')
}

function handlePointerOut(event: PointerEvent): void {
  if (event.relatedTarget === null) {
    hideCursorGlow()
  }
}

onMounted((): void => {
  isCursorGlowEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!isCursorGlowEnabled) {
    return
  }

  window.addEventListener('pointermove', updateCursorGlowPosition, { passive: true })
  window.addEventListener('pointerout', handlePointerOut)
  window.addEventListener('blur', hideCursorGlow)
})

onBeforeUnmount((): void => {
  if (isCursorGlowEnabled) {
    window.removeEventListener('pointermove', updateCursorGlowPosition)
    window.removeEventListener('pointerout', handlePointerOut)
    window.removeEventListener('blur', hideCursorGlow)
  }
})
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="route-zoom" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
</template>
