<script setup lang="ts">
defineProps<{
  canUndo: boolean
  canRedo: boolean
  canDelete: boolean
}>()

defineEmits<{
  undo: []
  redo: []
  save: []
  cancel: []
  remove: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__history">
      <BaseIconButton
        :label="t('editor.undo')"
        :disabled="!canUndo"
        @click="$emit('undo')"
      >
        <IconUndo />
      </BaseIconButton>
      <BaseIconButton
        :label="t('editor.redo')"
        :disabled="!canRedo"
        @click="$emit('redo')"
      >
        <IconRedo />
      </BaseIconButton>
    </div>

    <div class="toolbar__actions">
      <BaseButton
        v-if="canDelete"
        variant="danger"
        @click="$emit('remove')"
      >
        {{ t('editor.delete') }}
      </BaseButton>
      <BaseButton
        variant="ghost"
        @click="$emit('cancel')"
      >
        {{ t('editor.cancel') }}
      </BaseButton>
      <BaseButton
        variant="primary"
        @click="$emit('save')"
      >
        {{ t('editor.save') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}

.toolbar__history,
.toolbar__actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

@media (width <= 560px) {
  .toolbar {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .toolbar__actions {
    justify-content: flex-end;
  }

  .toolbar__history {
    justify-content: center;
  }
}
</style>
