<script setup lang="ts">
import LandingGlassCard from './LandingGlassCard.vue'
import { LANDING_SECURITY_FEATURES } from '../../content/landingContent'
</script>

<template>
  <section class="section">
    <div class="section-inner">
      <p class="section-label">Security</p>
      <h2 class="section-title">Security Model You Can Audit</h2>
      <div class="features-grid">
        <LandingGlassCard
          v-for="feature in LANDING_SECURITY_FEATURES"
          :key="feature.title"
        >
          <div class="feature-icon">
            <i class="pi" :class="feature.icon" aria-hidden="true"></i>
          </div>
          <h3 class="card-title">{{ feature.title }}</h3>
          <p class="card-text">{{ feature.description }}</p>
        </LandingGlassCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
@import '../../css/landing/section-layout.css';

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(1.35rem, 2.8vw, 2rem);
}

.feature-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  margin-bottom: 1.35rem;
}

.feature-icon .pi {
  font-size: 1.05rem;
  color: var(--accent);
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
    gap: 1.15rem;
  }
}
</style>
