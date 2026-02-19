<script setup lang="ts">
interface Props {
  createdAtDisplay: string
  createdAtUtcDisplay?: string | null
}

withDefaults(defineProps<Props>(), {
  createdAtUtcDisplay: null,
})
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-[0.45rem] py-[0.12rem] text-center">
    <div class="inline-flex items-center gap-[0.45rem] text-[0.84rem] text-(--p-text-muted-color)">
      <i class="pi pi-clock" aria-hidden="true"></i>
      <span>Created at {{ createdAtDisplay }}</span>
    </div>
    <span
      v-if="createdAtUtcDisplay"
      class="leading-none text-(--p-text-muted-color) opacity-70"
      aria-hidden="true"
    >
      -
    </span>
    <div
      v-if="createdAtUtcDisplay"
      class="inline-flex items-center gap-[0.45rem] text-[0.84rem] text-(--p-text-muted-color) opacity-90"
    >
      <i class="pi pi-globe" aria-hidden="true"></i>
      <span>Created at (UTC) {{ createdAtUtcDisplay }}</span>
    </div>
  </div>
</template>
