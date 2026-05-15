<template>
  <div>
    <ToolPageTitle title="统一编解码" />
    <p class="mb-4 text-gray-500">选择输入与输出格式，支持 URL、Base、Hex、Unicode、ASCII、二进制、八进制、十进制等格式互转。</p>

    <div class="universal-format-grid mb-4">
      <div>
        <label class="block mb-1">输入格式</label>
        <select v-model="fromFormat" class="form-input">
          <option v-for="format in UNIVERSAL_ENCODING_FORMATS" :key="format.id" :value="format.id">
            {{ format.label }}
          </option>
        </select>
        <p class="format-tip">{{ fromFormatDescription }}</p>
      </div>

      <button class="btn btn-secondary swap-button" type="button" title="交换输入输出格式" @click="swapFormats">交换</button>

      <div>
        <label class="block mb-1">输出格式</label>
        <select v-model="toFormat" class="form-input">
          <option v-for="format in UNIVERSAL_ENCODING_FORMATS" :key="`to-${format.id}`" :value="format.id">
            {{ format.label }}
          </option>
        </select>
        <p class="format-tip">{{ toFormatDescription }}</p>
      </div>
    </div>

    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="inputText" class="form-input form-input-lg" placeholder="请输入待转换的内容..."></textarea>
    </div>

    <div class="btn-group mb-4">
      <button class="btn btn-primary" type="button" @click="convertNow">转换</button>
      <button class="btn btn-secondary" type="button" @click="clearAll">清空</button>
    </div>

    <ResultBox label="输出" :value="outputText" lg />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { convertUniversalEncoding, UNIVERSAL_ENCODING_FORMATS } from '../../utils/encoding-tools.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const inputText = ref('')
const outputText = ref('')
const fromFormat = ref('utf8')
const toFormat = ref('base64')

const fromFormatDescription = computed(() => {
  return UNIVERSAL_ENCODING_FORMATS.find((format) => format.id === fromFormat.value)?.description || ''
})

const toFormatDescription = computed(() => {
  return UNIVERSAL_ENCODING_FORMATS.find((format) => format.id === toFormat.value)?.description || ''
})

useClearOnInput([inputText, fromFormat, toFormat], () => {
  outputText.value = ''
})

function convertNow() {
  if (!String(inputText.value || '').trim()) {
    outputText.value = '请输入内容'
    return
  }
  const result = convertUniversalEncoding(inputText.value, fromFormat.value, toFormat.value)
  outputText.value = result.ok ? result.output : `输入不合法：${result.error}`
}

function clearAll() {
  inputText.value = ''
  outputText.value = ''
}

function swapFormats() {
  const previousFrom = fromFormat.value
  fromFormat.value = toFormat.value
  toFormat.value = previousFrom
}
</script>

<style scoped>
.universal-format-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.75rem;
  align-items: end;
}

.swap-button {
  /* 垂直居中 */
  align-self: center;
  white-space: nowrap;
}

.format-tip {
  margin-top: 0.4rem;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  line-height: 1.35;
  min-height: 1.1rem;
}

@media (max-width: 780px) {
  .universal-format-grid {
    grid-template-columns: 1fr;
  }

  .swap-button {
    width: 100%;
  }
}
</style>
