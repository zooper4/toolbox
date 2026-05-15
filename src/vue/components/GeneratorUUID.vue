<template>
  <div>
    <ToolPageTitle title="UUID 生成" />
    <p class="mb-4 text-gray-500">生成 UUID v4（随机）或 v7（时间有序）</p>
    <div class="mb-4">
      <label class="block mb-1">版本</label>
      <select v-model="ver" class="form-input">
        <option value="v4">UUID v4（随机）</option>
        <option value="v7">UUID v7（时间有序）</option>
      </select>
    </div>
    <div class="mb-4">
      <label class="block mb-1">数量</label>
      <div class="flex items-center gap-2">
        <input v-model.number="count" class="form-input" type="number" min="1" max="100" style="max-width:80px" />
        <span class="tag-row">
          <span class="tag" :class="{active: count===1}" @click="count=1">1</span>
          <span class="tag" :class="{active: count===5}" @click="count=5">5</span>
          <span class="tag" :class="{active: count===10}" @click="count=10">10</span>
          <span class="tag" :class="{active: count===50}" @click="count=50">50</span>
        </span>
      </div>
    </div>
    <div class="check-row mb-4">
      <label class="check-label"><input type="checkbox" v-model="hyphens" /> 包含连字符</label>
      <label class="check-label"><input type="checkbox" v-model="upper" /> 转为大写</label>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="generate">生成</button>
    <ResultBox label="结果" :value="result" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'

const ver = ref('v4')
const count = ref(1)
const hyphens = ref(true)
const upper = ref(false)
const generatedUuids = ref([])
const validationMessage = ref('')

const result = computed(() => {
  if (validationMessage.value) return validationMessage.value
  return generatedUuids.value
    .map((uuid) => {
      let formattedUuid = hyphens.value ? uuid : uuid.replace(/-/g, '')
      if (upper.value) {
        formattedUuid = formattedUuid.toUpperCase()
      }
      return formattedUuid
    })
    .join('\n')
})

function uuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16 | 0
    return (char === 'x' ? rand : rand & 0x3 | 0x8).toString(16)
  })
}
function uuidV7() {
  // 直接用 crypto.randomUUID() 近似
  return crypto.randomUUID()
}
function generate() {
  const numericCount = Number(count.value)
  if (!Number.isFinite(numericCount) || !Number.isInteger(numericCount)) {
    validationMessage.value = '数量请输入 1-100 的整数'
    generatedUuids.value = []
    return
  }
  if (numericCount < 1 || numericCount > 100) {
    validationMessage.value = '数量范围应为 1-100'
    generatedUuids.value = []
    return
  }
  validationMessage.value = ''
  const uuids = []
  for (let i = 0; i < numericCount; i++) {
    uuids.push(ver.value === 'v4' ? uuidV4() : uuidV7())
  }
  generatedUuids.value = uuids
}

// 修改生成参数时清空上次结果；展示格式变更应直接实时重绘结果。
useClearOnInput([ver, count], () => {
  validationMessage.value = ''
  generatedUuids.value = []
})
</script>