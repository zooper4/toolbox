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

    <div v-if="toolId === 'hmac'" class="mb-4">
      <label class="field-label">
        <span class="field-label-text">密钥</span>
        <span class="field-label-hint">{{ HMAC_KEY_HINT }}</span>
      </label>
      <div class="flex items-center gap-2">
        <input v-model="key" class="form-input flex-1" placeholder="输入 Hex 密钥" />
        <button type="button" class="btn btn-outline btn-sm" @click="generateHmacKey">生成</button>
      </div>
    </div>

    <div class="mb-4">
      <label class="block mb-1">输入</label>
      <textarea v-model="input" class="form-input form-input-lg" placeholder="粘贴文本..."></textarea>
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
const algorithm = ref(props.initialAlgorithm)
// 支持多选算法（复选框）
const selectedAlgorithms = ref([hashToolMeta.value?.algorithm || props.initialAlgorithm])
const loading = ref(false)
const lastHex = ref('')
const format = ref('hex')
const showFormats = ref(false)

const HMAC_KEY_HINT = '建议 32-64 位 Hex'

// 在用户修改主输入或密钥时清空旧结果（但不对复选算法清空）
useClearOnInput([input, key], () => {
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
  key.value = randomHex(32)
}

function isHexRange(value, minLength, maxLength) {
  return typeof value === 'string' && value.length >= minLength && value.length <= maxLength && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value)
}

async function runHmac(algorithm, hexKey, text) {
  return cr.hmacAuto(algorithm, hexKey, text)
}

const title = computed(() => hashToolMeta.value?.title || ({ hash: '哈希计算', sha: 'SHA 哈希', hmac: 'HMAC 签名' }[props.toolId]))
const description = computed(() => ({
  hash: '计算消息摘要：MD5 / SHA-1 / SHA-256 / SHA-512 / SM3',
  sha: '在 SHA-1 / SHA-256 / SHA-384 / SHA-512 之间切换计算消息摘要',
  hmac: '带密钥的消息认证码',
}[props.toolId]))
const resolvedDescription = computed(() => hashToolMeta.value?.description || description.value)
const insecureAlgorithms = computed(() => {
  const insecureKeys = Object.keys(INSECURE_ALGORITHM_META)
  if (isFixedHashTool.value) {
    const current = resolvedHashAlgorithm.value
    return insecureKeys.includes(current) ? [current] : []
  }
  return Array.from(new Set(selectedAlgorithms.value.filter((value) => insecureKeys.includes(value))))
})
const showSecurityRisk = computed(() => insecureAlgorithms.value.length > 0)
const securityRiskSummary = computed(() => {
  if (!insecureAlgorithms.value.length) return ''
  const labels = insecureAlgorithms.value.map((value) => value.toUpperCase()).join('、')
  const details = insecureAlgorithms.value.map((value) => INSECURE_ALGORITHM_META[value]).join(' ')
  return `当前选择包含 ${labels}。${details} 建议优先使用 SHA-256 / SHA-512 或 SM3。`
})
const buttonLabel = computed(() => hashToolMeta.value?.buttonLabel || ({ hash: '计算', sha: '计算 SHA', hmac: '生成 HMAC' }[props.toolId]))
const outputLabel = computed(() => (props.toolId === 'hmac' ? '签名' : '摘要'))
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
    { value: 'sha256', label: 'HMAC-SHA256' },
    { value: 'sha1', label: 'HMAC-SHA1' },
    { value: 'sha512', label: 'HMAC-SHA512' },
    { value: 'md5', label: 'HMAC-MD5' },
    { value: 'sm3', label: 'HMAC-SM3' },
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
  const normalizedKey = String(key.value || '').trim().toLowerCase()
  if (props.toolId === 'hmac' && !normalizedKey) {
    lastHex.value = '请输入密钥'
    showFormats.value = false
    return
  }
  if (props.toolId === 'hmac' && !isHexRange(normalizedKey, 32, 64)) {
    lastHex.value = `密钥应为 ${HMAC_KEY_HINT}`
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
          hex = await runHmac(algo, normalizedKey, message)
          if (!hex) {
            hex = `错误：不支持的 HMAC 算法 ${algo}`
          }
        } else {
          hex = algo === 'sm3' ? cr.sm3(message) : await cr.hash(algo, message)
        }
        const label = algorithmOptions.value.find(opt => opt.value === algo)?.label || algo
        results.push({ label, hex })
      }
      // 如果只选了一个算法，保留兼容性为字符串，否则存数组
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

