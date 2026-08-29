<script setup lang="ts">
import type { Note } from '~/types/note'

const props = defineProps<{ note: Note }>()
defineEmits<{ delete: [] }>()

const { t } = useI18n()

const title = computed(() => props.note.title.trim())
</script>

<template>
  <article class="card">
    <NuxtLink
      :to="`/notes/${note.id}`"
      class="card__link"
    >
      <h2
        class="card__title"
        :class="{ 'card__title--untitled': !title }"
      >
        {{ title || t('list.untitled') }}
      </h2>
    </NuxtLink>

    <NoteTodoPreview :todos="note.todos" />

    <div class="card__actions">
      <BaseButton
        size="sm"
        @click="navigateTo(`/notes/${note.id}`)"
      >
        <IconPencil />
        {{ t('list.edit') }}
      </BaseButton>
      <BaseButton
        size="sm"
        variant="danger"
        @click="$emit('delete')"
      >
        <IconTrash />
        {{ t('list.delete') }}
      </BaseButton>
    </div>
  </article>
</template>

<style scoped lang="scss">
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: var(--c-border-strong);
    box-shadow: var(--shadow-md);
  }
}

.card__link {
  color: inherit;
  text-decoration: none;
}

.card__title {
  font-size: 17px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.card__title--untitled {
  color: var(--c-text-muted);
  font-weight: 500;
  font-style: italic;
}

.card__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-2);
  border-top: 1px solid var(--c-border);
}

.card__actions :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
