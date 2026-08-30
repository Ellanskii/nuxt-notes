import type { Note, TodoItem } from '~/types/note'
import type { ReadFailure, StorageLike, WriteFailure } from '~/lib/storage'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createId } from '~/lib/id'
import { mergeNotes, sortByUpdatedAt } from '~/lib/merge'
import { createMemoryStorage, readNotes, resolveStorage, writeNotes } from '~/lib/storage'

/** Запись идёт не на каждое изменение, а пачкой. */
export const FLUSH_DELAY_MS = 700

export interface NoteInput {
  title: string
  todos: TodoItem[]
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const hydrated = ref(false)
  const readFailure = ref<ReadFailure | null>(null)
  const writeFailure = ref<WriteFailure | null>(null)

  // Журнал несохранённых локальных изменений — нужен, чтобы при флаше
  // наложить их поверх свежего слепка, а не затереть чужие заметки.
  const dirtyIds = new Set<string>()
  const tombstones = new Set<string>()

  let storage: StorageLike = createMemoryStorage()
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  const sortedNotes = computed(() => sortByUpdatedAt(notes.value))
  const isReadOnly = computed(() => readFailure.value === 'unsupported-version')

  function setStorage(next: StorageLike | null | undefined): void {
    storage = resolveStorage(next)
  }

  function byId(id: string): Note | undefined {
    return notes.value.find(note => note.id === id)
  }

  function hydrate(): void {
    const result = readNotes(storage)
    readFailure.value = result.failure
    notes.value = result.data ?? []
    hydrated.value = true
  }

  function createNote(input: NoteInput): Note {
    const now = Date.now()
    const note: Note = {
      id: createId(),
      title: input.title,
      todos: input.todos.map(todo => ({ ...todo })),
      createdAt: now,
      updatedAt: now,
    }

    notes.value = [...notes.value, note]
    dirtyIds.add(note.id)
    tombstones.delete(note.id)
    scheduleFlush()

    return note
  }

  function updateNote(id: string, input: NoteInput): Note | null {
    const index = notes.value.findIndex(note => note.id === id)
    if (index === -1) {
      return null
    }

    const previous = notes.value[index]!
    const next: Note = {
      ...previous,
      title: input.title,
      todos: input.todos.map(todo => ({ ...todo })),
      updatedAt: Date.now(),
    }

    const copy = [...notes.value]
    copy[index] = next
    notes.value = copy

    dirtyIds.add(id)
    scheduleFlush()

    return next
  }

  function deleteNote(id: string): void {
    notes.value = notes.value.filter(note => note.id !== id)
    dirtyIds.delete(id)
    tombstones.add(id)
    scheduleFlush()
  }

  /** Перечитать хранилище после записи из другой вкладки. */
  function applyExternal(): void {
    const result = readNotes(storage)
    if (result.failure) {
      readFailure.value = result.failure
      return
    }

    readFailure.value = null
    notes.value = mergeNotes({
      remote: result.data ?? [],
      local: notes.value,
      dirtyIds,
      tombstones,
    })
  }

  function scheduleFlush(): void {
    if (flushTimer !== null) {
      return
    }

    flushTimer = setTimeout(() => {
      flushTimer = null
      flush()
    }, FLUSH_DELAY_MS)
  }

  function flush(): void {
    if (flushTimer !== null) {
      clearTimeout(flushTimer)
      flushTimer = null
    }

    if (dirtyIds.size === 0 && tombstones.size === 0) {
      return
    }

    // Данные более новой схемы не перезаписываются.
    if (isReadOnly.value) {
      return
    }

    const remoteResult = readNotes(storage)
    const merged = mergeNotes({
      remote: remoteResult.failure ? [] : (remoteResult.data ?? []),
      local: notes.value,
      dirtyIds,
      tombstones,
    })

    const result = writeNotes(storage, merged)
    if (!result.ok) {
      writeFailure.value = result.failure
      return
    }

    writeFailure.value = null
    dirtyIds.clear()
    tombstones.clear()
    notes.value = merged
  }

  function dismissWriteFailure(): void {
    writeFailure.value = null
  }

  return {
    notes,
    hydrated,
    readFailure,
    writeFailure,
    sortedNotes,
    isReadOnly,
    setStorage,
    byId,
    hydrate,
    createNote,
    updateNote,
    deleteNote,
    applyExternal,
    scheduleFlush,
    flush,
    dismissWriteFailure,
  }
})
