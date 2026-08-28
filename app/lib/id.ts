let counter = 0

export function createId(): string {
  const uuid = globalThis.crypto?.randomUUID
  if (uuid) {
    return globalThis.crypto.randomUUID()
  }

  // Фолбэк для окружений без crypto (старые браузеры, http-контекст).
  counter += 1
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
