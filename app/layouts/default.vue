<script setup lang="ts">
import type { ThemeMode } from '~/lib/theme-keys'

const REPO_URL = 'https://github.com/Ellanskii/nuxt-notes'

const { t, locale, locales, setLocale } = useI18n()
const { mode, setMode, init } = useTheme()
const { message } = useLiveRegion()
const store = useNotesStore()

const themeOptions = computed(() => ([
  { value: 'light' as ThemeMode, label: t('theme.light') },
  { value: 'dark' as ThemeMode, label: t('theme.dark') },
  { value: 'system' as ThemeMode, label: t('theme.system') },
]))

const localeOptions = computed(() =>
  locales.value.map(item => ({ value: item.code, label: item.code.toUpperCase() })),
)

const readBanner = computed(() => {
  if (store.readFailure === 'corrupt') return t('banner.corrupt')
  if (store.readFailure === 'unsupported-version') return t('banner.unsupportedVersion')
  return null
})

const writeBanner = computed(() => {
  if (store.writeFailure === 'quota') return t('banner.quota')
  if (store.writeFailure === 'unavailable') return t('banner.unavailable')
  return null
})

onMounted(init)
</script>

<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__inner layout__bar">
        <a
          :href="REPO_URL"
          class="layout__brand"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="t('app.repo')"
        >
          <IconGithub />
          ellanskii
        </a>

        <div class="layout__controls">
          <BaseSegmented
            :model-value="locale"
            :label="t('locale.label')"
            :options="localeOptions"
            @update:model-value="setLocale($event)"
          />
          <BaseSegmented
            :model-value="mode"
            :label="t('theme.label')"
            :options="themeOptions"
            @update:model-value="setMode($event)"
          >
            <template #light>
              <IconSun />
            </template>
            <template #dark>
              <IconMoon />
            </template>
          </BaseSegmented>
        </div>
      </div>
    </header>

    <main class="layout__inner layout__main">
      <BaseBanner
        v-if="readBanner"
        tone="warning"
      >
        {{ readBanner }}
      </BaseBanner>
      <BaseBanner
        v-if="writeBanner"
        tone="danger"
        :dismiss-label="t('banner.dismiss')"
        @dismiss="store.dismissWriteFailure()"
      >
        {{ writeBanner }}
      </BaseBanner>

      <slot />
    </main>

    <p
      aria-live="polite"
      class="visually-hidden"
    >
      {{ message }}
    </p>

    <ConfirmModal />
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.layout__inner {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.layout__header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-bg) 88%, transparent);
  backdrop-filter: blur(8px);
}

.layout__bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  padding-block: var(--space-2);
}

.layout__brand {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  color: var(--c-text);
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;

  &:hover {
    color: var(--c-text-muted);
  }
}

.layout__controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.layout__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
  padding-block: var(--space-5) var(--space-6);
}
</style>
