<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="section section--cta">
    <div class="cta-inner">
      <h2 class="cta-title">Ready for the Next Signature?</h2>
      <p class="cta-subtitle">
        No onboarding. Encrypt, share, and continue signing in your own
        wallet flow.
      </p>
      <RouterLink to="/app" class="cta-glow-link">
        Open App
        <i class="pi pi-arrow-right" aria-hidden="true"></i>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
@import '../../css/landing/cta-glow-link.css';

.section {
  position: relative;
  z-index: 1;
  padding: var(--section-padding-y) var(--page-padding-x);
}

.section--cta {
  padding-bottom: clamp(3.75rem, 6vw, 5.25rem);
}

.cta-inner {
  max-width: 40rem;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.35rem;
}

.cta-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(1.65rem, 4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--heading);
  margin: 0;
}

.cta-subtitle {
  font-size: 1.05rem;
  color: var(--text-muted);
  line-height: 1.75;
  max-width: 31rem;
  margin: 0;
}

@media (max-width: 640px) {
  .cta-inner {
    gap: 1rem;
  }
}
</style>
