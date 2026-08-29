import { NOTES_KEY } from '~/lib/storage'
import { useNotesStore } from '~/stores/notes'

export default defineNuxtPlugin((nuxtApp) => {
  const store = useNotesStore(nuxtApp.$pinia as never)

  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === NOTES_KEY) {
      store.applyExternal()
    }
  })

  // Отложенная запись не должна теряться при закрытии вкладки.
  const flush = (): void => store.flush()
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush()
    }
  })
})
