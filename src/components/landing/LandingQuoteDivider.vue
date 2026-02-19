<script setup lang="ts">
interface Props {
  quote: string
  cite: string
}

defineProps<Props>()
</script>

<template>
  <div class="quote-divider-wrap">
    <div class="quote-divider">
      <span class="quote-divider-rule" aria-hidden="true"></span>
      <blockquote class="floating-quote">
        <p class="floating-quote-line">{{ quote }}</p>
        <cite class="floating-quote-cite">{{ cite }}</cite>
      </blockquote>
      <span class="quote-divider-rule" aria-hidden="true"></span>
    </div>
  </div>
</template>

<style scoped>
.quote-divider-wrap {
  margin: -0.15rem 0 0.1rem;
  display: flex;
  justify-content: center;
}

.quote-divider {
  width: min(68rem, 100%);
  display: flex;
  align-items: center;
  gap: 1.1rem;
}

.quote-divider-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 35%, var(--text-dim)), transparent);
  opacity: 0.55;
}

.floating-quote {
  margin: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.34rem;
}

.floating-quote-line {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(1.06rem, 2.5vw, 1.24rem);
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.012em;
  color: var(--quote-text);
  text-wrap: balance;
  text-align: center;
}

.floating-quote-cite {
  font-style: normal;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .quote-divider-wrap {
    margin: -0.55rem 0;
  }

  .quote-divider {
    gap: 0.75rem;
  }

  .quote-divider-rule {
    display: none;
  }

  .floating-quote {
    max-width: 100%;
  }

  .floating-quote-line {
    font-size: 1rem;
  }
}
</style>
