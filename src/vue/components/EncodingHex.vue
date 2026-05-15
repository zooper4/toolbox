<template>
  <div>
    <ToolPageTitle title="Hex 编解码" />
    <p class="mb-4 text-gray-500">十六进制编码和解码</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="input" class="form-input form-input-lg" placeholder="粘贴文本或 Hex 字符串..."></textarea>
    </div>
    <div class="btn-group mb-2">
      <button class="btn btn-primary" @click="encode">编码</button>
      <button class="btn btn-secondary" @click="decode">解码</button>
    </div>
    <ResultBox label="输出" :value="lastR" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { hexDecode, hexEncode } from '../../utils/encoding-tools.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const input = ref('')
const lastR = ref('')

useClearOnInput([input], () => { lastR.value = '' })

function encode() {
  const value = String(input.value || '')
  if (!value.trim()) {
    lastR.value = '请输入内容'
    return
  }
  try {
    lastR.value = hexEncode(value)
  } catch (error) {
    lastR.value = `输入不合法：${error?.message || 'Hex 编码失败'}`
  }
}
function decode() {
  const rawValue = String(input.value || '')
  const value = rawValue.replace(/\s+/g, '')
  if (!value) {
    lastR.value = '请输入内容'
    return
  }
  if (value.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(value)) {
    lastR.value = 'Hex 输入不合法：需为偶数长度且仅包含 0-9 a-f'
    return
  }
  try {
    lastR.value = hexDecode(rawValue)
  } catch (error) {
    lastR.value = `输入不合法：${error?.message || 'Hex 解码失败'}`
  }
}
</script>

