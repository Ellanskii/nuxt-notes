<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="checkbox">
    <input
      type="checkbox"
      class="checkbox__input"
      :checked="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
    <span
      class="checkbox__box"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
      >
        <path
          d="M3 8.5 6.5 12 13 4.5"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span class="visually-hidden">{{ label }}</span>
  </label>
</template>

<style scoped lang="scss">
.checkbox {
  display: inline-flex;
  flex: none;
  align-items: center;
  cursor: pointer;
}

.checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.checkbox__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  color: transparent;
  background: var(--c-surface);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.checkbox__input:checked + .checkbox__box {
  border-color: var(--c-accent);
  color: var(--c-accent-contrast);
  background: var(--c-accent);
}

.checkbox__input:focus-visible + .checkbox__box {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}
</style>
