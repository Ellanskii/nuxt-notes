import type { Note, TodoItem } from '~/types/note'

/**
 * Запись истории хранит только изменившееся поле, а не копию заметки:
 * 50 шагов истории весят килобайты независимо от размера списка.
 */
export type NotePatch
  = | { t: 'title', from: string, to: string }
    | { t: 'todo-text', id: string, from: string, to: string }
    | { t: 'todo-done', id: string, from: boolean, to: boolean }
    | { t: 'todo-add', index: number, item: TodoItem }
    | { t: 'todo-remove', index: number, item: TodoItem }

export type PatchDirection = 'redo' | 'undo'

/** Поле, в которое идёт непрерывный текстовый ввод. */
export type TextField = { kind: 'title' } | { kind: 'todo-text', id: string }

export function textFieldKey(field: TextField): string {
  return field.kind === 'title' ? 'title' : `todo-text:${field.id}`
}

export function invert(patch: NotePatch): NotePatch {
  switch (patch.t) {
    case 'title':
      return { t: 'title', from: patch.to, to: patch.from }
    case 'todo-text':
      return { t: 'todo-text', id: patch.id, from: patch.to, to: patch.from }
    case 'todo-done':
      return { t: 'todo-done', id: patch.id, from: patch.to, to: patch.from }
    case 'todo-add':
      return { t: 'todo-remove', index: patch.index, item: patch.item }
    case 'todo-remove':
      return { t: 'todo-add', index: patch.index, item: patch.item }
  }
}

export function applyPatch(note: Note, patch: NotePatch, direction: PatchDirection): void {
  const effective = direction === 'redo' ? patch : invert(patch)

  switch (effective.t) {
    case 'title': {
      note.title = effective.to
      break
    }
    case 'todo-text': {
      const todo = note.todos.find(item => item.id === effective.id)
      if (todo) {
        todo.text = effective.to
      }
      break
    }
    case 'todo-done': {
      const todo = note.todos.find(item => item.id === effective.id)
      if (todo) {
        todo.done = effective.to
      }
      break
    }
    case 'todo-add': {
      const index = clampIndex(effective.index, note.todos.length)
      note.todos.splice(index, 0, { ...effective.item })
      break
    }
    case 'todo-remove': {
      const index = note.todos.findIndex(item => item.id === effective.item.id)
      if (index !== -1) {
        note.todos.splice(index, 1)
      }
      break
    }
  }
}

/**
 * Идентификатор пункта, которого касается патч. Нужен редактору,
 * чтобы вернуть фокус на затронутую строку после undo/redo.
 */
export function patchTargetId(patch: NotePatch): string | null {
  switch (patch.t) {
    case 'title':
      return null
    case 'todo-text':
    case 'todo-done':
      return patch.id
    case 'todo-add':
    case 'todo-remove':
      return patch.item.id
  }
}

function clampIndex(index: number, length: number): number {
  if (index < 0) return 0
  if (index > length) return length
  return index
}
