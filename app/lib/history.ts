import type { NotePatch, TextField } from '~/lib/patch'
import { textFieldKey } from '~/lib/patch'

export const HISTORY_LIMIT = 50
export const COALESCE_MS = 600

export interface HistoryOptions {
  limit?: number
  /** Пауза ввода, после которой накопленный текст фиксируется отдельной записью. */
  coalesceMs?: number
}

interface PendingText {
  key: string
  field: TextField
  from: string
  to: string
  at: number
}

export interface History {
  /**
   * Непрерывный ввод в одно поле копится в pending и станет одной записью.
   * `previousValue` учитывается только когда pending для этого поля ещё нет.
   */
  textInput: (field: TextField, previousValue: string, nextValue: string, now: number) => void
  /** Фиксация накопленного ввода: по blur, перед атомарной операцией, на уходе со страницы. */
  commitPending: () => NotePatch | null
  /** Фиксация по паузе ввода — вызывается таймером редактора. */
  commitIfIdle: (now: number) => NotePatch | null
  /** Атомарная запись: чекбокс, добавление, удаление пункта. */
  push: (patch: NotePatch) => void
  undo: () => NotePatch | null
  redo: () => NotePatch | null
  reset: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  undoDepth: () => number
  redoDepth: () => number
  pendingField: () => TextField | null
}

export function createHistory(options: HistoryOptions = {}): History {
  const limit = options.limit ?? HISTORY_LIMIT
  const coalesceMs = options.coalesceMs ?? COALESCE_MS

  const past: NotePatch[] = []
  const future: NotePatch[] = []
  let pending: PendingText | null = null

  function record(patch: NotePatch): void {
    past.push(patch)
    // Кольцевой лимит: самая старая запись вытесняется, глубина undo остаётся 50.
    if (past.length > limit) {
      past.shift()
    }
    future.length = 0
  }

  function commitPending(): NotePatch | null {
    if (!pending) {
      return null
    }

    const { field, from, to } = pending
    pending = null

    // Ввод, вернувший поле к исходному значению, записи не создаёт.
    if (from === to) {
      return null
    }

    const patch: NotePatch = field.kind === 'title'
      ? { t: 'title', from, to }
      : { t: 'todo-text', id: field.id, from, to }

    record(patch)
    return patch
  }

  return {
    textInput(field, previousValue, nextValue, now) {
      const key = textFieldKey(field)

      if (pending && pending.key === key) {
        pending.to = nextValue
        pending.at = now
        return
      }

      // Переключение на другое поле закрывает предыдущую запись.
      commitPending()
      pending = { key, field, from: previousValue, to: nextValue, at: now }
    },

    commitPending,

    commitIfIdle(now) {
      if (!pending || now - pending.at < coalesceMs) {
        return null
      }
      return commitPending()
    },

    push(patch) {
      commitPending()
      record(patch)
    },

    undo() {
      commitPending()

      const patch = past.pop()
      if (!patch) {
        return null
      }

      future.push(patch)
      return patch
    },

    redo() {
      // Любой незафиксированный ввод — это новое изменение, оно гасит redo-ветку.
      commitPending()

      const patch = future.pop()
      if (!patch) {
        return null
      }

      past.push(patch)
      return patch
    },

    reset() {
      past.length = 0
      future.length = 0
      pending = null
    },

    canUndo() {
      return past.length > 0 || (pending !== null && pending.from !== pending.to)
    },

    canRedo() {
      // Незафиксированный ввод — новое изменение: как только он попадёт
      // в историю, redo-ветка исчезнет, поэтому кнопка уже неактивна.
      return future.length > 0 && !(pending !== null && pending.from !== pending.to)
    },

    undoDepth() {
      return past.length
    },

    redoDepth() {
      return future.length
    },

    pendingField() {
      return pending?.field ?? null
    },
  }
}
