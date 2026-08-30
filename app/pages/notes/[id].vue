<script setup lang="ts">
import { TITLE_MAX_LENGTH } from '~/types/note'

const route = useRoute()
const { t } = useI18n()
const { confirm, isOpen } = useModal()
const { announce } = useLiveRegion()

const noteId = String(route.params.id)
const editor = useNoteEditor(noteId)

const heading = computed(() => (editor.isNew ? t('editor.createHeading') : t('editor.editHeading')))

// Ссылки на строки, чтобы возвращать фокус после undo/redo и удаления.
const rows = useTemplateRef<{ focus: () => void }[]>('rows')
let bypassGuard = false
let highlightTimer: ReturnType<typeof setTimeout> | null = null

async function leave(): Promise<void> {
  bypassGuard = true
  await navigateTo('/')
}

async function save(): Promise<void> {
  const note = editor.save()
  if (!note) {
    return
  }

  umTrackEvent('note_save', {
    mode: editor.isNew ? 'create' : 'update',
    todos: note.todos.length,
    done: note.todos.filter(todo => todo.done).length,
  })
  announce(t('announce.saved'))
  await leave()
}

async function confirmDiscard(): Promise<boolean> {
  if (!editor.isDirty.value) {
    return true
  }

  return confirm({
    title: t('confirm.cancelTitle'),
    text: t('confirm.cancelText'),
    confirmLabel: t('confirm.cancelConfirm'),
    cancelLabel: t('confirm.keepEditing'),
    tone: 'danger',
    initialFocus: 'cancel',
  })
}

async function cancel(): Promise<void> {
  if (!await confirmDiscard()) {
    return
  }

  editor.discard()
  umTrackEvent('note_edit_cancel')
  announce(t('announce.cancelled'))
  await leave()
}

async function remove(): Promise<void> {
  const confirmed = await confirm({
    title: t('confirm.deleteTitle'),
    text: t('confirm.deleteText', { title: editor.draft.title.trim() || t('list.untitled') }),
    confirmLabel: t('confirm.deleteConfirm'),
    cancelLabel: t('confirm.cancelAction'),
    tone: 'danger',
    initialFocus: 'cancel',
  })

  if (!confirmed) {
    return
  }

  const todos = editor.draft.todos.length
  editor.remove()
  umTrackEvent('note_delete', { from: 'editor', todos })
  announce(t('announce.deleted'))
  await leave()
}

function undo(): void {
  if (editor.undo()) {
    umTrackEvent('note_undo')
    announce(t('announce.undone'))
  }
}

function redo(): void {
  if (editor.redo()) {
    umTrackEvent('note_redo')
    announce(t('announce.redone'))
  }
}

function addTodo(afterId?: string): void {
  editor.addTodo(afterId)
}

useUndoShortcut({ isModalOpen: isOpen, onUndo: undo, onRedo: redo })

// Фокус на строке, которую затронуло последнее изменение: после отката
// добавления строка исчезает, и без этого фокус улетел бы на body.
watch(editor.focusTodoId, async (id) => {
  if (!id) {
    return
  }

  await nextTick()
  const index = editor.draft.todos.findIndex(todo => todo.id === id)
  if (index !== -1) {
    rows.value?.[index]?.focus()
  }
  editor.focusTodoId.value = null
})

watch(editor.highlightTodoId, (id) => {
  if (!id) {
    return
  }

  if (highlightTimer !== null) {
    clearTimeout(highlightTimer)
  }
  highlightTimer = setTimeout(() => {
    editor.highlightTodoId.value = null
  }, 900)
})

watch(editor.removedElsewhere, async (removed) => {
  if (!removed) {
    return
  }

  const saveAsNew = await confirm({
    title: t('confirm.removedTitle'),
    text: t('confirm.removedText'),
    confirmLabel: t('confirm.removedSaveAsNew'),
    cancelLabel: t('confirm.removedGoBack'),
    dismissible: false,
  })

  if (saveAsNew) {
    await save()
    return
  }

  editor.discard()
  await leave()
})

onMounted(async () => {
  if (editor.missing.value) {
    return
  }

  const draft = editor.pendingDraft()
  if (!draft) {
    return
  }

  const restore = await confirm({
    title: t('confirm.draftTitle'),
    text: t('confirm.draftText'),
    confirmLabel: t('confirm.draftConfirm'),
    cancelLabel: t('confirm.draftDiscard'),
  })

  if (restore) {
    editor.restoreDraft(draft.note)
    umTrackEvent('draft_restore', { age: Math.round((Date.now() - draft.updatedAt) / 1000) })
    announce(t('announce.draftRestored'))
  }
  else {
    editor.dropDraft()
    umTrackEvent('draft_discard')
    announce(t('announce.draftDiscarded'))
  }
})

onBeforeRouteLeave(async () => {
  if (bypassGuard) {
    return true
  }

  if (!await confirmDiscard()) {
    return false
  }

  editor.discard()
  return true
})

onUnmounted(() => {
  if (highlightTimer !== null) {
    clearTimeout(highlightTimer)
  }
  editor.dispose()
})
</script>

<template>
  <BaseEmptyState
    v-if="editor.missing.value"
    :title="t('editor.notFoundTitle')"
    :text="t('editor.notFoundText')"
  >
    <BaseButton
      variant="primary"
      @click="navigateTo('/')"
    >
      {{ t('editor.backToList') }}
    </BaseButton>
  </BaseEmptyState>

  <div
    v-else
    class="editor"
  >
    <h1 class="editor__heading">
      {{ heading }}
    </h1>

    <BaseTextField
      :model-value="editor.draft.title"
      :label="t('editor.titleLabel')"
      :placeholder="t('editor.titlePlaceholder')"
      :maxlength="TITLE_MAX_LENGTH"
      size="lg"
      @update:model-value="editor.setTitle"
      @commit="editor.commitPending"
    />

    <section class="editor__todos">
      <div class="editor__todos-head">
        <h2 class="editor__subtitle">
          {{ t('editor.todosLabel') }}
        </h2>
        <BaseButton
          size="sm"
          @click="addTodo()"
        >
          <IconPlus />
          {{ t('editor.addTodo') }}
        </BaseButton>
      </div>

      <p
        v-if="editor.draft.todos.length === 0"
        class="editor__hint"
      >
        {{ t('editor.noTodos') }}
      </p>

      <ul
        v-else
        class="editor__list"
      >
        <TodoEditorRow
          v-for="todo in editor.draft.todos"
          :key="todo.id"
          ref="rows"
          :todo="todo"
          :highlighted="editor.highlightTodoId.value === todo.id"
          @toggle="editor.toggleTodo(todo.id)"
          @update:text="editor.setTodoText(todo.id, $event)"
          @commit="editor.commitPending"
          @remove="editor.removeTodo(todo.id)"
          @enter="addTodo(todo.id)"
        />
      </ul>

      <p
        v-if="editor.hasEmptyTodos.value"
        class="editor__hint editor__hint--warning"
      >
        {{ t('editor.emptyTodoHint') }}
      </p>
    </section>

    <EditorToolbar
      :can-undo="editor.canUndo.value"
      :can-redo="editor.canRedo.value"
      :can-delete="!editor.isNew"
      @undo="undo"
      @redo="redo"
      @save="save"
      @cancel="cancel"
      @remove="remove"
    />
  </div>
</template>

<style scoped lang="scss">
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.editor__heading {
  font-size: 24px;
}

.editor__todos {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
}

.editor__todos-head {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}

.editor__todos-head :deep(svg) {
  width: 16px;
  height: 16px;
}

.editor__subtitle {
  font-size: 15px;
}

.editor__hint {
  color: var(--c-text-muted);
  font-size: 14px;
}

.editor__hint--warning {
  color: var(--c-danger);
}

.editor__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
