<script setup lang="ts">
/**
 * Reusable glass card with rotating border glow on hover
 * and cursor-following spotlight effect.
 *
 * Slot content receives `:deep(.card-title)` and `:deep(.card-text)` styling.
 */
interface Props {
  alwaysAnimate?: boolean
}

withDefaults(defineProps<Props>(), {
  alwaysAnimate: false,
})

function handleMouseMove(event: MouseEvent): void {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
  el.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)
}
</script>

<template>
  <article
    :class="['glass-card', { 'glass-card--always-animate': alwaysAnimate }]"
    @mousemove="handleMouseMove"
  >
    <slot />
  </article>
</template>

<style scoped>
.glass-card {
  position: relative;
  isolation: isolate;
  padding: clamp(1.85rem, 2.7vw, 2.35rem);
  border-radius: 18px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  transition:
    border-color 0.3s ease,
    background 0.3s ease;
}

.glass-card:hover {
  border-color: rgba(245, 158, 11, 0.12);
  background: var(--card-hover-bg);
}

/* Rotating border that sweeps around the card on hover */
.glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  padding: 1px;
  background: conic-gradient(
    from var(--border-angle),
    transparent 25%,
    rgba(245, 158, 11, 0.35) 47%,
    var(--accent) 50%,
    rgba(245, 158, 11, 0.35) 53%,
    transparent 75%
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
  opacity: 0;
  transition: opacity 0.4s ease;
}

.glass-card:hover::before,
.glass-card--always-animate::before {
  opacity: 1;
  animation: border-spin 3s linear infinite;
}

/* Spotlight glow that follows the cursor */
.glass-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  background: radial-gradient(
    350px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(245, 158, 11, 0.06),
    transparent 60%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.glass-card:hover::after {
  opacity: 1;
}

@keyframes border-spin {
  to {
    --border-angle: 360deg;
  }
}

/* Shared typography for slot content */
:deep(.card-title) {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--heading);
  margin: 0 0 0.65rem;
}

:deep(.card-text) {
  font-size: 0.925rem;
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0;
}

:deep(.card-text code) {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.85em;
  background: var(--inline-code-bg);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .glass-card {
    padding: 1.7rem;
    border-radius: 16px;
  }

  .glass-card::before,
  .glass-card::after {
    border-radius: 16px;
  }
}
</style>
