import type { Note } from '~/types/note'

export interface MergeInput {
  /** Актуальный слепок из хранилища — в нём есть работа других вкладок. */
  remote: Note[]
  /** Состояние этой вкладки. */
  local: Note[]
  /** Заметки, изменённые или созданные локально и ещё не записанные. */
  dirtyIds: ReadonlySet<string>
  /** Заметки, удалённые локально и ещё не записанные. */
  tombstones: ReadonlySet<string>
}

/**
 * Вкладки пишут весь массив целиком, поэтому «последний флаш побеждает»
 * стирал бы чужие заметки. Сливаем поэлементно: чужие изменения берём из
 * хранилища, свои несохранённые накладываем поверх.
 */
export function mergeNotes({ remote, local, dirtyIds, tombstones }: MergeInput): Note[] {
  const result = new Map<string, Note>()

  for (const note of remote) {
    if (!tombstones.has(note.id)) {
      result.set(note.id, note)
    }
  }

  for (const note of local) {
    if (dirtyIds.has(note.id) && !tombstones.has(note.id)) {
      result.set(note.id, note)
    }
  }

  return [...result.values()]
}

export function sortByUpdatedAt(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt)
}
