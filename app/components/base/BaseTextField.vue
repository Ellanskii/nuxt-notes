<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  maxlength?: number
  hideLabel?: boolean
  invalid?: boolean
  size?: 'md' | 'lg'
}>(), {
  label: '',
  placeholder: '',
  maxlength: undefined,
  hideLabel: false,
  invalid: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'commit': []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const id = useId()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

defineExpose({
  focus: (): void => inputRef.value?.focus(),
  select: (): void => inputRef.value?.select(),
})
</script>

<template>
  <div class="field">
    <label
      :for="id"
      :class="[hideLabel ? 'visually-hidden' : 'field__label']"
    >{{ props.label }}</label>
    <input
      :id="id"
      ref="inputRef"
      type="text"
      class="field__input"
      :class="[`field__input--${size}`, { 'field__input--invalid': invalid }]"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :aria-invalid="invalid || undefined"
      autocomplete="off"
      @input="onInput"
      @blur="emit('commit')"
    >
  </div>
</template>

<style scoped lang="scss">
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}

.field__label {
  color: var(--c-text-muted);
  font-size: 14px;
}

.field__input {
  width: 100%;
  padding: 0 var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  transition: border-color 0.15s ease;

  &::placeholder {
    color: var(--c-text-muted);
  }

  &:hover {
    border-color: var(--c-border-strong);
  }
}

.field__input--md {
  height: 40px;
}

.field__input--lg {
  height: 48px;
  font-size: 20px;
  font-weight: 600;
}

.field__input--invalid {
  border-color: var(--c-warning-border);
  background: var(--c-warning-soft);
}
</style>
