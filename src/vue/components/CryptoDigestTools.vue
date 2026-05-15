<template>
  <div>
    <ToolPageTitle :title="title" />
    <p class="mb-4 text-gray-500">{{ resolvedDescription }}</p>

    <div v-if="showSecurityRisk" class="security-risk-banner mb-4" role="note" aria-live="polite">
      <TriangleAlert class="security-risk-icon" :size="18" :stroke-width="2.2" />
      <div class="security-risk-content">
        <p class="security-risk-title">安全风险提示</p>
        <p class="security-risk-text">{{ securityRiskSummary }}</p>
      </div>
    </div>

    <div v-if="toolId === 'hash' || toolId === 'sha' || toolId === 'hmac'" class="check-row mb-4">
      <label v-for="option in algorithmOptions" :key="option.value" class="check-label">
        <input type="checkbox" :value="option.value" v-model="selectedAlgorithms" />
        <span>{{ option.label }}</span>
      </label>
    </div>

    <div v-if="toolId === 'hmac'" class="grid gap-4 mb-4 md:grid-cols-3">
      <div>
        <label class="field-label">
          <span class="field-label-text">模式</span>
        </label>
        <select v-model="macMode" class="form-input">
          <option value="generate">生成 MAC</option>
          <option value="verify">校验 MAC</option>
        </select>
      </div>
      <div>
        <label class="field-label">
          <span class="field-label-text">消息编码</span>
        </label>
        <select v-model="inputEncoding" class="form-input">
          <option value="utf8">UTF-8 文本</option>
          <option value="hex">Hex 字节</option>
        </select>
      </div>
      <div>
        <label class="field-label">
          <span class="field-label-text">密钥编码</span>
        </label>
        <select v-model="keyEncoding" class="form-input">
          <option value="hex">Hex 字节</option>
          <option value="utf8">UTF-8 文本</option>
        </select>
      </div>
    </div>

    <div v-if="toolId === 'hmac'" class="mb-4">
      <label class="field-label">
        <span class="field-label-text">密钥</span>
        <span class="field-label-hint">{{ macKeyHint }}</span>
      </label>
      <div class="flex items-center gap-2">
        <input v-model="key" class="form-input flex-1" :placeholder="keyPlaceholder" />
        <button type="button" class="btn btn-outline btn-sm" @click="generateHmacKey">生成</button>
      </div>
    </div>

    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="input" class="form-input form-input-lg" :placeholder="inputPlaceholder"></textarea>
    </div>

    <div v-if="toolId === 'hmac' && macMode === 'verify'" class="mb-4">
      <label class="field-label">
        <span class="field-label-text">待校验 MAC</span>
        <span class="field-label-hint">Hex 字符串</span>
      </label>
      <input v-model="expectedTag" class="form-input" placeholder="输入待校验的 MAC 值" />
    </div>

    <button class="btn btn-primary btn-block mb-2" :disabled="loading" @click="run">{{ buttonLabel }}</button>

    <div class="tag-row mb-4" v-show="showFormats">
      <span class="tag" :class="{ active: format === 'hex' }" @click="format = 'hex'">Hex</span>
      <span class="tag" :class="{ active: format === 'b64' }" @click="format = 'b64'">Base64</span>
      <span class="tag" :class="{ active: format === 'raw' }" @click="format = 'raw'">二进制</span>
    </div>

    <ResultBox :label="outputLabel" :value="output" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { hexToBase64, hexToBin } from '../../utils/encoding-tools.js'
import * as cr from '../../utils/crypto-utils.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const props = defineProps({
  toolId: { type: String, required: true },
  initialAlgorithm: { type: String, default: 'sha256' },
})

function getInitialSelectedAlgorithms(toolId, initialAlgorithm) {
  if (toolId === 'hmac') return [`hmac-${initialAlgorithm || 'sha256'}`]
  return [initialAlgorithm || 'sha256']
}

const HASH_TOOL_META = {
  md5: {
    algorithm: 'md5',
    title: 'MD5 哈希',
    description: '计算 MD5 消息摘要，输出 128-bit 结果',
    buttonLabel: '计算 MD5',
  },
  sha1: {
    algorithm: 'sha1',
    title: 'SHA-1 哈希',
    description: '计算 SHA-1 消息摘要，输出 160-bit 结果',
    buttonLabel: '计算 SHA-1',
  },
  sha256: {
    algorithm: 'sha256',
    title: 'SHA-256 哈希',
    description: '计算 SHA-256 消息摘要，输出 256-bit 结果',
    buttonLabel: '计算 SHA-256',
  },
  sha384: {
    algorithm: 'sha384',
    title: 'SHA-384 哈希',
    description: '计算 SHA-384 消息摘要',
    buttonLabel: '计算 SHA-384',
  },
  sha512: {
    algorithm: 'sha512',
    title: 'SHA-512 哈希',
    description: '计算 SHA-512 消息摘要',
    buttonLabel: '计算 SHA-512',
  },
  sm3: {
    algorithm: 'sm3',
    title: 'SM3 哈希',
    description: 'GB/T 32905-2016 SM3 哈希，256-bit 输出',
    buttonLabel: '计算 SM3',
  },
}

const INSECURE_ALGORITHM_META = {
  md5: 'MD5 已被证明可构造碰撞，不可用于签名或安全完整性校验。',
  sha1: 'SHA-1 已存在公开碰撞攻击，不可用于证书签名和安全校验。',
}

const isGenericHash = computed(() => props.toolId === 'hash')
const isShaTool = computed(() => props.toolId === 'sha')
const hashToolMeta = computed(() => HASH_TOOL_META[props.toolId] || null)
const isFixedHashTool = computed(() => Boolean(hashToolMeta.value))
const isHashTool = computed(() => isGenericHash.value || isShaTool.value || isFixedHashTool.value)
const resolvedHashAlgorithm = computed(() => hashToolMeta.value?.algorithm || algorithm.value)

const input = ref('')
const key = ref('')
const expectedTag = ref('')
const algorithm = ref(props.initialAlgorithm)
// 支持多选算法（复选框）
const selectedAlgorithms = ref(hashToolMeta.value?.algorithm ? [hashToolMeta.value.algorithm] : getInitialSelectedAlgorithms(props.toolId, props.initialAlgorithm))
const loading = ref(false)
const lastHex = ref('')
const format = ref('hex')
const showFormats = ref(false)
const macMode = ref('generate')
const keyEncoding = ref('hex')
const inputEncoding = ref('utf8')

const HMAC_KEY_HINT = '建议 32-64 位 Hex'

// 在用户修改主输入或密钥时清空旧结果（但不对复选算法清空）
useClearOnInput([input, key, expectedTag, macMode, keyEncoding, inputEncoding], () => {
  lastHex.value = ''
  showFormats.value = false
})

function fillRandomBytes(bytes) {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return bytes
  }
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
  return bytes
}

function randomHex(byteLength) {
  const bytes = fillRandomBytes(new Uint8Array(byteLength))
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

function generateHmacKey() {
  keyEncoding.value = 'hex'
  key.value = randomHex(selectedAlgorithms.value.includes('aes-cmac') ? 16 : 32)
}

function isHexRange(value, minLength, maxLength) {
  return typeof value === 'string' && value.length >= minLength && value.length <= maxLength && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value)
}

function isEvenHex(value) {
  return typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value)
}

function isAesCmacHexKey(value) {
  return /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{48}|[0-9a-fA-F]{64})$/.test(value)
}

function isAesCmacUtf8Key(value) {
  return [16, 24, 32].includes(new TextEncoder().encode(String(value || '')).length)
}

function normalizeHex(value) {
  return String(value || '').replace(/\s+/g, '')
}

async function runMac(algorithm, currentKey, text) {
  return cr.macAuto(algorithm, currentKey, text, { keyEncoding: keyEncoding.value, inputEncoding: inputEncoding.value })
}

async function verifyMac(algorithm, currentKey, text, tag) {
  return cr.macVerifyAuto(algorithm, currentKey, text, tag, { keyEncoding: keyEncoding.value, inputEncoding: inputEncoding.value })
}

const title = computed(() => hashToolMeta.value?.title || ({ hash: '哈希计算', sha: 'SHA 哈希', hmac: 'MAC 认证' }[props.toolId]))
const description = computed(() => ({
  hash: '计算消息摘要：MD5 / SHA-1 / SHA-256 / SHA-512 / SM3',
  sha: '在 SHA-1 / SHA-256 / SHA-384 / SHA-512 之间切换计算消息摘要',
  hmac: '支持 HMAC-SHA / HMAC-SM3 / AES-CMAC，提供生成与校验能力',
}[props.toolId]))
const resolvedDescription = computed(() => hashToolMeta.value?.description || description.value)
const insecureAlgorithms = computed(() => {
  const insecureKeys = Object.keys(INSECURE_ALGORITHM_META)
  if (isFixedHashTool.value) {
    const current = resolvedHashAlgorithm.value
    return insecureKeys.includes(current) ? [current] : []
  }
  return Array.from(new Set(selectedAlgorithms.value
    .map((value) => value.startsWith('hmac-') ? value.slice(5) : value)
    .filter((value) => insecureKeys.includes(value))))
})
const showSecurityRisk = computed(() => insecureAlgorithms.value.length > 0)
const securityRiskSummary = computed(() => {
  if (!insecureAlgorithms.value.length) return ''
  const labels = insecureAlgorithms.value.map((value) => value.toUpperCase()).join('、')
  const details = insecureAlgorithms.value.map((value) => INSECURE_ALGORITHM_META[value]).join(' ')
  return `当前选择包含 ${labels}。${details} 如需 MAC，建议优先使用 HMAC-SHA256 / HMAC-SHA512 / HMAC-SM3 / AES-CMAC。`
})
const buttonLabel = computed(() => hashToolMeta.value?.buttonLabel || ({ hash: '计算', sha: '计算 SHA', hmac: macMode.value === 'verify' ? '校验 MAC' : '生成 MAC' }[props.toolId]))
const outputLabel = computed(() => (props.toolId === 'hmac' ? (macMode.value === 'verify' ? '校验结果' : 'MAC') : '摘要'))
const macKeyHint = computed(() => {
  if (keyEncoding.value === 'utf8') {
    return selectedAlgorithms.value.includes('aes-cmac') ? 'AES-CMAC 需 16/24/32 字节 UTF-8 密钥' : '任意 UTF-8 文本密钥'
  }
  return selectedAlgorithms.value.includes('aes-cmac') ? 'AES-CMAC 需 32/48/64 位 Hex' : HMAC_KEY_HINT
})
const keyPlaceholder = computed(() => keyEncoding.value === 'utf8' ? '输入 UTF-8 密钥' : '输入 Hex 密钥')
const inputPlaceholder = computed(() => {
  if (props.toolId === 'hmac') {
    return inputEncoding.value === 'hex' ? '输入待计算消息的 Hex 字节' : '输入待计算消息文本'
  }
  return '粘贴文本...'
})
const algorithmOptions = computed(() => {
  if (isShaTool.value) {
    return [
      { value: 'sha1', label: 'SHA-1 (160-bit)' },
      { value: 'sha256', label: 'SHA-256' },
      { value: 'sha384', label: 'SHA-384' },
      { value: 'sha512', label: 'SHA-512' },
    ]
  }
  if (isGenericHash.value) {
    return [
      { value: 'md5', label: 'MD5 (128-bit)' },
      { value: 'sha1', label: 'SHA-1 (160-bit)' },
      { value: 'sha256', label: 'SHA-256 (256-bit)' },
      { value: 'sha384', label: 'SHA-384' },
      { value: 'sha512', label: 'SHA-512' },
      { value: 'sm3', label: 'SM3 (256-bit，国密标准)' },
    ]
  }
  return [
    { value: 'hmac-sha256', label: 'HMAC-SHA256' },
    { value: 'hmac-sha384', label: 'HMAC-SHA384' },
    { value: 'hmac-sha512', label: 'HMAC-SHA512' },
    { value: 'hmac-sha1', label: 'HMAC-SHA1' },
    { value: 'hmac-md5', label: 'HMAC-MD5' },
    { value: 'hmac-sm3', label: 'HMAC-SM3' },
    { value: 'aes-cmac', label: 'AES-CMAC' },
  ]
})
const output = computed(() => {
  if (!showFormats.value) return lastHex.value
  // 支持多结果（数组）或单一字符串
  if (Array.isArray(lastHex.value)) {
    return lastHex.value
      .map(item => `${item.label.replace(/\s*\(.*\)$/, '')}：${format.value === 'hex' ? item.hex : format.value === 'b64' ? hexToBase64(item.hex) : hexToBin(item.hex)}`)
      .join('\n')
  }
  if (format.value === 'hex') return lastHex.value
  if (format.value === 'b64') return hexToBase64(lastHex.value)
  return hexToBin(lastHex.value)
})

// 不在切换复选框时清空结果：仅在需要时手动清理（例如输入变更）

async function run() {
  const message = input.value
  if (!String(message || '').trim()) {
    lastHex.value = props.toolId === 'hmac' ? '请输入消息内容' : '请输入文本'
    showFormats.value = false
    return
  }
  const normalizedKey = keyEncoding.value === 'hex' ? normalizeHex(key.value).toLowerCase() : String(key.value || '')
  if (props.toolId === 'hmac' && !normalizedKey) {
    lastHex.value = '请输入密钥'
    showFormats.value = false
    return
  }
  if (props.toolId === 'hmac' && inputEncoding.value === 'hex' && !isEvenHex(normalizeHex(message))) {
    lastHex.value = '消息 Hex 输入应为偶数位且仅包含 0-9a-f'
    showFormats.value = false
    return
  }
  if (props.toolId === 'hmac' && keyEncoding.value === 'hex' && !isEvenHex(normalizedKey)) {
    lastHex.value = '密钥 Hex 输入应为偶数位且仅包含 0-9a-f'
    showFormats.value = false
    return
  }
  if (props.toolId === 'hmac' && selectedAlgorithms.value.includes('aes-cmac')) {
    const keyOk = keyEncoding.value === 'hex' ? isAesCmacHexKey(normalizedKey) : isAesCmacUtf8Key(normalizedKey)
    if (!keyOk) {
      lastHex.value = `密钥应为 ${macKeyHint.value}`
      showFormats.value = false
      return
    }
  } else if (props.toolId === 'hmac' && keyEncoding.value === 'hex' && !isHexRange(normalizedKey, 2, 4096)) {
    lastHex.value = '密钥 Hex 输入不能为空，且应为偶数位'
    showFormats.value = false
    return
  }
  if (props.toolId === 'hmac' && macMode.value === 'verify' && !isEvenHex(normalizeHex(expectedTag.value))) {
    lastHex.value = '待校验 MAC 必须是偶数位 Hex 字符串'
    showFormats.value = false
    return
  }
  if (!selectedAlgorithms.value || selectedAlgorithms.value.length === 0) {
    lastHex.value = '请选择至少一个算法'
    showFormats.value = false
    return
  }
  loading.value = true
  try {
    if (isHashTool.value || props.toolId === 'hmac') {
      const results = []
      for (const algo of selectedAlgorithms.value) {
        let hex = ''
        if (props.toolId === 'hmac') {
          if (macMode.value === 'verify') {
            hex = await verifyMac(algo, normalizedKey, message, expectedTag.value)
            const label = algorithmOptions.value.find(opt => opt.value === algo)?.label || algo
            results.push(`${label}：${hex}`)
            continue
          }
          hex = await runMac(algo, normalizedKey, message)
          if (!hex) hex = `错误：不支持的 MAC 算法 ${algo}`
        } else {
          hex = algo === 'sm3' ? cr.sm3(message) : await cr.hash(algo, message)
        }
        const label = algorithmOptions.value.find(opt => opt.value === algo)?.label || algo
        results.push({ label, hex })
      }
      if (props.toolId === 'hmac' && macMode.value === 'verify') {
        lastHex.value = results.join('\n')
        showFormats.value = false
        return
      }
      lastHex.value = results.length === 1 ? results[0].hex : results
    }
    format.value = 'hex'
    showFormats.value = true
  } catch (error) {
    lastHex.value = `计算失败：${error?.message || '未知错误'}`
    showFormats.value = false
  } finally {
    loading.value = false
  }
}
</script>

