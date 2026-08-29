<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'

const { active, answer } = useModal()

const modalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const confirmRef = ref<InstanceType<typeof BaseButton> | null>(null)
const cancelRef = ref<InstanceType<typeof BaseButton> | null>(null)
const textId = useId()

const open = computed(() => active.value !== null)

watch(active, async (value) => {
  if (!value) {
    return
  }

  await nextTick()
  // Для удаления фокус по умолчанию стоит на отмене, чтобы Enter
  // не подтверждал деструктивное действие вслепую.
  const initial = value.initialFocus === 'cancel' ? cancelRef.value : confirmRef.value
  modalRef.value?.focusInitial((initial?.$el ?? null) as HTMLElement | null)
})

function dismiss(): void {
  answer(false)
}
</script>

<template>
  <BaseModal
    v-if="active"
    ref="modalRef"
    :open="open"
    :title="active.title"
    :described-by="active.text ? textId : undefined"
    :dismissible="active.dismissible"
    @dismiss="dismiss"
  >
    <p
      v-if="active.text"
      :id="textId"
      class="confirm__text"
    >
      {{ active.text }}
    </p>
    <div class="confirm__actions">
      <BaseButton
        ref="cancelRef"
        variant="secondary"
        @click="answer(false)"
      >
        {{ active.cancelLabel }}
      </BaseButton>
      <BaseButton
        ref="confirmRef"
        :variant="active.tone === 'danger' ? 'danger' : 'primary'"
        @click="answer(true)"
      >
        {{ active.confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.confirm__text {
  color: var(--c-text-muted);
}

.confirm__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-2);
}

@media (width <= 380px) {
  .confirm__actions {
    flex-direction: column-reverse;

    :deep(.button) {
      width: 100%;
    }
  }
}
</style>
