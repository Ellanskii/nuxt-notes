// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TodoEditorRow from '~/components/editor/TodoEditorRow.vue'

describe('строка списка задач', () => {
  it('пробрасывает ввод наружу', async () => {
    const wrapper = await mountSuspended(TodoEditorRow, {
      props: { todo: { id: 't1', text: '', done: false }, highlighted: false },
    })

    const input = wrapper.find('input[type="text"]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).disabled).toBe(false)
    expect((input.element as HTMLInputElement).readOnly).toBe(false)

    await input.setValue('Хлеб')
    expect(wrapper.emitted('update:text')?.[0]).toEqual(['Хлеб'])
  })
})
