<template>
  <div class="mb-4">
    <label class="field-label">
      <span class="field-label-text">{{ label }}</span>
      <span v-if="hint" class="field-label-hint">{{ hint }}</span>
    </label>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
})
</script>
