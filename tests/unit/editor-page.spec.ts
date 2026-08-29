// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EditorPage from '~/pages/notes/[id].vue'

describe('страница редактирования', () => {
  it('рендерит добавленный пункт и позволяет его заполнить', async () => {
    const wrapper = await mountSuspended(EditorPage, { route: '/notes/new' })

    await wrapper.find('.editor__todos-head button').trigger('click')
    await wrapper.vm.$nextTick()

    // Строка списка должна отрендериться настоящим компонентом, а не
    // неизвестным элементом: именно это ломал префикс пути в автоимпорте.
    expect(wrapper.findAll('.row')).toHaveLength(1)

    const inputs = wrapper.findAll('input[type="text"]')
    expect(inputs).toHaveLength(2)

    await inputs[1]!.setValue('Хлеб')
    await wrapper.vm.$nextTick()

    expect((wrapper.findAll('input[type="text"]')[1]!.element as HTMLInputElement).value).toBe('Хлеб')
  })

  it('подключает модалку подтверждений в разметку', async () => {
    const wrapper = await mountSuspended(EditorPage, { route: '/notes/new' })
    expect(wrapper.html()).not.toContain('confirm-modal')
    expect(wrapper.html()).not.toContain('todo-editor-row')
  })
})
