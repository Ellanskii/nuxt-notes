import { computed, ref } from 'vue'

export type ModalTone = 'default' | 'danger'

export interface ConfirmOptions {
  title: string
  text?: string
  confirmLabel: string
  cancelLabel: string
  tone?: ModalTone
  /** Для деструктивных действий фокус по умолчанию стоит на отмене. */
  initialFocus?: 'confirm' | 'cancel'
  /** Модалку без выбора закрыть по Escape нельзя. */
  dismissible?: boolean
}

interface ActiveModal extends ConfirmOptions {
  id: number
  resolve: (value: boolean) => void
}

const active = ref<ActiveModal | null>(null)
let nextId = 0

export function useModal() {
  const isOpen = computed(() => active.value !== null)

  function confirm(options: ConfirmOptions): Promise<boolean> {
    // Открытая модалка перекрывается новой только после ответа на текущую.
    active.value?.resolve(false)

    nextId += 1
    return new Promise<boolean>((resolve) => {
      active.value = {
        tone: 'default',
        initialFocus: 'confirm',
        dismissible: true,
        ...options,
        id: nextId,
        resolve,
      }
    })
  }

  function answer(value: boolean): void {
    const current = active.value
    if (!current) {
      return
    }

    active.value = null
    current.resolve(value)
  }

  return { active, isOpen, confirm, answer }
}
