<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
import { computed } from 'vue'

type ThemeToggleMode = 'rail' | 'handle'

interface Props {
  modelValue: boolean
  inputId: string
  ariaLabel?: string
  showLabel?: boolean
  lightLabel?: string
  darkLabel?: string
  mode?: ThemeToggleMode
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: 'Toggle color mode',
  showLabel: true,
  lightLabel: 'Light mode',
  darkLabel: 'Dark mode',
  mode: 'rail',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const currentLabel = computed<string>(() => {
  return props.modelValue ? props.darkLabel : props.lightLabel
})

function handleUpdate(nextValue: boolean): void {
  emit('update:modelValue', nextValue)
}
</script>

<template>
  <div class="app-theme-toggle inline-flex items-center gap-2" :class="mode === 'handle' ? 'gap-0' : null">
    <span v-if="showLabel" class="app-theme-toggle-label text-sm font-medium">{{ currentLabel }}</span>

    <template v-if="mode === 'rail'">
      <i class="pi pi-sun app-theme-toggle-icon text-[0.95rem]" aria-hidden="true"></i>
      <ToggleSwitch
        :model-value="modelValue"
        :input-id="inputId"
        :aria-label="ariaLabel"
        class="app-theme-toggle-switch"
        @update:model-value="handleUpdate"
      />
      <i class="pi pi-moon app-theme-toggle-icon text-[0.95rem]" aria-hidden="true"></i>
    </template>

    <template v-else>
      <ToggleSwitch
        :model-value="modelValue"
        :input-id="inputId"
        :aria-label="ariaLabel"
        class="app-theme-toggle-switch"
        @update:model-value="handleUpdate"
      >
        <template #handle="{ checked }">
          <i
            class="pi app-theme-toggle-handle-icon text-[0.76rem] text-(--switch-icon,var(--p-text-color))"
            :class="checked ? 'pi-moon' : 'pi-sun'"
            aria-hidden="true"
          ></i>
        </template>
      </ToggleSwitch>
    </template>
  </div>
</template>

<style scoped>
:deep(.app-theme-toggle-switch .p-toggleswitch-handle) {
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

:deep(.app-theme-toggle-switch .p-toggleswitch-handle):focus-visible {
  outline: none;
}
</style>
