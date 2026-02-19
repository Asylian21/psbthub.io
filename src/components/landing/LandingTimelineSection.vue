<script setup lang="ts">
import Timeline from 'primevue/timeline'
import LandingGlassCard from './LandingGlassCard.vue'
import { LANDING_TIMELINE_PHASES } from '../../content/landingContent'
</script>

<template>
  <section class="section">
    <div class="section-inner">
      <p class="section-label">Roadmap</p>
      <h2 class="section-title">Shipping a Better PSBT Bridge, One Layer at a Time</h2>
      <p class="timeline-intro">
        We ship in small, security-first phases so every release stays auditable and practical for real multisig
        handoffs. This roadmap is directional (no calendar promises).
      </p>
      <Timeline :value="LANDING_TIMELINE_PHASES" align="left" class="roadmap-timeline">
        <template #marker="slotProps">
          <span class="timeline-marker" :class="`timeline-marker--${slotProps.item.statusTone}`">
            <i class="pi" :class="slotProps.item.icon" aria-hidden="true"></i>
          </span>
        </template>
        <template #content="slotProps">
          <LandingGlassCard
            :always-animate="slotProps.item.statusTone === 'in-progress'"
            class="timeline-card"
          >
            <div class="timeline-card-head">
              <div class="timeline-meta">
                <span class="timeline-phase">{{ slotProps.item.phase }}</span>
                <span class="timeline-period timeline-period--inline">{{ slotProps.item.period }}</span>
              </div>
              <span class="timeline-status" :class="`timeline-status--${slotProps.item.statusTone}`">
                {{ slotProps.item.statusLabel }}
              </span>
            </div>
            <h3 class="card-title">{{ slotProps.item.title }}</h3>
            <p class="card-text">{{ slotProps.item.description }}</p>
            <ul class="timeline-highlights">
              <li v-for="highlight in slotProps.item.highlights" :key="highlight">
                {{ highlight }}
              </li>
            </ul>
          </LandingGlassCard>
        </template>
      </Timeline>
    </div>
  </section>
</template>

<style scoped>
@import '../../css/landing/section-layout.css';

/* ── Timeline intro ── */
.timeline-intro {
  max-width: 44rem;
  margin: -1.65rem auto 2.7rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.98rem;
  line-height: 1.7;
}

/* ── PrimeVue Timeline overrides ── */
.roadmap-timeline {
  max-width: 66rem;
  margin: 0 auto;
}

.roadmap-timeline :deep(.p-timeline-event) {
  min-height: 12.8rem;
}

.roadmap-timeline :deep(.p-timeline-event-opposite) {
  display: none;
  flex: 0 0 0;
  padding: 0;
}

.roadmap-timeline :deep(.p-timeline-event-separator) {
  flex: 0 0 2.35rem;
}

.roadmap-timeline :deep(.p-timeline-event-marker) {
  width: auto;
  height: auto;
  border: none;
  background: transparent;
  box-shadow: none;
}

.roadmap-timeline :deep(.p-timeline-event-connector) {
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(245, 158, 11, 0.44) 0%,
    rgba(148, 163, 184, 0.3) 100%
  );
}

.roadmap-timeline :deep(.p-timeline-event-content) {
  padding: 0 0 1.2rem 1.1rem;
}

/* ── Timeline marker ── */
.timeline-marker {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: var(--interactive-bg-strong);
  color: var(--text-muted);
  box-shadow: 0 8px 20px rgba(2, 6, 23, 0.24);
}

.timeline-marker .pi {
  font-size: 0.78rem;
}

.timeline-marker--live {
  border-color: rgba(34, 197, 94, 0.42);
  background: rgba(34, 197, 94, 0.13);
  color: #4ade80;
}

.timeline-marker--in-progress {
  border-color: rgba(245, 158, 11, 0.42);
  background: rgba(245, 158, 11, 0.16);
  color: var(--accent-light);
}

.timeline-marker--planned {
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(148, 163, 184, 0.13);
  color: var(--text-muted);
}

html.app-light .timeline-marker {
  box-shadow: 0 10px 22px rgba(148, 163, 184, 0.24);
}

html.app-light .timeline-marker--live {
  color: #16a34a;
}

html.app-light .timeline-marker--in-progress {
  color: #b45309;
}

html.app-light .roadmap-timeline :deep(.p-timeline-event-connector) {
  background: linear-gradient(
    180deg,
    rgba(217, 119, 6, 0.4) 0%,
    rgba(100, 116, 139, 0.3) 100%
  );
}

/* ── Timeline card ── */
:deep(.timeline-card) {
  padding: clamp(1.45rem, 2vw, 1.85rem);
}

.timeline-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.7rem;
}

.timeline-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.timeline-phase {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.timeline-period {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.timeline-period--inline {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.26rem 0.52rem;
  border: 1px solid var(--border);
  background: var(--interactive-bg);
}

/* ── Timeline status badges ── */
.timeline-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  border: 1px solid var(--border);
  background: var(--interactive-bg);
  font-family: 'Roboto Mono', monospace;
  font-size: 0.67rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.timeline-status--live {
  border-color: rgba(34, 197, 94, 0.34);
  background: rgba(34, 197, 94, 0.11);
  color: #4ade80;
}

.timeline-status--in-progress {
  border-color: rgba(245, 158, 11, 0.34);
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-light);
}

.timeline-status--planned {
  border-color: rgba(148, 163, 184, 0.3);
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-muted);
}

html.app-light .timeline-status--live {
  color: #15803d;
}

html.app-light .timeline-status--in-progress {
  color: #92400e;
}

/* ── Timeline card title override ── */
:deep(.timeline-card .card-title) {
  margin-bottom: 0.55rem;
}

/* ── Timeline highlights list ── */
.timeline-highlights {
  margin: 0.95rem 0 0;
  padding-left: 1.05rem;
  display: grid;
  gap: 0.45rem;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.52;
}

.timeline-highlights li::marker {
  color: var(--accent);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .timeline-intro {
    margin: -1.25rem auto 2.15rem;
    font-size: 0.94rem;
  }

  .roadmap-timeline :deep(.p-timeline-event) {
    min-height: auto;
  }

  .roadmap-timeline :deep(.p-timeline-event-opposite) {
    display: none;
  }

  .roadmap-timeline :deep(.p-timeline-event-separator) {
    flex: 0 0 1.9rem;
  }

  .roadmap-timeline :deep(.p-timeline-event-content) {
    padding: 0 0 1rem 0.6rem;
  }

  :deep(.timeline-card) {
    padding: 1.5rem;
  }

  .timeline-card-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 640px) {
  .roadmap-timeline :deep(.p-timeline-event-content) {
    padding-left: 0.45rem;
  }

  .timeline-highlights {
    font-size: 0.84rem;
  }
}
</style>
