<script setup lang="ts">
import type { Note } from '~/types/note'

const { t } = useI18n()
const store = useNotesStore()
const { confirm } = useModal()
const { announce } = useLiveRegion()

async function remove(note: Note): Promise<void> {
  const confirmed = await confirm({
    title: t('confirm.deleteTitle'),
    text: t('confirm.deleteText', { title: note.title.trim() || t('list.untitled') }),
    confirmLabel: t('confirm.deleteConfirm'),
    cancelLabel: t('confirm.cancelAction'),
    tone: 'danger',
    initialFocus: 'cancel',
  })

  if (confirmed) {
    store.deleteNote(note.id)
    store.flush()
    umTrackEvent('note_delete', { from: 'list', todos: note.todos.length })
    announce(t('announce.deleted'))
  }
}
</script>

<template>
  <div class="notes">
    <div class="notes__head">
      <h1 class="notes__title">
        {{ t('list.heading') }}
      </h1>
      <BaseButton
        variant="primary"
        @click="navigateTo('/notes/new')"
      >
        <IconPlus />
        {{ t('list.create') }}
      </BaseButton>
    </div>

    <BaseEmptyState
      v-if="store.sortedNotes.length === 0"
      :title="t('list.emptyTitle')"
      :text="t('list.emptyText')"
    >
      <BaseButton
        variant="primary"
        @click="navigateTo('/notes/new')"
      >
        {{ t('list.create') }}
      </BaseButton>
    </BaseEmptyState>

    <ul
      v-else
      class="notes__grid"
    >
      <li
        v-for="note in store.sortedNotes"
        :key="note.id"
      >
        <NoteCard
          :note="note"
          @delete="remove(note)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.notes {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.notes__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}

.notes__title {
  font-size: 24px;
}

.notes__head :deep(svg) {
  width: 18px;
  height: 18px;
}

.notes__grid {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
  grid-template-columns: 1fr;
}

@media (width >= 640px) {
  .notes__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
