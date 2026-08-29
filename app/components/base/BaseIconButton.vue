<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  tone?: 'default' | 'danger'
  disabled?: boolean
}>(), {
  tone: 'default',
  disabled: false,
})
</script>

<template>
  <button
    type="button"
    class="icon-button"
    :class="`icon-button--${tone}`"
    :disabled="disabled"
    :title="label"
    :aria-label="label"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.icon-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--c-text-muted);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--c-surface-alt);
    color: var(--c-text);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.icon-button--danger:hover:not(:disabled) {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}
</style>
