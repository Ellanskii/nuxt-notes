import type { Note, TodoItem } from '~/types/note'
import { createId } from '~/lib/id'

export const SCHEMA_VERSION = 1
export const NOTES_KEY = 'nuxt-notes:notes'
export const DRAFT_KEY_PREFIX = 'nuxt-notes:draft:'

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type ReadFailure = 'corrupt' | 'unsupported-version'
export type WriteFailure = 'quota' | 'unavailable'

export interface ReadResult<T> {
  data: T | null
  failure: ReadFailure | null
}

export type WriteResult = { ok: true } | { ok: false, failure: WriteFailure }

export interface DraftRecord {
  noteId: string
  isNew: boolean
  note: Note
  updatedAt: number
}

export function draftKey(noteId: string): string {
  return `${DRAFT_KEY_PREFIX}${noteId}`
}

export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: key => void map.delete(key),
  }
}

/**
 * localStorage может быть недоступен целиком: отключённые куки, приватный режим,
 * iframe с блокировкой. Доступность проверяется записью, при провале работа идёт в памяти —
 * приложение остаётся рабочим в пределах вкладки.
 */
export function resolveStorage(candidate: StorageLike | null | undefined): StorageLike {
  if (!candidate) {
    return createMemoryStorage()
  }

  const probe = '__nuxt-notes-probe__'
  try {
    candidate.setItem(probe, '1')
    candidate.removeItem(probe)
    return candidate
  }
  catch {
    return createMemoryStorage()
  }
}

export function readNotes(storage: StorageLike): ReadResult<Note[]> {
  const raw = safeGet(storage, NOTES_KEY)
  if (raw === null) {
    return { data: [], failure: null }
  }

  let envelope: unknown
  try {
    envelope = JSON.parse(raw)
  }
  catch {
    return { data: null, failure: 'corrupt' }
  }

  if (!isRecord(envelope) || typeof envelope.version !== 'number') {
    return { data: null, failure: 'corrupt' }
  }

  // Данные, записанные более новой версией приложения, остаются нетронутыми:
  // затирать их своей схемой хуже, чем показать баннер.
  if (envelope.version > SCHEMA_VERSION) {
    return { data: null, failure: 'unsupported-version' }
  }

  const migrated = migrateNotes(envelope.version, envelope.data)
  return migrated ? { data: migrated, failure: null } : { data: null, failure: 'corrupt' }
}

export function writeNotes(storage: StorageLike, notes: Note[]): WriteResult {
  return safeSet(storage, NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION, data: notes }))
}

export function readDraft(storage: StorageLike, noteId: string): ReadResult<DraftRecord> {
  const raw = safeGet(storage, draftKey(noteId))
  if (raw === null) {
    return { data: null, failure: null }
  }

  let envelope: unknown
  try {
    envelope = JSON.parse(raw)
  }
  catch {
    return { data: null, failure: 'corrupt' }
  }

  if (!isRecord(envelope) || typeof envelope.version !== 'number') {
    return { data: null, failure: 'corrupt' }
  }

  if (envelope.version !== SCHEMA_VERSION) {
    return { data: null, failure: 'unsupported-version' }
  }

  const note = parseNote(envelope.note)
  if (!note || typeof envelope.noteId !== 'string') {
    return { data: null, failure: 'corrupt' }
  }

  return {
    data: {
      noteId: envelope.noteId,
      isNew: envelope.isNew === true,
      note,
      updatedAt: typeof envelope.updatedAt === 'number' ? envelope.updatedAt : 0,
    },
    failure: null,
  }
}

export function writeDraft(storage: StorageLike, draft: DraftRecord): WriteResult {
  return safeSet(storage, draftKey(draft.noteId), JSON.stringify({ version: SCHEMA_VERSION, ...draft }))
}

export function clearDraft(storage: StorageLike, noteId: string): void {
  try {
    storage.removeItem(draftKey(noteId))
  }
  catch {
    // Нечего чистить — не повод ронять сохранение.
  }
}

/**
 * v0 — первая форма хранения, где пункты были простыми строками.
 * Они разворачиваются в TodoItem, чтобы старые данные не терялись.
 */
export function migrateNotes(version: number, data: unknown): Note[] | null {
  if (!Array.isArray(data)) {
    return null
  }

  if (version === 0) {
    const notes: Note[] = []
    for (const raw of data) {
      const note = parseLegacyNote(raw)
      if (note) {
        notes.push(note)
      }
    }
    return notes
  }

  if (version === SCHEMA_VERSION) {
    const notes: Note[] = []
    for (const raw of data) {
      const note = parseNote(raw)
      if (note) {
        notes.push(note)
      }
    }
    return notes
  }

  return null
}

export function parseNote(raw: unknown): Note | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null
  }

  if (!Array.isArray(raw.todos)) {
    return null
  }

  const todos: TodoItem[] = []
  for (const item of raw.todos) {
    if (isRecord(item) && typeof item.id === 'string' && typeof item.text === 'string') {
      todos.push({ id: item.id, text: item.text, done: item.done === true })
    }
  }

  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : createdAt

  return { id: raw.id, title: raw.title, todos, createdAt, updatedAt }
}

function parseLegacyNote(raw: unknown): Note | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null
  }

  const todos: TodoItem[] = Array.isArray(raw.todos)
    ? raw.todos
        .filter((text): text is string => typeof text === 'string')
        .map(text => ({ id: createId(), text, done: false }))
    : []

  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()

  return { id: raw.id, title: raw.title, todos, createdAt, updatedAt: createdAt }
}

function safeGet(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key)
  }
  catch {
    return null
  }
}

function safeSet(storage: StorageLike, key: string, value: string): WriteResult {
  try {
    storage.setItem(key, value)
    return { ok: true }
  }
  catch (error) {
    return { ok: false, failure: isQuotaError(error) ? 'quota' : 'unavailable' }
  }
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  // Safari в приватном режиме и Firefox называют ошибку по-разному.
  const name = error.name
  return name === 'QuotaExceededError'
    || name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || name === 'QUOTA_EXCEEDED_ERR'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
