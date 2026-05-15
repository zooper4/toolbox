<template>
  <div v-if="toolId === 'color'">
    <ToolPageTitle title="颜色转换" />
    <p class="mb-4 text-gray-500">在 HEX、RGB、HSL、CMYK 之间转换</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <div class="flex gap-2 items-center">
        <input v-model="colorPicker" type="color" class="color-picker-input" @input="syncColorPicker" />
        <input v-model="textInput" class="form-input flex-1" placeholder="例如：#ff6600 或 rgb(255,102,0) 或 hsl(24,100%,50%)" />
      </div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">格式</label>
      <select v-model="format" class="form-input">
        <option value="hex">HEX</option>
        <option value="rgb">RGB</option>
        <option value="hsl">HSL</option>
      </select>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="convertColor">全格式转换</button>
    <div class="color-preview mb-4" :style="{ background: previewColor }"></div>
    <ResultBox label="结果" :value="output" />
  </div>

  <div v-else-if="toolId === 'data-format'">
    <ToolPageTitle title="数据格式转换" />
    <p class="mb-4 text-gray-500">支持 JSON、XML、CSV、YAML 互转</p>
    <div class="mb-4">
      <label class="block mb-1">源格式</label>
      <select v-model="fromFormat" class="form-input">
        <option value="json">JSON</option>
        <option value="xml">XML</option>
        <option value="csv">CSV</option>
        <option value="yaml">YAML</option>
      </select>
    </div>
    <div class="mb-4">
      <label class="block mb-1">目标格式</label>
      <select v-model="toFormat" class="form-input">
        <option value="json">JSON</option>
        <option value="xml">XML</option>
        <option value="csv">CSV</option>
        <option value="yaml">YAML</option>
      </select>
    </div>
    <div class="mb-4">
      <label class="block mb-1">数据</label>
      <textarea v-model="textInput" class="form-input form-input-xl" placeholder="粘贴数据..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="convertData">转换</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <div v-else-if="toolId === 'text-diff'">
    <ToolPageTitle title="文本对比" />
    <p class="mb-4 text-gray-500">比较两段文本并高亮差异</p>
    <div class="mb-4">
      <label class="block mb-1">原文</label>
      <textarea v-model="oldText" class="form-input form-input-lg" placeholder="原始文本..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">新文</label>
      <textarea v-model="newText" class="form-input form-input-lg" placeholder="修改后文本..."></textarea>
    </div>
    <div class="check-row mb-4">
      <label class="check-label"><input v-model="ignoreCase" type="checkbox" /> 忽略大小写</label>
      <label class="check-label"><input v-model="trimText" type="checkbox" /> 忽略首尾空白</label>
      <label class="check-label"><input v-model="ignoreNewline" type="checkbox" /> 忽略换行差异</label>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="runDiff">对比</button>
    <div class="mb-4">
      <label class="block mb-1">差异</label>
      <div class="diff-view" v-html="diffHtml"></div>
    </div>
  </div>

  <div v-else-if="toolId === 'ua-parser'">
    <ToolPageTitle title="UA 解析" />
    <p class="mb-4 text-gray-500">解析 User-Agent 字符串，识别浏览器、系统和设备</p>
    <div class="mb-4">
      <label class="block mb-1">当前 UA</label>
      <div class="info-box">{{ currentUserAgent }}</div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">自定义 UA（可选）</label>
      <input v-model="textInput" class="form-input" placeholder="留空则使用当前浏览器 UA" />
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="parseUa">解析</button>
    <ResultBox label="结果" :value="output" />
  </div>

  <div v-else-if="toolId === 'key-event'">
    <ToolPageTitle title="键盘事件" />
    <p class="mb-4 text-gray-500">实时查看 KeyboardEvent 属性</p>
    <div class="result-box text-center text-lg key-focus" tabindex="0" @keydown.prevent="captureKey">点击此处，然后按下任意按键</div>
    <div class="key-view mt-4">
      <div v-for="item in keyItems" :key="item.label" class="key-item">
        <div class="ki-label">{{ item.label }}</div>
        <div class="ki-value">{{ item.value }}</div>
      </div>
    </div>
  </div>

  <div v-else-if="toolId === 'svg-optimize'">
    <ToolPageTitle title="SVG 优化" />
    <p class="mb-4 text-gray-500">清理并压缩 SVG 文件</p>
    <div class="mb-4">
      <label class="block mb-1">SVG</label>
      <textarea v-model="textInput" class="form-input form-input-xl" placeholder='<svg viewBox="0 0 100 100"><!-- comment --><circle cx="50" cy="50" r="40" fill="red"/></svg>'></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="optimizeSvg">优化</button>
    <ResultBox label="结果" :value="output" lg />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { colorConvert, dataFormatConvert, parseUserAgent, svgOptimize, textDiff } from '../../utils/advanced-tools.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const browserNavigator = typeof navigator !== 'undefined' ? navigator : null

const props = defineProps({ toolId: { type: String, required: true } })
const textInput = ref('')
const output = ref('')
const colorPicker = ref('#ff6600')
const format = ref('hex')
const previewColor = ref('#ff6600')
const fromFormat = ref('json')
const toFormat = ref('xml')
const oldText = ref('')
const newText = ref('')
const currentUserAgent = browserNavigator?.userAgent ?? ''
const ignoreCase = ref(false)
const trimText = ref(false)
const ignoreNewline = ref(false)
const diffHtml = ref('请输入两段文本后进行对比')
const keyItems = ref([
  ['密钥', '-'], ['代码', '-'], ['KeyCode', '-'], ['Ctrl', '-'], ['Shift', '-'], ['Alt', '-'], ['Meta', '-'], ['Repeat', '-'], ['Location', '-'], ['类型', '-'],
].map(([label, value]) => ({ label, value })))

function syncColorPicker() {
  textInput.value = colorPicker.value
  convertColor()
}
function convertColor() {
  const value = textInput.value.trim()
  if (!value) return output.value = ''
  const hex = colorConvert(value, format.value, 'hex')
  const rgb = colorConvert(value, format.value, 'rgb')
  const hsl = colorConvert(value, format.value, 'hsl')
  const cmyk = colorConvert(value, format.value, 'cmyk')
  if (hex.startsWith('#')) {
    previewColor.value = hex
    colorPicker.value = hex
    output.value = `HEX: ${hex}\nRGB: ${rgb}\nHSL: ${hsl}\nCMYK: ${cmyk}`
  } else {
    output.value = '错误: ' + hex
    previewColor.value = '#ccc'
  }
}
function convertData() {
  if (!textInput.value) return output.value = '请输入数据'
  if (fromFormat.value === toFormat.value) return output.value = '源格式与目标格式相同'
  output.value = dataFormatConvert(textInput.value, fromFormat.value, toFormat.value)
}
function runDiff() {
  if (!oldText.value && !newText.value) return diffHtml.value = '请至少输入一段文本'
  diffHtml.value = textDiff(oldText.value, newText.value, {
    ignoreCase: ignoreCase.value,
    trimText: trimText.value,
    ignoreNewline: ignoreNewline.value,
  })
}
function parseUa() {
  const ua = textInput.value.trim() || currentUserAgent
  const result = parseUserAgent(ua)
  output.value = `浏览器: ${result.browser || '?'} ${result.browserVersion || ''}\n系统: ${result.os || '?'}\n设备: ${result.device || '?'}\n引擎: ${result.engine || '?'}`
}
function captureKey(event) {
  keyItems.value = [
    ['密钥', event.key], ['代码', event.code], ['KeyCode', event.keyCode], ['Ctrl', event.ctrlKey], ['Shift', event.shiftKey],
    ['Alt', event.altKey], ['Meta', event.metaKey], ['Repeat', event.repeat], ['Location', event.location], ['类型', event.type],
  ].map(([label, value]) => ({ label, value: String(value) }))
}
function optimizeSvg() {
  if (!textInput.value) return output.value = '请输入 SVG 内容'
  const result = svgOptimize(textInput.value)
  output.value = result.error ? result.error : `原始大小: ${textInput.value.length} bytes\n优化后: ${result.optimized.length} bytes\n节省: ${result.savings} bytes (${result.percent}%)\n\n${result.optimized}`
}

onMounted(() => {
  if (props.toolId === 'color') {
    textInput.value = '#ff6600'
    convertColor()
  }
  if (props.toolId === 'ua-parser') parseUa()
})

// 清理逻辑：当用户更改输入参数时，清空上一次的结果
useClearOnInput([textInput, format, colorPicker], () => { if (props.toolId === 'color') output.value = '' })
useClearOnInput([fromFormat, toFormat, textInput], () => { if (props.toolId === 'data-format') output.value = '' })
useClearOnInput([oldText, newText, ignoreCase, trimText, ignoreNewline], () => { if (props.toolId === 'text-diff') diffHtml.value = '' })
useClearOnInput([textInput], () => { if (props.toolId === 'ua-parser') output.value = '' })
useClearOnInput([textInput], () => { if (props.toolId === 'svg-optimize') output.value = '' })

watch(() => props.toolId, (toolId) => {
  if (toolId === 'color' && !textInput.value) {
    textInput.value = '#ff6600'
    convertColor()
  }
  if (toolId === 'ua-parser') parseUa()
})
</script>
