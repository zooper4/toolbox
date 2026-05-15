<template>
  <div>
    <ToolPageTitle title="Base32 编解码" />
    <p class="mb-4 text-gray-500">Base32 编码和解码工具</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="input" class="form-input form-input-lg" placeholder="粘贴内容..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="encode">编码</button>
      <button class="btn btn-secondary" @click="decode">解码</button>
    </div>
    <ResultBox label="输出" :value="output" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { base32Decode, base32Encode } from '../../utils/encoding-tools.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const input = ref('')
const output = ref('')

useClearOnInput([input], () => { output.value = '' })

function encode() {
  const value = String(input.value || '')
  if (!value.trim()) {
    output.value = '请输入内容'
    return
  }
  try {
    output.value = base32Encode(value)
  } catch (error) {
    output.value = `输入不合法：${error?.message || 'Base32 编码失败'}`
  }
}
function decode() {
  const value = String(input.value || '')
  if (!value.trim()) {
    output.value = '请输入内容'
    return
  }
  try {
    output.value = base32Decode(value)
  } catch (error) {
    output.value = `输入不合法：${error?.message || 'Base32 解码失败'}`
  }
}
</script>

<style scoped>
</style>
