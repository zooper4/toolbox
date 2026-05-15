<template>
  <div v-if="toolId === 'base'">
    <ToolPageTitle title="Base 编解码" />
    <p class="mb-4 text-gray-500">在 Base64、Base32、Base58 之间切换编解码类型。切换类型时保留输入内容并清空结果。</p>

    <div class="mb-4">
      <label class="block mb-1">类型</label>
      <select v-model="baseVariant" class="form-input">
        <option value="base64">Base64</option>
        <option value="base32">Base32</option>
        <option value="base58">Base58</option>
      </select>
    </div>

    <div v-if="baseVariant === 'base64'" class="mb-4">
      <label class="block mb-1">模式</label>
      <select v-model="base64Mode" class="form-input">
        <option value="standard">标准</option>
        <option value="urlsafe">URL 安全</option>
      </select>
    </div>

    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="baseInput" class="form-input form-input-lg" placeholder="粘贴内容..."></textarea>
    </div>

    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="runBase(true)">编码</button>
      <button class="btn btn-secondary" @click="runBase(false)">解码</button>
    </div>

    <ResultBox label="输出" :value="baseOutput" />
  </div>

  <component v-else-if="delegatedComponent" :is="delegatedComponent" />

  <div v-else-if="toolId === 'jwt'">
    <ToolPageTitle title="JWT 结构编解码" />
    <p class="mb-4 text-gray-500">JWT JSON 结构和 JWT Token 互转。header 和 payload 仅做 Base64URL 编解码，`signature` 字段会作为第三段原样保留。</p>

    <div class="jwt-field mb-4">
      <label class="block">JWT JSON</label>
      <div class="jwt-input-shell">
        <button
          class="jwt-copy-button"
          type="button"
          :disabled="!canCopyJwtJson"
          :title="jwtJsonCopyTitle"
          @click="copyJwtJson"
        >
          <Check v-if="jwtJsonCopyState === 'success'" :size="14" stroke-width="2" />
          <Copy v-else :size="14" stroke-width="2" />
        </button>
        <textarea v-model="jwtJsonInput" class="form-input jwt-structure-textarea" placeholder='{"header":{"alg":"none","typ":"JWT"},"payload":{"sub":"1234567890"},"signature":""}'></textarea>
      </div>
    </div>

    <div class="jwt-actions mb-4">
      <button class="btn btn-primary" @click="encodeJwt">编码 Token</button>
      <button class="btn btn-secondary" @click="decodeJwt">解码 Token</button>
    </div>

    <div class="jwt-field mb-4">
      <label class="block">JWT Token</label>
      <div class="jwt-input-shell">
        <button
          class="jwt-copy-button"
          type="button"
          :disabled="!canCopyJwtToken"
          :title="jwtTokenCopyTitle"
          @click="copyJwtToken"
        >
          <Check v-if="jwtTokenCopyState === 'success'" :size="14" stroke-width="2" />
          <Copy v-else :size="14" stroke-width="2" />
        </button>
        <textarea v-model="jwtTokenInput" class="form-input jwt-token-textarea" placeholder="粘贴或编辑 JWT Token..."></textarea>
      </div>
    </div>
  </div>

  <div v-else-if="toolId === 'char-escape' || toolId === 'html-entity'">
    <ToolPageTitle title="字符转义" />
    <p class="mb-4 text-gray-500">将特殊字符转义为安全格式</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="escapeInput" class="form-input form-input-lg" placeholder="粘贴文本..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="runEscape(true)">转义</button>
      <button class="btn btn-secondary" @click="runEscape(false)">反转义</button>
    </div>
    <ResultBox label="输出" :value="escapeOutput" lg />
  </div>

  <div v-else-if="toolId === 'unicode'">
    <ToolPageTitle title="Unicode 转义" />
    <p class="mb-4 text-gray-500">Unicode 码点转义序列的编码和解码</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="unicodeInput" class="form-input form-input-lg" placeholder="粘贴文本或 \uXXXX 序列..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="runUnicode(true)">编码</button>
      <button class="btn btn-secondary" @click="runUnicode(false)">解码</button>
    </div>
    <ResultBox label="输出" :value="unicodeOutput" lg />
  </div>

  <div v-else-if="toolId === 'ascii'">
    <ToolPageTitle title="ASCII / 二进制" />
    <p class="mb-4 text-gray-500">文本与二进制字符串互相转换</p>
    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="asciiInput" class="form-input form-input-lg" placeholder="粘贴文本或二进制..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="runAscii(true)">文本转二进制</button>
      <button class="btn btn-secondary" @click="runAscii(false)">二进制转文本</button>
    </div>
    <ResultBox label="输出" :value="asciiOutput" lg />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Check, Copy } from 'lucide-vue-next'
import { asciiToBin, base32Decode, base32Encode, base58Decode, base58Encode, base64Decode, base64Encode, base64UrlDecode, base64UrlEncode, binToAscii, htmlDecode, htmlEncode, jwtDecode, jwtEncode, unicodeDecode, unicodeEncode } from '../../utils/encoding-tools.js'
import EncodingUrl from './EncodingUrl.vue'
import EncodingHex from './EncodingHex.vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'

const browserWindow = typeof window !== 'undefined' ? window : null
const browserDocument = typeof document !== 'undefined' ? document : null
const browserNavigator = typeof navigator !== 'undefined' ? navigator : null

const props = defineProps({
  toolId: { type: String, required: true },
  initialBaseVariant: { type: String, default: 'base64' },
})

const delegated = {
  'url-encode': EncodingUrl,
  'hex-encode': EncodingHex,
}

const delegatedComponent = computed(() => delegated[props.toolId] || null)
const baseInput = ref('')
const baseOutput = ref('')
const baseVariant = ref(props.initialBaseVariant)
const base64Mode = ref('standard')
const jwtJsonInput = ref('')
const jwtTokenInput = ref('')
const jwtJsonCopyState = ref('idle')
const jwtTokenCopyState = ref('idle')
const escapeInput = ref('')
const escapeOutput = ref('')
const unicodeInput = ref('')
const unicodeOutput = ref('')
const asciiInput = ref('')
const asciiOutput = ref('')

const canCopyJwtJson = computed(() => jwtJsonInput.value.trim().length > 0)
const canCopyJwtToken = computed(() => jwtTokenInput.value.trim().length > 0)
const jwtJsonCopyTitle = computed(() => getCopyTitle(jwtJsonCopyState.value, canCopyJwtJson.value))
const jwtTokenCopyTitle = computed(() => getCopyTitle(jwtTokenCopyState.value, canCopyJwtToken.value))

watch(baseVariant, () => {
  baseOutput.value = ''
})

// 修改输入时清空对应输出，避免展示过时结果
useClearOnInput([baseInput, base64Mode], () => { baseOutput.value = '' })
useClearOnInput([jwtJsonInput], () => { jwtTokenInput.value = '' })
useClearOnInput([jwtTokenInput], () => { jwtJsonInput.value = '' })
useClearOnInput([escapeInput], () => { escapeOutput.value = '' })
useClearOnInput([unicodeInput], () => { unicodeOutput.value = '' })
useClearOnInput([asciiInput], () => { asciiOutput.value = '' })

watch(() => props.initialBaseVariant, (nextVariant) => {
  if (props.toolId === 'base' && nextVariant && nextVariant !== baseVariant.value) {
    baseVariant.value = nextVariant
  }
})

function runBase(enc) {
  const value = String(baseInput.value || '')
  if (!value.trim()) {
    baseOutput.value = '请输入内容'
    return
  }
  try {
    if (baseVariant.value === 'base64') {
      const urlSafe = base64Mode.value === 'urlsafe'
      baseOutput.value = enc
        ? (urlSafe ? base64UrlEncode(value) : base64Encode(value))
        : (urlSafe ? base64UrlDecode(value) : base64Decode(value))
      return
    }
    if (baseVariant.value === 'base32') {
      baseOutput.value = enc ? base32Encode(value) : base32Decode(value)
      return
    }
    baseOutput.value = enc ? base58Encode(value) : base58Decode(value)
  } catch (error) {
    baseOutput.value = `输入不合法：${error?.message || '编解码失败'}`
  }
}

function encodeJwt() {
  const jsonText = String(jwtJsonInput.value || '').trim()
  if (!jsonText) {
    jwtTokenInput.value = '错误：请输入 JWT JSON'
    return
  }
  try {
    const result = jwtEncode(jsonText)
    jwtTokenInput.value = result
  } catch (error) {
    jwtTokenInput.value = `错误：${error?.message || 'JWT 编码失败'}`
  }
}

function decodeJwt() {
  const tokenText = String(jwtTokenInput.value || '').trim()
  if (!tokenText) {
    jwtJsonInput.value = '错误：请输入 JWT Token'
    return
  }
  try {
    jwtJsonInput.value = jwtDecode(tokenText)
  } catch (error) {
    jwtJsonInput.value = `错误：${error?.message || 'JWT 解码失败'}`
  }
}

function runEscape(encode) {
  const value = String(escapeInput.value || '')
  if (!value.trim()) {
    escapeOutput.value = '请输入内容'
    return
  }
  try {
    escapeOutput.value = encode ? htmlEncode(value) : htmlDecode(value)
  } catch (error) {
    escapeOutput.value = `输入不合法：${error?.message || '字符转义失败'}`
  }
}

function runUnicode(encode) {
  const value = String(unicodeInput.value || '')
  if (!value.trim()) {
    unicodeOutput.value = '请输入内容'
    return
  }
  try {
    unicodeOutput.value = encode ? unicodeEncode(value) : unicodeDecode(value)
  } catch (error) {
    unicodeOutput.value = `输入不合法：${error?.message || 'Unicode 转换失败'}`
  }
}

function runAscii(encode) {
  const value = String(asciiInput.value || '')
  if (!value.trim()) {
    asciiOutput.value = '请输入内容'
    return
  }
  if (!encode) {
    const compact = value.replace(/\s+/g, '')
    if (!compact || /[^01]/.test(compact)) {
      asciiOutput.value = '输入不合法：仅支持 0 和 1，可包含空格分隔'
      return
    }
    if (compact.length % 8 !== 0) {
      asciiOutput.value = '输入不合法：二进制位数应为 8 的倍数'
      return
    }
  }
  try {
    const result = encode ? asciiToBin(value) : binToAscii(value)
    if (!encode && typeof result === 'string' && result.startsWith('错误：')) {
      asciiOutput.value = `输入不合法：${result.replace(/^错误：/, '')}`
      return
    }
    asciiOutput.value = result
  } catch (error) {
    asciiOutput.value = `输入不合法：${error?.message || 'ASCII 转换失败'}`
  }
}

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

function resetCopyState(target) {
  browserWindow?.setTimeout(() => {
    target.value = 'idle'
  }, 1500)
}

function getCopyTitle(state, canCopy) {
  if (!canCopy) return '没有可复制内容'
  if (state === 'success') return '已复制'
  if (state === 'error') return '复制失败'
  return '复制结果'
}

async function copyText(target, text) {
  if (!String(text || '').trim()) return
  try {
    if (browserNavigator?.clipboard?.writeText) {
      await browserNavigator.clipboard.writeText(text)
    } else if (!fallbackCopy(text)) {
      throw new Error('copy failed')
    }
    target.value = 'success'
  } catch {
    target.value = 'error'
  }
  resetCopyState(target)
}

function copyJwtJson() {
  copyText(jwtJsonCopyState, jwtJsonInput.value)
}

function copyJwtToken() {
  copyText(jwtTokenCopyState, jwtTokenInput.value)
}
</script>

<style scoped>
.jwt-field {
  display: grid;
  gap: 0.5rem;
}

.jwt-input-shell {
  position: relative;
}

.jwt-copy-button {
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

.jwt-copy-button:hover:enabled {
  color: var(--foreground);
  background: var(--accent);
}

.jwt-copy-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.jwt-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.jwt-structure-tip {
  white-space: pre-wrap;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.jwt-structure-textarea,
.jwt-token-textarea {
  min-height: 12rem;
  padding-right: 3rem;
}

@media (max-width: 640px) {
  .jwt-actions {
    grid-template-columns: 1fr;
  }
}
</style>
