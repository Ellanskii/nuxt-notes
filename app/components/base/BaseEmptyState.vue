<script setup lang="ts">
defineProps<{ title: string, text?: string }>()
</script>

<template>
  <div class="empty">
    <h2 class="empty__title">
      {{ title }}
    </h2>
    <p
      v-if="text"
      class="empty__text"
    >
      {{ text }}
    </p>
    <div
      v-if="$slots.default"
      class="empty__actions"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--c-border-strong);
  border-radius: var(--radius-lg);
  text-align: center;
}

.empty__title {
  font-size: 18px;
}

.empty__text {
  max-width: 42ch;
  color: var(--c-text-muted);
}

.empty__actions {
  margin-top: var(--space-3);
}
</style>
