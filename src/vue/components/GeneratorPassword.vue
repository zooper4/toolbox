<template>
  <div>
    <ToolPageTitle title="密码生成" />
    <p class="mb-4 text-gray-500">生成安全的随机密码</p>
    <div class="mb-4">
      <label class="block mb-1">长度</label>
      <div class="flex items-center gap-2">
        <input v-model.number="len" class="form-input" type="number" min="4" max="128" style="max-width:80px" />
        <span class="tag-row">
          <span class="tag" :class="{active: len===16}" @click="len=16">16</span>
          <span class="tag" :class="{active: len===24}" @click="len=24">24</span>
          <span class="tag" :class="{active: len===32}" @click="len=32">32</span>
          <span class="tag" :class="{active: len===64}" @click="len=64">64</span>
        </span>
      </div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">强度</label>
      <select v-model="strength" class="form-input">
        <option value="low">仅数字</option>
        <option value="medium">字母+数字</option>
        <option value="high">大小写+数字+符号</option>
      </select>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="generate">生成</button>
    <ResultBox label="结果" :value="result" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'

const len = ref(16)
const strength = ref('high')
const result = ref('')

function generate() {
  const length = Number(len.value)
  if (!Number.isFinite(length) || !Number.isInteger(length)) {
    result.value = '长度请输入 4-128 的整数'
    return
  }
  if (length < 4 || length > 128) {
    result.value = '长度范围应为 4-128'
    return
  }
  if (!['low', 'medium', 'high'].includes(strength.value)) {
    result.value = '强度参数不合法'
    return
  }
  const sets = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digit: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  }
  let pool = ''
  if (strength.value === 'low') pool = sets.digit
  else if (strength.value === 'medium') pool = sets.lower + sets.digit
  else pool = sets.upper + sets.lower + sets.digit + sets.special
  try {
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error('当前环境不支持安全随机数')
    }
    const array = new Uint32Array(length)
    crypto.getRandomValues(array)
    let password = ''
    for (let i = 0; i < length; i++) password += pool[array[i] % pool.length]
    result.value = password
  } catch (error) {
    result.value = `生成失败：${error?.message || '未知错误'}`
  }
}

useClearOnInput([len, strength], () => {
  result.value = ''
})
</script>

