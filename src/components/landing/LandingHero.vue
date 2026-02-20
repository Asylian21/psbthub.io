<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LANDING_TRUST_ITEMS } from '../../content/landingContent'
</script>

<template>
  <section class="hero">
    <div class="hero-ring" aria-hidden="true"></div>
    <div class="hero-ring hero-ring--outer" aria-hidden="true"></div>
    <div class="hero-content">
      <span class="hero-badge">
        <i class="pi pi-shield" aria-hidden="true"></i>
        Encrypted PSBT Handoff
      </span>
      <h1 class="hero-title">
        Hand Off PSBTs Between Signers,
        <br />
        <span class="hero-accent">Don&#39;t Trust. Verify.</span>
      </h1>
      <p class="hero-subtitle">
        PSBTHub is a neutral bridge between Sparrow, Caravan, Specter, and
        other PSBT-compatible tools. Encrypt in your browser, share a link (or
        a link + password), and verify/sign in your own wallet. The server
        stores ciphertext only.
      </p>
      <!-- CTA — custom styled RouterLink; PrimeVue Button not used here
           because the landing hero needs a fully custom gradient/glow style
           that would require overriding the entire PrimeVue button theme. -->
      <RouterLink to="/app" class="cta-glow-link">
        Create Secure Link
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          class="cta-icon"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M322.2 351.8L507.3 166.7L382.6 505.1L322.2 351.7zM554.3 51.8L548.8 53.8L67.7 231.1L0 256C21.2 264.3 113.1 300.5 275.5 364.5C339.5 527 375.7 618.8 384 640L408.9 572.3L586.2 91.2L588.2 85.8L591.4 82.6L589.9 81.1L608 32L558.9 50.1L557.4 48.6L554.2 51.8zM473.3 132.8L288.2 317.8L134.8 257.5L473.3 132.8z"
          />
        </svg>
      </RouterLink>
      <div class="trust-bar">
        <template v-for="(item, itemIndex) in LANDING_TRUST_ITEMS" :key="item.label">
          <div class="trust-item">
            <i class="pi" :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </div>
          <span
            v-if="itemIndex < LANDING_TRUST_ITEMS.length - 1"
            class="trust-sep"
            aria-hidden="true"
          ></span>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
@import '../../css/landing/cta-glow-link.css';

.hero {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--hero-padding-top) var(--page-padding-x) var(--hero-padding-bottom);
  text-align: center;
}

.hero-ring {
  position: absolute;
  width: min(520px, 85vw);
  aspect-ratio: 1;
  border: 1px solid rgba(245, 158, 11, 0.08);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  pointer-events: none;
}

.hero-ring--outer {
  width: min(780px, 130vw);
  border-color: rgba(245, 158, 11, 0.035);
  transform: translate(-50%, -52%);
}

.hero-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.9rem;
  max-width: 54rem;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.15);
  color: var(--accent);
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  animation: fadeInUp 0.6s ease-out both;
}

.hero-badge .pi {
  font-size: 0.75rem;
}

.hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(2.5rem, 6vw, 4.25rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--heading);
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.hero-accent {
  background: linear-gradient(135deg, var(--accent-light), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--text-muted);
  line-height: 1.78;
  max-width: 40rem;
  margin: 0;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

/* Hero CTA enters with fadeInUp animation */
.cta-glow-link {
  animation: fadeInUp 0.6s ease-out 0.3s both;
}

.cta-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  fill: currentColor;
  transition: transform 0.2s;
}

.cta-glow-link:hover .cta-icon {
  transform: translate(3px, -2px);
}

/* ── Trust bar ── */
.trust-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2rem;
  color: var(--text-dim);
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.trust-item .pi {
  font-size: 0.75rem;
  color: var(--accent);
  opacity: 0.7;
}

.trust-sep {
  width: 1px;
  height: 0.9rem;
  background: var(--trust-divider);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero {
    min-height: auto;
    padding: 7.25rem 1.25rem 4.25rem;
  }

  .hero-content {
    gap: 1.4rem;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 6.75rem 1rem 3.75rem;
  }

  .trust-sep {
    display: none;
  }

  .trust-bar {
    gap: 1.05rem;
  }

}
</style>
