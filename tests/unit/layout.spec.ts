// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import DefaultLayout from '~/layouts/default.vue'

describe('основной макет', () => {
  it('рендерит переключатели и живой регион, не оставляя нерезолвленных компонентов', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const html = wrapper.html()

    // Два сегментных переключателя: язык и тема.
    expect(wrapper.findAll('[role="group"]')).toHaveLength(2)
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)

    // Нерезолвленный компонент осел бы в разметке кебаб-тегом.
    expect(html).not.toMatch(/<(confirm-modal|base-segmented|base-banner)/)
  })
})
