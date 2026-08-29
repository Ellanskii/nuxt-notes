import { nextTick, readonly, ref } from 'vue'

const message = ref('')

/**
 * Короткие сообщения для скринридера: сохранение, отмена, undo.
 * Значение сбрасывается перед установкой, иначе повторный одинаковый
 * текст не будет озвучен.
 */
export function useLiveRegion() {
  function announce(text: string): void {
    message.value = ''
    void nextTick(() => {
      message.value = text
    })
  }

  return { message: readonly(message), announce }
}
