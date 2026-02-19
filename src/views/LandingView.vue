<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import LandingBottomCta from '../components/landing/LandingBottomCta.vue'
import LandingHero from '../components/landing/LandingHero.vue'
import LandingQuoteDivider from '../components/landing/LandingQuoteDivider.vue'
import LandingSecuritySection from '../components/landing/LandingSecuritySection.vue'
import LandingStepsSection from '../components/landing/LandingStepsSection.vue'
import LandingTimelineSection from '../components/landing/LandingTimelineSection.vue'
import ScrollTopButton from '../components/landing/ScrollTopButton.vue'
import {
  LANDING_FOOTER_GITHUB_URL,
  LANDING_FOOTER_X_URL,
  LANDING_PRIMARY_QUOTE,
  LANDING_PRIMARY_QUOTE_CITE,
  LANDING_SCROLL_TOP_SHOW_OFFSET,
  LANDING_SECONDARY_QUOTE,
  LANDING_SECONDARY_QUOTE_CITE,
} from '../content/landingContent'
import { useFooterVisibility } from '../composables/shared/useFooterVisibility'
import { useScrollVisibility } from '../composables/shared/useScrollVisibility'
import { useAppStore } from '../stores/app'

/**
 * Public marketing page.
 *
 * Focuses on product positioning, security model communication,
 * and roadmap visibility for multisig signers.
 */
const currentYear = new Date().getFullYear()
const appStore = useAppStore()
const { isVisible: isScrollTopVisible } = useScrollVisibility(LANDING_SCROLL_TOP_SHOW_OFFSET)
const { isVisible: isFooterVisible } = useFooterVisibility()

const isDarkMode = computed({
  get: (): boolean => appStore.themeMode === 'dark',
  set: (value: boolean) => {
    appStore.setThemeMode(value ? 'dark' : 'light')
  },
})

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="landing">
    <!-- Ambient background glows -->
    <div class="landing-bg" aria-hidden="true">
      <div class="landing-cubes landing-cubes--left"></div>
      <div class="landing-cubes landing-cubes--right"></div>
      <div class="glow glow--amber"></div>
      <div class="glow glow--blue"></div>
    </div>

    <!-- Navigation -->
    <header class="nav">
      <div class="nav-inner">
        <RouterLink to="/" class="nav-brand">
          <span class="brand-ns">psbt</span><span class="brand-sep">:</span><span class="brand-name">hub</span><span
            class="brand-cursor" aria-hidden="true"></span>
        </RouterLink>
        <nav class="nav-links" aria-label="Primary navigation">
          <a href="#how-it-works" class="nav-link">How It Works</a>
          <a href="#timeline" class="nav-link">Roadmap</a>
          <a href="#security" class="nav-link">Security</a>
        </nav>
        <div class="nav-actions">
          <a class="nav-icon-link" :href="LANDING_FOOTER_GITHUB_URL" target="_blank" rel="noopener noreferrer"
            aria-label="Open project on GitHub">
            <i class="pi pi-github" aria-hidden="true"></i>
          </a>
          <!-- X social network temporarily hidden
          <a class="nav-icon-link" :href="LANDING_FOOTER_X_URL" target="_blank" rel="noopener noreferrer"
            aria-label="Open project on X">
            <span class="nav-icon-glyph" aria-hidden="true">X</span>
          </a>
          -->
        </div>
      </div>
    </header>

    <LandingHero />
    <LandingStepsSection id="how-it-works" />
    <LandingTimelineSection id="timeline" />
    <LandingQuoteDivider :quote="LANDING_PRIMARY_QUOTE" :cite="LANDING_PRIMARY_QUOTE_CITE" />
    <LandingSecuritySection id="security" />
    <LandingQuoteDivider :quote="LANDING_SECONDARY_QUOTE" :cite="LANDING_SECONDARY_QUOTE_CITE" />
    <LandingBottomCta />

    <AppFooter
      v-model="isDarkMode"
      :current-year="currentYear"
      :github-url="LANDING_FOOTER_GITHUB_URL"
      :x-url="LANDING_FOOTER_X_URL"
      theme-toggle-input-id="landing-theme-toggle"
    />
    <ScrollTopButton
      :visible="isScrollTopVisible"
      :elevated="isFooterVisible"
      @click="scrollToTop"
    />
  </div>
</template>

<style>
/* @property must be global for conic-gradient angle animation */
@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
</style>

<style scoped>
/* ── Design tokens ── */
.landing {
  --bg: #050a15;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --heading: #ffffff;
  --brand-primary: #ffffff;
  --accent: #f59e0b;
  --accent-light: #fbbf24;
  --border: rgba(255, 255, 255, 0.06);
  --card-bg: rgba(255, 255, 255, 0.022);
  --card-hover-bg: rgba(255, 255, 255, 0.04);
  --inline-code-bg: rgba(255, 255, 255, 0.06);
  --quote-text: rgba(255, 255, 255, 0.96);
  --nav-bg: rgba(5, 10, 21, 0.75);
  --interactive-border: rgba(255, 255, 255, 0.15);
  --interactive-bg: rgba(255, 255, 255, 0.03);
  --interactive-bg-strong: rgba(255, 255, 255, 0.06);
  --interactive-hover-bg: rgba(255, 255, 255, 0.1);
  --interactive-hover-border: rgba(255, 255, 255, 0.16);
  --trust-divider: rgba(255, 255, 255, 0.1);
  --switch-track-bg: rgba(148, 163, 184, 0.05);
  --switch-track-border: rgba(148, 163, 184, 0.25);
  --switch-track-checked-bg: rgba(148, 163, 184, 0.1);
  --switch-track-checked-border: rgba(148, 163, 184, 0.34);
  --switch-handle-bg: rgba(15, 23, 42, 0.9);
  --switch-handle-border: rgba(148, 163, 184, 0.35);
  --switch-icon: rgba(226, 232, 240, 0.95);
  --switch-icon-checked: #f8fafc;
  --cube-mask-fade: rgba(5, 10, 21, 0.3);
  --cube-mask-soft: rgba(5, 10, 21, 0.1);
  --cube-blend-mode: screen;
  --cube-opacity: 0.38;
  --cube-filter: saturate(0.9);
  --glow-amber: rgba(245, 158, 11, 0.09);
  --glow-blue: rgba(99, 102, 241, 0.04);
  --footer-bg-start: rgba(15, 23, 42, 0.18);
  --footer-bg-mid: rgba(5, 10, 21, 0.72);
  --footer-bg-end: rgba(5, 10, 21, 0.95);
  --footer-note: rgba(148, 163, 184, 0.85);
  --footer-divider-full: rgba(148, 163, 184, 0.24);
  --footer-actions-divider-mid: rgba(148, 163, 184, 0.35);
  --footer-social-border: rgba(148, 163, 184, 0.25);
  --footer-social-bg: rgba(148, 163, 184, 0.05);
  --footer-social-text: var(--text-dim);
  --scroll-top-bg: linear-gradient(140deg, rgba(30, 41, 59, 0.82), rgba(15, 23, 42, 0.86));
  --scroll-top-bg-hover: linear-gradient(140deg, rgba(51, 65, 85, 0.9), rgba(15, 23, 42, 0.95));
  --scroll-top-border: rgba(148, 163, 184, 0.34);
  --scroll-top-border-hover: rgba(245, 158, 11, 0.45);
  --scroll-top-icon: #f8fafc;
  --scroll-top-shadow: 0 14px 36px rgba(2, 6, 23, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  --scroll-top-shadow-hover: 0 18px 44px rgba(2, 6, 23, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.26);
  --scroll-top-ring: rgba(245, 158, 11, 0.38);
  --content-max-width: 74rem;
  --page-padding-x: clamp(1.25rem, 3.4vw, 2.5rem);
  --hero-padding-top: clamp(7.75rem, 10vw, 9.5rem);
  --hero-padding-bottom: clamp(4.5rem, 7vw, 6.5rem);
  --section-padding-y: clamp(5.5rem, 8vw, 7.75rem);

  position: relative;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
}

html.app-light .landing {
  --bg: #f8fafc;
  --text: #0f172a;
  --text-muted: #475569;
  --text-dim: #64748b;
  --heading: #0f172a;
  --brand-primary: #0f172a;
  --border: rgba(15, 23, 42, 0.12);
  --card-bg: rgba(255, 255, 255, 0.84);
  --card-hover-bg: rgba(255, 255, 255, 0.96);
  --inline-code-bg: rgba(15, 23, 42, 0.06);
  --quote-text: #1e293b;
  --nav-bg: rgba(247, 250, 255, 0.82);
  --interactive-border: rgba(148, 163, 184, 0.42);
  --interactive-bg: rgba(255, 255, 255, 0.74);
  --interactive-bg-strong: rgba(255, 255, 255, 0.85);
  --interactive-hover-bg: rgba(255, 255, 255, 0.95);
  --interactive-hover-border: rgba(148, 163, 184, 0.55);
  --trust-divider: rgba(148, 163, 184, 0.4);
  --switch-track-bg: rgba(148, 163, 184, 0.22);
  --switch-track-border: rgba(100, 116, 139, 0.42);
  --switch-track-checked-bg: rgba(245, 158, 11, 0.22);
  --switch-track-checked-border: rgba(217, 119, 6, 0.5);
  --switch-handle-bg: #ffffff;
  --switch-handle-border: rgba(148, 163, 184, 0.6);
  --switch-icon: #475569;
  --switch-icon-checked: #9a3412;
  --cube-mask-fade: rgba(241, 245, 249, 0.16);
  --cube-mask-soft: rgba(241, 245, 249, 0.04);
  --cube-blend-mode: normal;
  --cube-opacity: 0.24;
  --cube-filter: saturate(1.02) contrast(1.04);
  --glow-amber: rgba(245, 158, 11, 0.06);
  --glow-blue: rgba(99, 102, 241, 0.03);
  --footer-bg-start: rgba(15, 23, 42, 0.04);
  --footer-bg-mid: rgba(226, 232, 240, 0.68);
  --footer-bg-end: rgba(226, 232, 240, 0.9);
  --footer-note: rgba(71, 85, 105, 0.9);
  --footer-divider-full: rgba(148, 163, 184, 0.45);
  --footer-actions-divider-mid: rgba(100, 116, 139, 0.42);
  --footer-social-border: rgba(100, 116, 139, 0.32);
  --footer-social-bg: rgba(255, 255, 255, 0.76);
  --footer-social-text: #334155;
  --scroll-top-bg: linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.9));
  --scroll-top-bg-hover: linear-gradient(140deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.98));
  --scroll-top-border: rgba(100, 116, 139, 0.32);
  --scroll-top-border-hover: rgba(217, 119, 6, 0.5);
  --scroll-top-icon: #1e293b;
  --scroll-top-shadow: 0 12px 30px rgba(148, 163, 184, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.92);
  --scroll-top-shadow-hover: 0 16px 36px rgba(148, 163, 184, 0.34), inset 0 1px 0 rgba(255, 255, 255, 1);
  --scroll-top-ring: rgba(217, 119, 6, 0.28);
}

/* ── Ambient background ── */
.landing-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.landing-cubes {
  position: absolute;
  top: -8%;
  bottom: -8%;
  width: min(34vw, 30rem);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 220'><g fill='none' stroke='%2399b8ff' stroke-opacity='.36' stroke-width='1'><path d='M20 54 60 31 100 54 100 100 60 123 20 100Z'/><path d='M60 31V77M20 54 60 77 100 54'/><path d='M140 14 180 -9 220 14 220 60 180 83 140 60Z'/><path d='M180 -9V37M140 14 180 37 220 14'/><path d='M200 112 240 89 280 112 280 158 240 181 200 158Z'/><path d='M240 89V135M200 112 240 135 280 112'/><path d='M80 136 120 113 160 136 160 182 120 205 80 182Z'/><path d='M120 113V159M80 136 120 159 160 136'/></g><g fill='%2379a7ff' fill-opacity='.08' stroke='%2399b8ff' stroke-opacity='.24' stroke-width='1'><path d='M258 18 298 -5 338 18 338 64 298 87 258 64Z'/><path d='M298 -5V41M258 18 298 41 338 18'/></g></svg>");
  background-size: 31rem auto;
  background-repeat: repeat;
  mix-blend-mode: var(--cube-blend-mode);
  filter: var(--cube-filter);
  opacity: var(--cube-opacity);
  z-index: 0;
  will-change: transform, opacity;
}

.landing-cubes::after {
  content: '';
  position: absolute;
  inset: 0;
}

.landing-cubes--left {
  left: -8rem;
  animation: cubes-float-left 34s ease-in-out infinite alternate;
}

.landing-cubes--left::after {
  background:
    linear-gradient(to right, rgba(5, 10, 21, 0) 0%, rgba(5, 10, 21, 0) 74%, var(--cube-mask-fade) 88%, var(--bg) 100%),
    linear-gradient(to bottom, rgba(5, 10, 21, 0) 0%, var(--cube-mask-soft) 18%, var(--cube-mask-soft) 82%, rgba(5, 10, 21, 0) 100%);
}

.landing-cubes--right {
  right: -8rem;
  background-position: 8rem -6rem;
  animation: cubes-float-right 38s ease-in-out infinite alternate;
}

.landing-cubes--right::after {
  background:
    linear-gradient(to left, rgba(5, 10, 21, 0) 0%, rgba(5, 10, 21, 0) 74%, var(--cube-mask-fade) 88%, var(--bg) 100%),
    linear-gradient(to bottom, rgba(5, 10, 21, 0) 0%, var(--cube-mask-soft) 18%, var(--cube-mask-soft) 82%, rgba(5, 10, 21, 0) 100%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  z-index: 1;
}

.glow--amber {
  width: 750px;
  height: 750px;
  background: radial-gradient(circle, var(--glow-amber) 0%, transparent 70%);
  top: -280px;
  left: 50%;
  transform: translateX(-50%);
  animation: glow-pulse 8s ease-in-out infinite;
}

.glow--blue {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--glow-blue) 0%, transparent 70%);
  bottom: 8%;
  right: -80px;
  animation: glow-pulse 10s ease-in-out 2s infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes cubes-float-left {
  0% { transform: translate3d(0, -2%, 0) scale(1); }
  50% { transform: translate3d(1.5%, 1%, 0) scale(1.02); }
  100% { transform: translate3d(-0.8%, 3%, 0) scale(1.01); }
}

@keyframes cubes-float-right {
  0% { transform: translate3d(0, 2%, 0) scale(1.01); }
  50% { transform: translate3d(-1.2%, -0.5%, 0) scale(1.02); }
  100% { transform: translate3d(0.7%, -2.5%, 0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .landing-cubes--left,
  .landing-cubes--right {
    animation: none;
  }
}

/* ── Navigation ── */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: var(--nav-bg);
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 1.25rem;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: 1rem var(--page-padding-x);
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: 0;
  color: var(--text);
  text-decoration: none;
  transition: opacity 0.2s;
}

.nav-brand:hover {
  opacity: 0.8;
}

.brand-ns {
  color: var(--brand-primary);
}

.brand-sep {
  color: var(--text-dim);
  margin: 0 0.5px;
}

.brand-name {
  color: var(--accent);
  text-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
}

.brand-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: var(--accent);
  margin-left: 2px;
  vertical-align: text-bottom;
  opacity: 0.8;
  animation: cursor-blink 1.2s step-end infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0; }
}

.nav-links {
  display: inline-flex;
  align-items: center;
  justify-self: center;
  gap: 1.25rem;
}

.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--text);
}

.nav-actions {
  display: inline-flex;
  align-items: center;
  justify-self: end;
  gap: 0.62rem;
}

.nav-icon-link {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  border: 1px solid var(--interactive-border);
  background: var(--interactive-bg);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  flex-shrink: 0;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background-color 0.2s ease;
}

.nav-icon-link:hover {
  border-color: rgba(245, 158, 11, 0.45);
  color: var(--accent-light);
  background: rgba(245, 158, 11, 0.09);
}

.nav-icon-link:focus-visible {
  outline: 2px solid rgba(245, 158, 11, 0.55);
  outline-offset: 2px;
}

.nav-icon-glyph {
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  font-family: 'Roboto Mono', monospace;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .landing-cubes {
    width: min(42vw, 24rem);
    opacity: 0.3;
  }

  .landing-cubes--left {
    left: -7rem;
  }

  .landing-cubes--right {
    right: -7rem;
  }
}

@media (max-width: 640px) {
  .landing-cubes {
    display: none;
  }

  .nav-links {
    display: none;
  }

  .nav-icon-link {
    display: none;
  }

  .nav-actions {
    gap: 0.55rem;
  }
}
</style>
