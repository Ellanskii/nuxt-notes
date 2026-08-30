import type { Ref } from 'vue'
import { onScopeDispose } from 'vue'
import { resolveTargetKind, resolveUndoIntent } from '~/lib/shortcut'

export interface UndoShortcutOptions {
  isModalOpen: Ref<boolean>
  onUndo: () => void
  onRedo: () => void
}

/**
 * Глобальный Ctrl+Z страницы редактирования.
 *
 * «Грязность» поля считается по фокус-сессии, а не по состоянию истории:
 * пока в поле идёт ввод и фокус из него не уходил, нативная отмена
 * браузера остаётся приоритетной. Признак приходит из события input, поэтому
 * вставка, drag-and-drop, отмена из контекстного меню и коммит IME
 * учитываются наравне с клавиатурой.
 */
export function useUndoShortcut({ isModalOpen, onUndo, onRedo }: UndoShortcutOptions) {
  let dirtyTarget: EventTarget | null = null

  function onFocusIn(event: FocusEvent): void {
    if (event.target !== dirtyTarget) {
      dirtyTarget = null
    }
  }

  function onInput(event: Event): void {
    dirtyTarget = event.target
  }

  function onKeydown(event: KeyboardEvent): void {
    const intent = resolveUndoIntent({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      isComposing: event.isComposing,
      keyCode: event.keyCode,
      targetKind: resolveTargetKind(event.target),
      fieldIsDirty: event.target !== null && event.target === dirtyTarget,
      modalOpen: isModalOpen.value,
    })

    if (intent === 'native' || intent === 'ignore') {
      return
    }

    event.preventDefault()
    if (intent === 'app-undo') {
      onUndo()
    }
    else {
      onRedo()
    }
  }

  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('input', onInput, true)

  onScopeDispose(() => {
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('focusin', onFocusIn, true)
    document.removeEventListener('input', onInput, true)
  })
}
