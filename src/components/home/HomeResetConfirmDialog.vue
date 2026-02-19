<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'confirm'): void
}>()

function hide(): void {
  emit('update:visible', false)
}

function confirmReset(): void {
  emit('confirm')
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    header="Confirm reset"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 2rem)' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="reset-confirm-message">
      Are you sure you want to clear the form and remove the generated link?
    </p>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="hide" />
      <Button label="Yes, reset" severity="danger" @click="confirmReset" />
    </template>
  </Dialog>
</template>

<style scoped>
.reset-confirm-message {
  margin: 0;
  color: var(--p-text-muted-color);
}
</style>
