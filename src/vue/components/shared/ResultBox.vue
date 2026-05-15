<template>
  <div class="mb-4">
    <label class="result-label">{{ label }}</label>
    <div class="result-shell">
      <button
        v-if="copyable"
        class="result-copy-button"
        :disabled="!canCopy"
        :title="copyTitle"
        @click="copyResult"
      >
        <Check v-if="copyState === 'success'" :size="14" stroke-width="2" />
        <Copy v-else :size="14" stroke-width="2" />
      </button>
      <div class="result-box" :class="{ 'result-box-lg': lg, 'pre-wrap': preWrap, 'result-box-with-copy': copyable }"><slot>{{ value }}</slot></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'

const browserWindow = typeof window !== 'undefined' ? window : null
const browserDocument = typeof document !== 'undefined' ? document : null
const browserNavigator = typeof navigator !== 'undefined' ? navigator : null

const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '' },
  copyValue: { type: String, default: '' },
  copyable: { type: Boolean, default: true },
  lg: { type: Boolean, default: false },
  preWrap: { type: Boolean, default: true },
})

const copyState = ref('idle')
const resolvedCopyValue = computed(() => props.copyValue || props.value || '')
const canCopy = computed(() => props.copyable && resolvedCopyValue.value.trim().length > 0)
const copyTitle = computed(() => {
  if (!canCopy.value) return '没有可复制内容'
  if (copyState.value === 'success') return '已复制'
  if (copyState.value === 'error') return '复制失败'
  return '复制结果'
})

function fallbackCopy(text) {
  if (!browserDocument?.body) return false
  const textarea = browserDocument.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  browserDocument.body.appendChild(textarea)
  textarea.select()
  const ok = browserDocument.execCommand('copy')
  browserDocument.body.removeChild(textarea)
  return ok
}

function resetCopyState() {
  browserWindow?.setTimeout(() => {
    copyState.value = 'idle'
  }, 1500)
}

async function copyResult() {
  if (!canCopy.value) return
  try {
    if (browserNavigator?.clipboard?.writeText) {
      await browserNavigator.clipboard.writeText(resolvedCopyValue.value)
    } else if (!fallbackCopy(resolvedCopyValue.value)) {
      throw new Error('copy failed')
    }
    copyState.value = 'success'
    resetCopyState()
  } catch {
    copyState.value = 'error'
    resetCopyState()
  }
}
</script>

<style scoped>
.result-label {
  display: block;
  margin-bottom: 0.375rem;
}
.result-shell {
  position: relative;
}
.result-copy-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border: 1px solid var(--border);
  border-radius: 0.45rem;
  background: color-mix(in oklch, var(--card), var(--background) 15%);
  color: var(--muted-foreground);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
}
.result-copy-button:hover:enabled {
  color: var(--foreground);
  background: var(--accent);
}
.result-copy-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.result-box {
  min-height: 3rem;
  background: color-mix(in oklch, var(--card), var(--foreground) 5%);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  padding: 0.5rem;
  word-break: break-all;
}
.result-box-with-copy {
  padding-right: 3rem;
}
.result-box-lg {
  min-height: 12rem;
}
.pre-wrap {
  white-space: pre-wrap;
}
</style>
