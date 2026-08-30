export type UndoIntent = 'app-undo' | 'app-redo' | 'native' | 'ignore'

export type TargetKind = 'text-field' | 'contenteditable' | 'other'

export interface UndoIntentInput {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  isComposing: boolean
  keyCode: number
  targetKind: TargetKind
  /** Был ли ввод в это поле с момента получения фокуса. */
  fieldIsDirty: boolean
  modalOpen: boolean
}

/**
 * Кто обрабатывает Ctrl+Z: приложение или браузер.
 *
 * Правило конфликта: пока пользователь правит текст в поле, нативный undo поля
 * приоритетнее — иначе у поля отбиралась бы посимвольная отмена. Как только
 * фокус ушёл из поля (или в текущей фокус-сессии ничего не набрано), Ctrl+Z
 * работает как отмена изменений заметки.
 */
export function resolveUndoIntent(input: UndoIntentInput): UndoIntent {
  // Промежуточное состояние IME: клавиша принадлежит наборной сессии, не приложению.
  if (input.isComposing || input.keyCode === 229) {
    return 'ignore'
  }

  const modifier = input.ctrlKey || input.metaKey
  if (!modifier) {
    return 'ignore'
  }

  const key = input.key.toLowerCase()
  if (key !== 'z' && key !== 'y') {
    return 'ignore'
  }

  // Под фокус-трапом модалки undo не должен трогать заметку за её спиной.
  if (input.modalOpen) {
    return 'ignore'
  }

  if (input.fieldIsDirty && (input.targetKind === 'text-field' || input.targetKind === 'contenteditable')) {
    return 'native'
  }

  const isRedo = key === 'y' || input.shiftKey
  return isRedo ? 'app-redo' : 'app-undo'
}

export function resolveTargetKind(target: EventTarget | null): TargetKind {
  if (!(target instanceof HTMLElement)) {
    return 'other'
  }

  if (target.isContentEditable) {
    return 'contenteditable'
  }

  if (target instanceof HTMLTextAreaElement) {
    return 'text-field'
  }

  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase()
    return type === 'text' || type === 'search' || type === 'url' || type === 'email' || type === 'tel'
      ? 'text-field'
      : 'other'
  }

  return 'other'
}
