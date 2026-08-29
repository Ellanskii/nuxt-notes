import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

// Дефолтное окружение — happy-dom, а не 'nuxt': ядро и стор от рантайма Nuxt
// не зависят, а подъём инстанса стоил бы секунд на каждый файл.
// Полное окружение при необходимости включается докблоком в конкретном файле.
export default defineVitestConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/lib/**/*.ts', 'app/stores/**/*.ts'],
      // Константы и обёртка над window — тестировать нечего.
      exclude: ['app/lib/theme-keys.ts', 'app/lib/client-storage.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
})
