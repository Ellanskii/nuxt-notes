import { THEME_STORAGE_KEY } from './app/lib/theme-keys'

// Скрипт выставляет класс темы до первой отрисовки, иначе на тёмной теме
// проскакивает белая вспышка. Отсюда инлайн в <head>, а не плагин.
const themeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})
    var mode = stored === 'light' || stored === 'dark' ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.classList.add(mode)
    document.documentElement.style.colorScheme = mode
  } catch (e) {}
})()
`.trim()

export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@nuxt/eslint', 'nuxt-umami'],
  ssr: false,

  // Без pathPrefix имя компонента берётся из имени файла, а не из пути:
  // иначе components/editor/TodoEditorRow.vue пришлось бы звать
  // EditorTodoEditorRow.
  components: [{ path: '~/components', pathPrefix: false }],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Заметки',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        { name: 'description', content: 'Заметки со списками задач' },
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#ffffff' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#15171a' },
      ],
      script: [{ innerHTML: themeBootstrap, tagPosition: 'head' }],
    },
  },

  css: ['~/assets/scss/main.scss'],

  experimental: {
    // В Nuxt 4 включается только при compatibilityVersion >= 5, а типизированные
    // маршруты нужны при strict.
    typedPages: true,
  },

  compatibilityDate: '2026-08-28',

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/tokens" as *;',
        },
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  eslint: {
    config: {
      stylistic: true,
      nuxt: { sortConfigKeys: true },
    },
  },

  i18n: {
    // no_prefix: в URL локали нет, маршрутов по-прежнему два.
    strategy: 'no_prefix',
    defaultLocale: 'ru',
    locales: [
      { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'notes_locale',
      redirectOn: 'root',
    },
  },

  // Хост и id читаются из NUXT_UMAMI_HOST / NUXT_UMAMI_ID на этапе сборки:
  // приложение статическое, серверной части для проксирования нет. Без них
  // модуль уходит в no-op, приложение работает как обычно.
  umami: {
    ignoreLocalhost: true,
    performance: true,
  },
})
