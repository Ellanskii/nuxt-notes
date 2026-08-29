import type { NotePatch } from '~/lib/patch'
import type { Note, TodoItem } from '~/types/note'
import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { createHistory, COALESCE_MS } from '~/lib/history'
import { createId } from '~/lib/id'
import { applyPatch, patchTargetId } from '~/lib/patch'
import { clientStorage } from '~/lib/client-storage'
import { clearDraft, readDraft, writeDraft } from '~/lib/storage'
import { TITLE_MAX_LENGTH, TODO_TEXT_MAX_LENGTH } from '~/types/note'
import { useNotesStore } from '~/stores/notes'

const DRAFT_DELAY_MS = 500

export const NEW_NOTE_ID = 'new'

function emptyNote(): Note {
  const now = Date.now()
  return { id: NEW_NOTE_ID, title: '', todos: [], createdAt: now, updatedAt: now }
}

function fingerprint(note: Note): string {
  return JSON.stringify({
    title: note.title.trim(),
    todos: note.todos.map(todo => ({ text: todo.text.trim(), done: todo.done })),
  })
}

export function useNoteEditor(noteId: string) {
  const store = useNotesStore()
  const storage = clientStorage()
  const isNew = noteId === NEW_NOTE_ID

  const source = isNew ? emptyNote() : store.byId(noteId)
  const missing = ref(!isNew && source === undefined)

  const draft = reactive<Note>(structuredClone(source ?? emptyNote()))
  const history = createHistory()

  // Заметка исчезла из стора, пока её редактировали в этой вкладке.
  const removedElsewhere = ref(false)
  const savedFingerprint = ref(fingerprint(draft))
  const focusTodoId = ref<string | null>(null)
  const highlightTodoId = ref<string | null>(null)

  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let draftTimer: ReturnType<typeof setTimeout> | null = null
  let draftEnabled = true
  let deletedHere = false

  const isDirty = computed(() => fingerprint(draft) !== savedFingerprint.value)
  const canUndo = ref(false)
  const canRedo = ref(false)
  const hasEmptyTodos = computed(() => draft.todos.some(todo => todo.text.trim() === ''))

  function syncFlags(): void {
    canUndo.value = history.canUndo()
    canRedo.value = history.canRedo()
  }

  function scheduleDraftSave(): void {
    if (!draftEnabled || draftTimer !== null) {
      return
    }

    draftTimer = setTimeout(() => {
      draftTimer = null
      if (!draftEnabled) {
        return
      }
      writeDraft(storage, {
        noteId,
        isNew,
        note: toPlain(draft),
        updatedAt: Date.now(),
      })
    }, DRAFT_DELAY_MS)
  }

  function scheduleIdleCommit(): void {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
    }

    idleTimer = setTimeout(() => {
      idleTimer = null
      history.commitIfIdle(Date.now())
      syncFlags()
    }, COALESCE_MS)
  }

  function commitPending(): void {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
    history.commitPending()
    syncFlags()
  }

  function setTitle(value: string): void {
    const next = value.slice(0, TITLE_MAX_LENGTH)
    const previous = draft.title
    if (next === previous) {
      return
    }

    draft.title = next
    history.textInput({ kind: 'title' }, previous, next, Date.now())
    syncFlags()
    scheduleIdleCommit()
    scheduleDraftSave()
  }

  function setTodoText(id: string, value: string): void {
    const todo = draft.todos.find(item => item.id === id)
    if (!todo) {
      return
    }

    const next = value.slice(0, TODO_TEXT_MAX_LENGTH)
    const previous = todo.text
    if (next === previous) {
      return
    }

    todo.text = next
    history.textInput({ kind: 'todo-text', id }, previous, next, Date.now())
    syncFlags()
    scheduleIdleCommit()
    scheduleDraftSave()
  }

  function toggleTodo(id: string): void {
    const todo = draft.todos.find(item => item.id === id)
    if (!todo) {
      return
    }

    const from = todo.done
    todo.done = !from
    history.push({ t: 'todo-done', id, from, to: todo.done })
    syncFlags()
    scheduleDraftSave()
  }

  function addTodo(afterId?: string): TodoItem {
    const item: TodoItem = { id: createId(), text: '', done: false }
    const index = afterId
      ? draft.todos.findIndex(todo => todo.id === afterId) + 1
      : draft.todos.length

    draft.todos.splice(index, 0, item)
    history.push({ t: 'todo-add', index, item: { ...item } })
    syncFlags()
    scheduleDraftSave()

    focusTodoId.value = item.id
    return item
  }

  function removeTodo(id: string): void {
    const index = draft.todos.findIndex(todo => todo.id === id)
    if (index === -1) {
      return
    }

    const item = { ...draft.todos[index]! }
    const neighbour = draft.todos[index + 1] ?? draft.todos[index - 1]

    draft.todos.splice(index, 1)
    history.push({ t: 'todo-remove', index, item })
    syncFlags()
    scheduleDraftSave()

    focusTodoId.value = neighbour?.id ?? null
  }

  function applyHistory(patch: NotePatch, direction: 'undo' | 'redo'): void {
    applyPatch(draft, patch, direction)
    syncFlags()
    scheduleDraftSave()

    // После отката фокус не должен улетать на body: ведём его к затронутой строке.
    const targetId = patchTargetId(patch)
    if (targetId && draft.todos.some(todo => todo.id === targetId)) {
      focusTodoId.value = targetId
      highlightTodoId.value = targetId
    }
    else {
      focusTodoId.value = null
      highlightTodoId.value = null
    }
  }

  function undo(): boolean {
    commitPending()
    const patch = history.undo()
    if (!patch) {
      return false
    }

    applyHistory(patch, 'undo')
    return true
  }

  function redo(): boolean {
    commitPending()
    const patch = history.redo()
    if (!patch) {
      return false
    }

    applyHistory(patch, 'redo')
    return true
  }

  function normalised(): { title: string, todos: TodoItem[] } {
    return {
      title: draft.title.trim(),
      todos: draft.todos
        .filter(todo => todo.text.trim() !== '')
        .map(todo => ({ id: todo.id, text: todo.text.trim(), done: todo.done })),
    }
  }

  function stopDraft(): void {
    draftEnabled = false
    if (draftTimer !== null) {
      clearTimeout(draftTimer)
      draftTimer = null
    }
    clearDraft(storage, noteId)
  }

  function save(): Note | null {
    commitPending()
    const payload = normalised()

    const note = isNew || removedElsewhere.value
      ? store.createNote(payload)
      : store.updateNote(noteId, payload)

    if (!note) {
      return null
    }

    store.flush()
    stopDraft()
    history.reset()
    syncFlags()
    savedFingerprint.value = fingerprint(draft)

    return note
  }

  function discard(): void {
    commitPending()
    stopDraft()
    history.reset()
    syncFlags()
  }

  function remove(): void {
    deletedHere = true
    if (!isNew && !removedElsewhere.value) {
      store.deleteNote(noteId)
      store.flush()
    }
    stopDraft()
    history.reset()
    syncFlags()
  }

  function pendingDraft() {
    const result = readDraft(storage, noteId)
    if (!result.data) {
      return null
    }

    return fingerprint(result.data.note) === savedFingerprint.value ? null : result.data
  }

  function restoreDraft(note: Note): void {
    draft.title = note.title
    draft.todos = note.todos.map(todo => ({ ...todo }))
    // История живёт в рамках сессии редактирования: восстановленный
    // черновик — новая точка отсчёта, откатывать до неё нечего.
    history.reset()
    syncFlags()
  }

  function dropDraft(): void {
    clearDraft(storage, noteId)
  }

  function saveDraftNow(): void {
    if (!draftEnabled) {
      return
    }

    if (draftTimer !== null) {
      clearTimeout(draftTimer)
      draftTimer = null
    }

    if (isDirty.value) {
      writeDraft(storage, { noteId, isNew, note: toPlain(draft), updatedAt: Date.now() })
    }
  }

  // Случайное закрытие вкладки не должно съедать последние полсекунды правок.
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', saveDraftNow)
    onScopeDispose(() => window.removeEventListener('pagehide', saveDraftNow))
  }

  function dispose(): void {
    commitPending()
    if (draftTimer !== null) {
      clearTimeout(draftTimer)
      draftTimer = null
    }
  }

  // Заметку удалили в другой вкладке — редактор остаётся рабочим,
  // но сохранение пойдёт как создание новой.
  watch(
    () => (isNew ? true : store.notes.some(note => note.id === noteId)),
    (exists) => {
      if (!exists && !missing.value && !deletedHere) {
        removedElsewhere.value = true
      }
    },
  )

  return {
    draft,
    isNew,
    missing,
    removedElsewhere,
    isDirty,
    canUndo,
    canRedo,
    hasEmptyTodos,
    focusTodoId,
    highlightTodoId,
    setTitle,
    setTodoText,
    toggleTodo,
    addTodo,
    removeTodo,
    commitPending,
    undo,
    redo,
    save,
    discard,
    remove,
    pendingDraft,
    restoreDraft,
    dropDraft,
    dispose,
  }
}

function toPlain(note: Note): Note {
  return {
    id: note.id,
    title: note.title,
    todos: note.todos.map(todo => ({ ...todo })),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}
