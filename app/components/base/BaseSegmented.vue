<script setup lang="ts" generic="T extends string">
defineProps<{
  modelValue: T
  label: string
  options: { value: T, label: string }[]
}>()

defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div
    class="segmented"
    role="group"
    :aria-label="label"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segmented__item"
      :class="{ 'segmented__item--active': option.value === modelValue }"
      :aria-pressed="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      <slot :name="option.value" />
      <span :class="{ 'visually-hidden': !!$slots[option.value] }">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.segmented {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-alt);
}

.segmented__item {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 30px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: calc(var(--radius-md) - 3px);
  color: var(--c-text-muted);
  font-size: 13px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    color: var(--c-text);
  }
}

.segmented__item--active {
  color: var(--c-text);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
}

.segmented :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
