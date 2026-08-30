import type { Ref } from 'vue'
import { onScopeDispose, watch } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function focusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(element => element.offsetParent !== null || element === document.activeElement)
}

/**
 * Удерживает Tab внутри контейнера и возвращает фокус тому элементу,
 * с которого модалку открыли.
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let restoreTo: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !container.value) {
      return
    }

    const items = focusable(container.value)
    if (items.length === 0) {
      event.preventDefault()
      return
    }

    const first = items[0]!
    const last = items[items.length - 1]!
    const current = document.activeElement

    if (event.shiftKey && (current === first || !container.value.contains(current))) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function activate(initial?: HTMLElement | null): void {
    restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.addEventListener('keydown', onKeydown, true)

    const target = initial ?? (container.value ? focusable(container.value)[0] : null)
    target?.focus()
  }

  function deactivate(): void {
    document.removeEventListener('keydown', onKeydown, true)
    restoreTo?.focus()
    restoreTo = null
  }

  watch(active, (value) => {
    if (!value) {
      deactivate()
    }
  })

  // Модалка чаще закрывается размонтированием, чем сменой флага, —
  // фокус возвращается и в этом случае.
  onScopeDispose(deactivate)

  return { activate, deactivate }
}
