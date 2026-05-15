<template>
  <div v-if="toolId === 'timestamp'">
    <ToolPageTitle title="时间戳转换" />
    <p class="mb-4 text-gray-500">在 UNIX 时间戳与日期时间格式之间转换</p>
    <div class="mb-4">
      <label class="block mb-1">当前</label>
      <div class="info-box">{{ nowInfo }}</div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">时间戳转日期</label>
      <div class="flex gap-2">
        <input v-model="timestampInput" class="form-input flex-1" placeholder="UNIX 时间戳（秒或毫秒）" />
        <button class="btn btn-primary" @click="convertTimestamp">转换</button>
      </div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">日期转时间戳</label>
      <div class="flex gap-2">
        <input v-model="dateInput" class="form-input flex-1" type="datetime-local" />
        <button class="btn btn-primary" @click="reverseTimestamp">转换</button>
      </div>
      <div class="tag-row mt-2">
        <span class="tag" @click="dateInput = '2024-01-01T00:00:00'">1月1日</span>
        <span class="tag" @click="dateInput = '2024-02-10T00:00:00'">2月10日</span>
        <span class="tag" @click="dateInput = '2024-05-01T00:00:00'">5月1日</span>
        <span class="tag" @click="dateInput = '2024-10-01T00:00:00'">10月1日</span>
      </div>
    </div>
    <ResultBox label="结果" :value="output" />
  </div>

  <div v-else-if="toolId === 'time-interval'">
    <ToolPageTitle title="时间间隔" />
    <p class="mb-4 text-gray-500">计算两个日期之间的时长</p>
    <div class="interval-grid">
      <div class="mb-4">
        <div class="field-head">
          <span class="field-title">开始时间</span>
          <button class="btn btn-ghost btn-sm field-now-btn" @click="useNow(true)">使用当前时间</button>
        </div>
        <input v-model="startTime" type="datetime-local" class="form-input" />
      </div>
      <div class="mb-4">
        <div class="field-head">
          <span class="field-title">结束时间</span>
          <button class="btn btn-ghost btn-sm field-now-btn" @click="useNow(false)">使用当前时间</button>
        </div>
        <input v-model="endTime" type="datetime-local" class="form-input" />
      </div>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="calcInterval">计算</button>
    </div>
    <ResultBox label="结果" :value="output" />
  </div>

  <div v-else-if="toolId === 'case-convert'">
    <ToolPageTitle title="字符格式化" />
    <p class="mb-4 text-gray-500">支持 camelCase、PascalCase、snake_case、kebab-case 等命名格式转换</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="例如：hello_world 或 HelloWorld"></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="convertCase">全格式转换</button>
    <ResultBox label="结果" :value="output" />
  </div>

  <div v-else-if="toolId === 'json-format'">
    <ToolPageTitle title="JSON 格式化" />
    <p class="mb-4 text-gray-500">格式化、校验并压缩 JSON</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="textInput" class="form-input form-input-xl" placeholder='{"name":"Alice","age":30}'></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="formatJson">格式化</button>
      <button class="btn btn-secondary" @click="minifyJson">压缩</button>
    </div>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <div v-else-if="toolId === 'regex'">
    <ToolPageTitle title="正则表达式测试" />
    <p class="mb-4 text-gray-500">测试匹配结果，并用开关控制全局匹配、忽略大小写、多行等行为。</p>
    <div class="mb-4">
      <label class="block mb-1">正则表达式</label>
      <input v-model="regexPattern" class="form-input" placeholder="例如：\\d+" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">匹配选项</label>
      <div class="check-row mb-2">
        <label v-for="flag in regexFlagOptions" :key="flag.key" class="check-label">
          <input v-model="regexFlags[flag.key]" type="checkbox" />
          <span>{{ flag.label }}</span>
          <span class="regex-flag-code">({{ flag.code }})</span>
        </label>
      </div>
      <p class="regex-flags-preview">当前模式：/{{ regexPattern || '...' }}/{{ selectedRegexFlags || '(无)' }}</p>
    </div>
    <div class="mb-4">
      <label class="block mb-1">文本</label>
      <textarea v-model="textInput" class="form-input form-input-xl" placeholder="输入用于匹配的文本..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="testRegex">测试</button>
      <button class="btn btn-secondary" @click="clearRegex">清除</button>
    </div>
    <ResultBox label="匹配结果" :value="output" lg />
  </div>

  <div v-else-if="toolId === 'code-format' || toolId === 'code-minify'">
    <ToolPageTitle :title="toolId === 'code-format' ? '代码格式化' : '代码压缩'" />
    <p class="mb-4 text-gray-500">{{ toolId === 'code-format' ? '格式化 JSON / HTML / CSS' : '压缩 JS / CSS / HTML / JSON' }}</p>
    <div class="mb-4">
      <label class="block mb-1">语言</label>
      <select v-model="language" class="form-input">
        <option v-for="option in languageOptions" :key="option" :value="option">{{ option.toUpperCase() }}</option>
      </select>
    </div>
    <div class="mb-4">
      <label class="block mb-1">代码</label>
      <textarea v-model="textInput" class="form-input form-input-xl" placeholder="粘贴代码..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="runCodeTool">{{ toolId === 'code-format' ? '格式化' : '压缩' }}</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <div v-else-if="toolId === 'text-stats'">
    <ToolPageTitle title="文本统计" />
    <p class="mb-4 text-gray-500">统计字符、字母、数字等信息</p>
    <div class="mb-4">
      <label class="block mb-1">文本</label>
      <textarea v-model="textInput" class="form-input form-input-xl" placeholder="粘贴文本..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="calcStats">分析</button>
    <ResultBox label="结果" :value="output" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { caseConvert, timeInterval } from '../../utils/basic-tools.js'
import { formatCode, minifyCode } from '../../utils/code-tools.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const browserWindow = typeof window !== 'undefined' ? window : null

const props = defineProps({ toolId: { type: String, required: true } })
const output = ref('')
const nowInfo = ref('加载中...')
const timestampInput = ref('')
const dateInput = ref('')
const startTime = ref('')
const endTime = ref('')
const textInput = ref('')
const regexPattern = ref('')
const regexFlags = reactive({ global: true, ignoreCase: false, multiline: true, dotAll: false, unicode: false })
const language = ref('json')
// let timer = null

const languageOptions = computed(() => props.toolId === 'code-format' ? ['json', 'html', 'css'] : ['json', 'html', 'css', 'js'])
const regexFlagOptions = [
  { key: 'global', code: 'g', label: '全局匹配' },
  { key: 'ignoreCase', code: 'i', label: '忽略大小写' },
  { key: 'multiline', code: 'm', label: '多行 ^ $' },
  { key: 'dotAll', code: 's', label: '点号匹配换行' },
  { key: 'unicode', code: 'u', label: 'Unicode 模式' },
]
const selectedRegexFlags = computed(() => regexFlagOptions.filter((flag) => regexFlags[flag.key]).map((flag) => flag.code).join(''))

function tick() {
  const now = Date.now()
  nowInfo.value = `秒级时间戳: ${Math.floor(now / 1000)}\n毫秒时间戳: ${now}\nISO: ${new Date(now).toISOString()}`
}
function convertTimestamp() {
  const value = timestampInput.value.trim()
  if (!value) return output.value = '请输入时间戳'
  const date = new Date(value.length <= 10 ? Number(value) * 1000 : Number(value))
  output.value = Number.isNaN(date.getTime()) ? '无效的时间戳' : `本地时间: ${date.toLocaleString()}\nUTC: ${date.toUTCString()}\nISO: ${date.toISOString()}`
}
function reverseTimestamp() {
  if (!dateInput.value) return output.value = '请输入日期'
  const date = new Date(dateInput.value)
  output.value = Number.isNaN(date.getTime()) ? '无效的日期格式' : `UNIX 秒: ${Math.floor(date / 1000)}\nUNIX 毫秒: ${date.getTime()}\nISO: ${date.toISOString()}`
}
function calcInterval() {
  const start = new Date(startTime.value)
  const end = new Date(endTime.value)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return output.value = '请输入有效日期'
  const result = timeInterval(start, end)
  output.value = `毫秒: ${result.ms}\n秒: ${result.seconds.toFixed(2)}\n分钟: ${result.minutes.toFixed(2)}\n小时: ${result.hours.toFixed(2)}\n天: ${result.days.toFixed(2)}\n周: ${result.weeks.toFixed(2)}\n月: ${result.months.toFixed(2)}\n年: ${result.years.toFixed(2)}`
}
function useNow(isStart) {
  const now = new Date()
  now.setMilliseconds(0)
  if (isStart) {
    startTime.value = now.toISOString().slice(0, 19)
  } else {
    endTime.value = now.toISOString().slice(0, 19)
  }
}
function convertCase() {
  if (!textInput.value) return output.value = '请输入文本'
  output.value = `camelCase:  ${caseConvert(textInput.value, 'camel')}\nPascalCase: ${caseConvert(textInput.value, 'pascal')}\nsnake_case: ${caseConvert(textInput.value, 'snake')}\nkebab-case: ${caseConvert(textInput.value, 'kebab')}\nUPPER_CASE: ${caseConvert(textInput.value, 'upper')}\nlower case: ${caseConvert(textInput.value, 'lower')}\nTitle Case: ${caseConvert(textInput.value, 'title')}`
}
function formatJson() {
  try { output.value = JSON.stringify(JSON.parse(textInput.value), null, 2) } catch (error) { output.value = 'JSON 错误: ' + error.message }
}
function minifyJson() {
  try { output.value = JSON.stringify(JSON.parse(textInput.value)) } catch (error) { output.value = 'JSON 错误: ' + error.message }
}
function testRegex() {
  if (!regexPattern.value) return output.value = '请输入正则表达式'
  try {
    const flags = selectedRegexFlags.value
    const re = new RegExp(regexPattern.value, flags)
    if (regexFlags.global) {
      const matches = [...textInput.value.matchAll(re)]
      output.value = matches.length === 0
        ? '无匹配'
        : matches.map((match, index) => `[${index}] pos ${match.index}: "${match[0]}"${match.length > 1 ? ' groups: ' + match.slice(1).map((group, groupIndex) => '$' + (groupIndex + 1) + '=' + (group ?? '(nil)')).join(', ') : ''}`).join('\n')
      return
    }
    const match = re.exec(textInput.value)
    output.value = !match
      ? '无匹配'
      : `[0] pos ${match.index}: "${match[0]}"${match.length > 1 ? ' groups: ' + match.slice(1).map((group, groupIndex) => '$' + (groupIndex + 1) + '=' + (group ?? '(nil)')).join(', ') : ''}`
  } catch (error) {
    output.value = 'Regex 错误: ' + error.message
  }
}
function clearRegex() {
  regexPattern.value = ''
  regexFlags.global = true
  regexFlags.ignoreCase = false
  regexFlags.multiline = true
  regexFlags.dotAll = false
  regexFlags.unicode = false
  textInput.value = ''
  output.value = '已清除'
}
async function runCodeTool() {
  output.value = props.toolId === 'code-format'
    ? await formatCode(textInput.value, language.value)
    : await minifyCode(textInput.value, language.value)
}
function calcStats() {
  const text = textInput.value
  if (!text) return output.value = '请输入文本'
  const chars = text.length
  const letters = (text.match(/[a-zA-Z]/g) || []).length
  const digits = (text.match(/\d/g) || []).length
  const spaces = (text.match(/\s/g) || []).length
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const punct = (text.match(/[，。！？、；：""''（）【】《》.,!?;:'"()\[\]{}]/g) || []).length
  output.value = `总字符: ${chars}\n字母: ${letters}\n数字: ${digits}\n空白: ${spaces}\nCJK: ${cjk}\n标点: ${punct}\n其他: ${chars - letters - digits - spaces - cjk - punct}`
}

onMounted(() => {
  if (props.toolId === 'timestamp') {
    tick()
    // timer = browserWindow?.setInterval(tick, 1000) ?? null
  }
})

// 当用户修改相关输入或选项时，清空上次结果，避免展示过时输出
useClearOnInput([timestampInput, dateInput], () => { output.value = '' })
useClearOnInput([startTime, endTime], () => { output.value = '' })
useClearOnInput([textInput], () => { output.value = '' })
useClearOnInput([regexPattern, () => regexFlags.global, () => regexFlags.ignoreCase, () => regexFlags.multiline, () => regexFlags.dotAll, () => regexFlags.unicode], () => { output.value = '' })
useClearOnInput([language], () => { output.value = '' })

onBeforeUnmount(() => {
  // if (timer) browserWindow?.clearInterval(timer)
})
</script>

<style scoped>

.interval-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .interval-grid {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.field-title {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
}

.field-now-btn {
  height: 1.75rem;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  background: color-mix(in oklch, var(--card), var(--background) 15%);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--muted-foreground);
}

.regex-flag-code {
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.regex-flags-preview {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}
</style>
