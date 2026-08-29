<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  type?: 'button' | 'submit'
  disabled?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  disabled: false,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="button"
    :class="[`button--${variant}`, `button--${size}`]"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.button {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 500;
  white-space: nowrap;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.button--md {
  height: 40px;
  font-size: 15px;
}

.button--sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: 14px;
}

.button--primary {
  background: var(--c-accent);
  color: var(--c-accent-contrast);

  &:hover:not(:disabled) {
    filter: brightness(1.08);
  }
}

.button--secondary {
  border-color: var(--c-border-strong);
  background: var(--c-surface);

  &:hover:not(:disabled) {
    background: var(--c-surface-alt);
  }
}

.button--ghost {
  color: var(--c-text-muted);

  &:hover:not(:disabled) {
    background: var(--c-surface-alt);
    color: var(--c-text);
  }
}

.button--danger {
  border-color: var(--c-danger);
  color: var(--c-danger);

  &:hover:not(:disabled) {
    background: var(--c-danger-soft);
  }
}
</style>
