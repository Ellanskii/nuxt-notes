import type { StorageLike } from './storage'
import { resolveStorage } from './storage'

let cached: StorageLike | null = null

/** Одно разрешённое хранилище на вкладку: и стор, и черновики пишут в него. */
export function clientStorage(): StorageLike {
  if (!cached) {
    cached = resolveStorage(typeof window === 'undefined' ? null : window.localStorage)
  }
  return cached
}
