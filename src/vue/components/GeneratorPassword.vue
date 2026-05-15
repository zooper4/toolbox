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
      <label class="block mb-1">字符组成</label>
      <div class="check-row">
        <label class="check-label"><input v-model="includeUpper" type="checkbox" /> 大写字母</label>
        <label class="check-label"><input v-model="includeLower" type="checkbox" /> 小写字母</label>
        <label class="check-label"><input v-model="includeDigit" type="checkbox" /> 数字</label>
        <label class="check-label"><input v-model="includeSpecial" type="checkbox" /> 符号</label>
      </div>
      <p class="mt-2 text-gray-500 text-sm">可多选组合；已选类别越多，通常密码强度越高。</p>
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
const includeUpper = ref(true)
const includeLower = ref(true)
const includeDigit = ref(true)
const includeSpecial = ref(true)
const result = ref('')

function randomIndex(max) {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

function pickRandomChar(chars) {
  return chars[randomIndex(chars.length)]
}

function shuffleChars(chars) {
  for (let index = chars.length - 1; index > 0; index--) {
    const swapIndex = randomIndex(index + 1)
    const current = chars[index]
    chars[index] = chars[swapIndex]
    chars[swapIndex] = current
  }
}

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
  const sets = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digit: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  }
  try {
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error('当前环境不支持安全随机数')
    }

    const selectedSets = []
    if (includeUpper.value) selectedSets.push(sets.upper)
    if (includeLower.value) selectedSets.push(sets.lower)
    if (includeDigit.value) selectedSets.push(sets.digit)
    if (includeSpecial.value) selectedSets.push(sets.special)

    if (!selectedSets.length) {
      result.value = '请至少选择一种字符组成'
      return
    }
    if (length < selectedSets.length) {
      result.value = `当前已选 ${selectedSets.length} 类字符，长度至少需要 ${selectedSets.length}`
      return
    }

    const pool = selectedSets.join('')
    const passwordChars = selectedSets.map((chars) => pickRandomChar(chars))
    while (passwordChars.length < length) {
      passwordChars.push(pickRandomChar(pool))
    }
    shuffleChars(passwordChars)
    result.value = passwordChars.join('')
  } catch (error) {
    result.value = `生成失败：${error?.message || '未知错误'}`
  }
}

useClearOnInput([len, includeUpper, includeLower, includeDigit, includeSpecial], () => {
  result.value = ''
})
</script>

