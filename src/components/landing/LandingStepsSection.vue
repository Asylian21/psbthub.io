<script setup lang="ts">
import LandingGlassCard from './LandingGlassCard.vue'
import { LANDING_HOW_IT_WORKS_STEPS } from '../../content/landingContent'
</script>

<template>
  <section class="section">
    <div class="section-inner">
      <p class="section-label">How It Works</p>
      <h2 class="section-title">From Upload to the Next Signer in Three Steps</h2>
      <div class="steps-grid">
        <LandingGlassCard
          v-for="step in LANDING_HOW_IT_WORKS_STEPS"
          :key="step.number"
        >
          <span class="step-num">{{ step.number }}</span>
          <h3 class="card-title">{{ step.title }}</h3>
          <p class="card-text">{{ step.description }}</p>
        </LandingGlassCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
@import '../../css/landing/section-layout.css';

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(1.35rem, 2.8vw, 2rem);
}

.step-num {
  display: block;
  font-family: 'Roboto Mono', monospace;
  font-size: 2.25rem;
  font-weight: 600;
  color: rgba(245, 158, 11, 0.48);
  text-shadow: 0 0 18px rgba(245, 158, 11, 0.2);
  line-height: 1;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .steps-grid {
    grid-template-columns: 1fr;
    gap: 1.15rem;
  }
}
</style>
