import type { ResolvedTheme, ThemeMode } from '~/lib/theme-keys'
import { computed, onScopeDispose, readonly, ref } from 'vue'
import { isThemeMode, THEME_STORAGE_KEY } from '~/lib/theme-keys'

const mode = ref<ThemeMode>('system')
const systemPrefersDark = ref(false)
let initialised = false

function apply(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
  root.style.colorScheme = resolved
}

export function useTheme() {
  const resolved = computed<ResolvedTheme>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return mode.value
  })

  function setMode(next: ThemeMode): void {
    mode.value = next
    try {
      if (next === 'system') {
        window.localStorage.removeItem(THEME_STORAGE_KEY)
      }
      else {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      }
    }
    catch {
      // Тема — не те данные, ради которых стоит показывать ошибку.
    }
    apply(resolved.value)
  }

  function init(): void {
    if (initialised) {
      return
    }
    initialised = true

    let stored: string | null
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    }
    catch {
      stored = null
    }

    mode.value = isThemeMode(stored) ? stored : 'system'

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = query.matches

    const onChange = (event: MediaQueryListEvent): void => {
      systemPrefersDark.value = event.matches
      if (mode.value === 'system') {
        apply(resolved.value)
      }
    }

    query.addEventListener('change', onChange)
    onScopeDispose(() => query.removeEventListener('change', onChange))

    apply(resolved.value)
  }

  return { mode: readonly(mode), resolved, setMode, init }
}
