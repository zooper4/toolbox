<template>
  <div>
    <ToolPageTitle title="Base64" />
    <p class="mb-4 text-gray-500">Base64 编码和解码，支持 URL 安全模式</p>
    <div class="mb-4">
      <label class="block mb-1">模式</label>
      <select v-model="mode" class="form-input">
        <option value="standard">标准</option>
        <option value="urlsafe">URL 安全</option>
      </select>
    </div>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="input" class="form-input form-input-lg" placeholder="粘贴内容..."></textarea>
    </div>
    <div class="btn-group mb-2">
      <button class="btn btn-primary" @click="run(true)">编码</button>
      <button class="btn btn-secondary" @click="run(false)">解码</button>
    </div>
    <ResultBox label="输出" :value="lastR" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { base64Decode, base64Encode, base64UrlDecode, base64UrlEncode } from '../../utils/encoding-tools.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const input = ref('')
const mode = ref('standard')
const lastR = ref('')

useClearOnInput([input, mode], () => { lastR.value = '' })

function run(enc) {
  const value = String(input.value || '')
  if (!value.trim()) {
    lastR.value = '请输入内容'
    return
  }
  try {
    const urlSafe = mode.value === 'urlsafe'
    lastR.value = enc
      ? (urlSafe ? base64UrlEncode(value) : base64Encode(value))
      : (urlSafe ? base64UrlDecode(value) : base64Decode(value))
  } catch (e) {
    lastR.value = `输入不合法：${e?.message || '无法完成 Base64 处理'}`
  }
}
</script>

