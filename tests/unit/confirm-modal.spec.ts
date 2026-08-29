// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import ConfirmModal from '~/components/modal/ConfirmModal.vue'
import { useModal } from '~/composables/useModal'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('модалка подтверждения', () => {
  it('открывается, отдаёт ответ и закрывается', async () => {
    const wrapper = await mountSuspended(ConfirmModal)
    const { confirm } = useModal()

    const answer = confirm({
      title: 'Удалить заметку?',
      text: 'Действие необратимо.',
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      tone: 'danger',
      initialFocus: 'cancel',
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // Модалка уходит в <Teleport to="body">, поэтому ищем в документе.
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(document.body.textContent).toContain('Удалить заметку?')

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
    const cancel = buttons.find(button => button.textContent?.trim() === 'Отмена')
    expect(cancel, 'кнопка отмены не найдена').toBeTruthy()

    // Для деструктивного действия фокус по умолчанию не на кнопке удаления.
    expect(document.activeElement).toBe(cancel)

    cancel!.click()
    await expect(answer).resolves.toBe(false)
  })

  it('подтверждает выбранное действие', async () => {
    const wrapper = await mountSuspended(ConfirmModal)
    const { confirm } = useModal()

    const answer = confirm({ title: 'Сохранить?', confirmLabel: 'Да', cancelLabel: 'Нет' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
    buttons.find(button => button.textContent?.trim() === 'Да')!.click()

    await expect(answer).resolves.toBe(true)
  })
})
