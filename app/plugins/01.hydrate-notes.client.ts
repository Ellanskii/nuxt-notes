import { clientStorage } from '~/lib/client-storage'
import { useNotesStore } from '~/stores/notes'

// Гидратация до монтирования: страница /notes/:id сразу знает, есть ли
// такая заметка, и не мигает состоянием «не найдено».
export default defineNuxtPlugin((nuxtApp) => {
  const store = useNotesStore(nuxtApp.$pinia as never)
  store.setStorage(clientStorage())
  store.hydrate()
})
