<template>
  <div class="tag-row mb-4">
    <span class="tag" :class="{ active: modelValue === 'hex' }" @click="$emit('update:modelValue', 'hex')">Hex</span>
    <span class="tag" :class="{ active: modelValue === middleValue }" @click="$emit('update:modelValue', middleValue)">{{ middleLabel }}</span>
    <span class="tag" :class="{ active: modelValue === 'raw' }" @click="$emit('update:modelValue', 'raw')">二进制</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  mode: { type: String, default: 'encoded' },
})
defineEmits(['update:modelValue'])

const middleValue = computed(() => props.mode === 'text' ? 'utf8' : 'b64')
const middleLabel = computed(() => props.mode === 'text' ? 'UTF-8 文本' : 'Base64')
</script>

