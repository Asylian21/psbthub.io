<script setup lang="ts">
import ThemeModeToggle from './ThemeModeToggle.vue'

interface Props {
  modelValue: boolean
  currentYear: number
  githubUrl: string
  xUrl: string
  themeToggleInputId?: string
}

const props = withDefaults(defineProps<Props>(), {
  themeToggleInputId: 'app-footer-theme-toggle',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

function handleThemeModeUpdate(nextValue: boolean): void {
  emit('update:modelValue', nextValue)
}
</script>

<template>
  <footer
    class="landing-footer relative z-1 mt-[clamp(1rem,2.5vw,1.75rem)] bg-[linear-gradient(180deg,var(--footer-bg-start)_0%,var(--footer-bg-mid)_18%,var(--footer-bg-end)_100%)]"
  >
    <div
      class="footer-inner mx-auto flex max-w-(--content-max-width) flex-col gap-5 px-4 pb-6 pt-[1.7rem] sm:px-5 sm:pb-7 sm:pt-8 md:px-(--page-padding-x) md:pb-[2.1rem] md:pt-[2.45rem]"
    >
      <div class="footer-divider mb-[0.8rem] flex w-full items-center justify-center gap-3" aria-hidden="true">
        <span
          class="footer-divider-line h-px w-[clamp(2.75rem,19vw,6rem)] bg-[linear-gradient(90deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.26)_62%,rgba(245,158,11,0.22)_100%)] md:w-[clamp(4.5rem,18vw,9rem)]"
        ></span>
        <span
          class="footer-divider-dot h-[0.38rem] w-[0.38rem] rounded-full bg-[rgba(245,158,11,0.55)] shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
        ></span>
        <span
          class="footer-divider-line footer-divider-line--right h-px w-[clamp(2.75rem,19vw,6rem)] -scale-x-100 bg-[linear-gradient(90deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.26)_62%,rgba(245,158,11,0.22)_100%)] md:w-[clamp(4.5rem,18vw,9rem)]"
        ></span>
      </div>

      <div class="footer-top flex flex-wrap items-center justify-center gap-[1.2rem] text-center md:justify-between md:text-left">
        <span class="footer-brand text-[1rem] font-bold text-(--text-dim) font-['Space_Grotesk',sans-serif]">
          <span class="brand-ns text-(--brand-primary)">psbt</span><span
            class="brand-sep mx-[0.5px] text-(--text-dim)"
          >:</span><span class="brand-name text-(--accent) [text-shadow:0_0_20px_rgba(245,158,11,0.3)]">hub</span>
        </span>
        <span class="footer-note text-center text-xs text-(--footer-note) font-['Roboto_Mono',monospace] md:text-left">
          Encrypted PSBT relay for signing workflows, primarily multisig. Open source.
        </span>
      </div>

      <div class="footer-donate flex flex-col items-center justify-center gap-2 pt-2 pb-1 text-center md:items-start md:text-left">
        <span class="text-[0.95rem] font-bold text-(--text-dim) font-['Space_Grotesk',sans-serif]">₿ Support This Project</span>
        <span class="text-[0.8rem] text-(--footer-note) font-['Roboto_Mono',monospace]">
          If you find this work valuable, consider supporting development. Every satoshi helps.
        </span>
        <div class="mt-1 flex w-full max-w-2xl items-center gap-3 rounded-lg border border-(--footer-social-border) bg-(--footer-social-bg) px-3 py-2.5">
          <span class="truncate text-xs text-(--text-dim) font-['Roboto_Mono',monospace] select-all">
            bc1pram4xzetxjuskgawwfp70esdhu4atmdpwp5c07fvk2357n0lyrhstkygfm
          </span>
        </div>
      </div>

      <span class="footer-divider-full mb-[1.2rem] mt-[1.2rem] h-px w-full bg-(--footer-divider-full)" aria-hidden="true"></span>

      <div class="footer-bottom flex flex-wrap items-center justify-center gap-[1.2rem] text-center md:justify-between md:text-left">
        <span class="footer-copy text-[0.72rem] text-(--text-muted) font-['Roboto_Mono',monospace]">&copy; {{ currentYear }} psbt:hub</span>
        <div class="footer-actions inline-flex flex-wrap items-center justify-center gap-[0.7rem] md:flex-nowrap">
          <ThemeModeToggle
            :model-value="modelValue"
            :input-id="themeToggleInputId"
            aria-label="Toggle color mode"
            :show-label="false"
            mode="handle"
            class="theme-switch shrink-0 [--p-toggleswitch-width:3rem] [--p-toggleswitch-height:1.85rem] [--p-toggleswitch-border-radius:999px] [--p-toggleswitch-handle-size:1.38rem] [--p-toggleswitch-gap:0.2rem] [--p-toggleswitch-handle-border-radius:999px]"
            @update:model-value="handleThemeModeUpdate"
          />
          <span
            class="footer-actions-divider hidden h-[1.2rem] w-px bg-[linear-gradient(to_bottom,rgba(148,163,184,0),var(--footer-actions-divider-mid)_50%,rgba(148,163,184,0))] md:inline-block"
            aria-hidden="true"
          ></span>
          <nav class="footer-social flex items-center justify-center gap-3" aria-label="Project social links">
            <a
              class="footer-social-link inline-flex items-center gap-[0.45rem] rounded-full border border-(--footer-social-border) bg-(--footer-social-bg) px-3 py-[0.4rem] text-[0.72rem] text-(--footer-social-text) no-underline transition-[background,border-color,color,transform] duration-200 ease-in-out font-['Roboto_Mono',monospace] hover:-translate-y-px hover:border-[rgba(245,158,11,0.42)] hover:bg-[rgba(245,158,11,0.08)] hover:text-(--accent-light) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(245,158,11,0.6)]"
              :href="githubUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i class="pi pi-github text-[0.85rem]" aria-hidden="true"></i>
              <span>GitHub</span>
            </a>
            <!-- X social link temporarily hidden
            <a
              class="footer-social-link inline-flex items-center gap-[0.45rem] rounded-full border border-(--footer-social-border) bg-(--footer-social-bg) px-3 py-[0.4rem] text-[0.72rem] text-(--footer-social-text) no-underline transition-[background,border-color,color,transform] duration-200 ease-in-out font-['Roboto_Mono',monospace] hover:-translate-y-px hover:border-[rgba(245,158,11,0.42)] hover:bg-[rgba(245,158,11,0.08)] hover:text-(--accent-light) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(245,158,11,0.6)]"
              :href="xUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i class="pi pi-twitter text-[0.85rem]" aria-hidden="true"></i>
              <span>X</span>
            </a>
            -->
          </nav>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
:deep(.theme-switch .p-toggleswitch-slider) {
  background: var(--switch-track-bg);
  border: 1px solid var(--switch-track-border);
  box-shadow: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

:deep(.theme-switch .p-toggleswitch-handle) {
  background: var(--switch-handle-bg);
  border: 1px solid var(--switch-handle-border);
  box-shadow: none;
}

:deep(.theme-switch .app-theme-toggle-handle-icon) {
  font-size: 0.72rem;
  color: var(--switch-icon);
  transition: color 0.2s ease;
}

:deep(.theme-switch.p-toggleswitch-checked .p-toggleswitch-slider) {
  background: var(--switch-track-checked-bg);
  border-color: var(--switch-track-checked-border);
}

:deep(.theme-switch.p-toggleswitch-checked .app-theme-toggle-handle-icon) {
  color: var(--switch-icon-checked);
}

:deep(.theme-switch .p-toggleswitch-input:focus-visible + .p-toggleswitch-slider) {
  outline: 2px solid rgba(245, 158, 11, 0.55);
  outline-offset: 2px;
}

</style>
