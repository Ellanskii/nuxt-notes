<script setup lang="ts">
import type { TodoItem } from '~/types/note'
import { TODO_PREVIEW_LIMIT } from '~/types/note'

const props = defineProps<{ todos: TodoItem[] }>()

const { t } = useI18n()

const visible = computed(() => props.todos.slice(0, TODO_PREVIEW_LIMIT))
const hidden = computed(() => Math.max(0, props.todos.length - TODO_PREVIEW_LIMIT))
const doneCount = computed(() => props.todos.filter(todo => todo.done).length)
</script>

<template>
  <div class="preview">
    <p
      v-if="todos.length === 0"
      class="preview__empty"
    >
      {{ t('list.noTodos') }}
    </p>

    <template v-else>
      <ul class="preview__list">
        <li
          v-for="todo in visible"
          :key="todo.id"
          class="preview__item"
          :class="{ 'preview__item--done': todo.done }"
        >
          <!-- Статичный маркер вместо disabled-инпута: он не берёт фокус
               и не попадает в порядок обхода, а статус читается текстом. -->
          <span
            class="preview__marker"
            aria-hidden="true"
          >
            <IconCheck
              v-if="todo.done"
              class="preview__check"
            />
          </span>
          <span class="visually-hidden">{{ todo.done ? t('list.done') : t('list.pending') }}</span>
          <span class="preview__text">{{ todo.text }}</span>
        </li>
      </ul>

      <p class="preview__meta">
        <span>{{ t('list.progress', { done: doneCount, total: todos.length }) }}</span>
        <span v-if="hidden > 0">{{ t('list.more', { count: hidden }) }}</span>
      </p>
    </template>
  </div>
</template>

<style scoped lang="scss">
.preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.preview__empty,
.preview__meta {
  color: var(--c-text-muted);
  font-size: 13px;
}

.preview__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.preview__item {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  font-size: 14px;
}

.preview__item--done .preview__text {
  color: var(--c-text-muted);
  text-decoration: line-through;
}

.preview__marker {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 1.5px solid var(--c-border-strong);
  border-radius: 4px;
  color: var(--c-accent);
}

.preview__check {
  width: 12px;
  height: 12px;
}

.preview__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview__meta {
  display: flex;
  gap: var(--space-3);
}
</style>
