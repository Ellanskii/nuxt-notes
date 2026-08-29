<script setup lang="ts">
import type { TodoItem } from '~/types/note'
import { TODO_TEXT_MAX_LENGTH } from '~/types/note'

const props = defineProps<{ todo: TodoItem, highlighted: boolean }>()

const emit = defineEmits<{
  'toggle': []
  'update:text': [value: string]
  'commit': []
  'remove': []
  'enter': []
}>()

const { t } = useI18n()
const fieldRef = ref<{ focus: () => void } | null>(null)

const isEmpty = computed(() => props.todo.text.trim() === '')

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('enter')
    return
  }

  // Backspace в пустом пункте удаляет строку — привычно для списков.
  if (event.key === 'Backspace' && props.todo.text === '') {
    event.preventDefault()
    emit('remove')
  }
}

defineExpose({ focus: (): void => fieldRef.value?.focus() })
</script>

<template>
  <li
    class="row"
    :class="{ 'row--done': todo.done, 'row--highlighted': highlighted }"
  >
    <BaseCheckbox
      :model-value="todo.done"
      :label="t('editor.toggleTodo')"
      @update:model-value="emit('toggle')"
    />

    <BaseTextField
      ref="fieldRef"
      :model-value="todo.text"
      :label="t('editor.todosLabel')"
      :placeholder="t('editor.todoPlaceholder')"
      :maxlength="TODO_TEXT_MAX_LENGTH"
      :invalid="isEmpty"
      hide-label
      @update:model-value="emit('update:text', $event)"
      @commit="emit('commit')"
      @keydown="onKeydown"
    />

    <BaseIconButton
      :label="t('editor.removeTodo')"
      tone="danger"
      @click="emit('remove')"
    >
      <IconTrash />
    </BaseIconButton>
  </li>
</template>

<style scoped lang="scss">
.row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-1);
  border-radius: var(--radius-md);
}

.row--done :deep(.field__input) {
  color: var(--c-text-muted);
  text-decoration: line-through;
}

// Короткая подсветка строки, которую задел undo/redo.
.row--highlighted {
  animation: flash 0.9s ease;
}

@keyframes flash {
  from {
    background: var(--c-accent-soft);
  }
}

@media (prefers-reduced-motion: reduce) {
  .row--highlighted {
    animation: none;
    background: var(--c-accent-soft);
  }
}
</style>
