<template>
  <div class="tool-page-title-row mb-2">
    <h2 class="text-xl font-bold tool-page-title">{{ title }}</h2>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
})
</script>

<style scoped>
.tool-page-title-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.tool-page-title {
  margin: 0;
  min-width: 0;
}
</style>