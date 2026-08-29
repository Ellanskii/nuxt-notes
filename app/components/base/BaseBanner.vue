<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'warning' | 'danger', dismissLabel?: string }>(), {
  tone: 'warning',
  dismissLabel: '',
})

defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div
    class="banner"
    :class="`banner--${tone}`"
    role="status"
  >
    <p class="banner__text">
      <slot />
    </p>
    <button
      v-if="dismissLabel"
      type="button"
      class="banner__dismiss"
      @click="$emit('dismiss')"
    >
      {{ dismissLabel }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.banner {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border: 1px solid;
  border-radius: var(--radius-md);
  font-size: 14px;
}

.banner--warning {
  border-color: var(--c-warning-border);
  background: var(--c-warning-soft);
}

.banner--danger {
  border-color: var(--c-danger);
  background: var(--c-danger-soft);
}

.banner__dismiss {
  flex: none;
  border: 0;
  color: inherit;
  background: transparent;
  text-decoration: underline;
  cursor: pointer;
}
</style>
