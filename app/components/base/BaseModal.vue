<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  describedBy?: string
  dismissible?: boolean
}>(), {
  describedBy: undefined,
  dismissible: true,
})

const emit = defineEmits<{ dismiss: [] }>()

const dialogRef = ref<HTMLElement | null>(null)
const openRef = toRef(props, 'open')
const titleId = useId()

const { activate } = useFocusTrap(dialogRef, openRef)

defineExpose({
  focusInitial: (element: HTMLElement | null): void => activate(element),
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.dismissible) {
    event.stopPropagation()
    emit('dismiss')
  }
}

watch(openRef, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal"
      @keydown="onKeydown"
    >
      <div
        class="modal__backdrop"
        @click="dismissible && emit('dismiss')"
      />
      <div
        ref="dialogRef"
        class="modal__dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="describedBy"
      >
        <h2
          :id="titleId"
          class="modal__title"
        >
          {{ title }}
        </h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal {
  position: fixed;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  inset: 0;
}

.modal__backdrop {
  position: absolute;
  background: rgb(10 14 20 / 55%);
  animation: fade 0.15s ease;
  inset: 0;
}

.modal__dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(420px, 100%);
  padding: var(--space-5);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg);
  animation: rise 0.18s ease;
}

.modal__title {
  font-size: 18px;
  line-height: 1.3;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

@keyframes rise {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
}
</style>
