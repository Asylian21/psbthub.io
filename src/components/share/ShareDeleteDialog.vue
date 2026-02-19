<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

interface Props {
  visible: boolean
  isDeleteInProgress: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Delete shared PSBT?"
    :closable="!isDeleteInProgress"
    :dismissableMask="!isDeleteInProgress"
    :draggable="false"
    class="share-delete-confirm-dialog"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="share-delete-confirm-content">
      <p class="share-delete-confirm-title">
        This action removes the encrypted payload from the server immediately.
      </p>
      <p class="share-delete-confirm-copy">
        Anyone opening this link afterward will see the share as unavailable. This action
        cannot be undone.
      </p>
    </div>
    <template #footer>
      <div class="share-delete-confirm-actions">
        <Button
          label="Cancel"
          severity="secondary"
          text
          :disabled="isDeleteInProgress"
          @click="emit('update:visible', false)"
        />
        <Button
          label="Yes, delete now"
          icon="pi pi-trash"
          severity="danger"
          :loading="isDeleteInProgress"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.share-delete-confirm-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.share-delete-confirm-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.share-delete-confirm-copy {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
}

.share-delete-confirm-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

@media (max-width: 640px) {
  .share-delete-confirm-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
