<template>
  <div>
    <ToolPageTitle title="RSA 加解密" />
    <p class="mb-4 text-gray-500">非对称加密：公钥加密，私钥解密</p>
    <Field label="密钥长度"><select v-model="rsa.bits" class="form-input"><option value="1024">1024-bit</option><option value="2048">2048-bit</option><option value="4096">4096-bit</option></select></Field>
    <Field label="加密方案"><select v-model="rsa.encryptScheme" class="form-input"><option value="oaep-sha256">RSA-OAEP / SHA-256</option><option value="oaep-sha1">RSA-OAEP / SHA-1</option><option value="pkcs1v15">PKCS#1 v1.5</option></select></Field>
    <Field label="签名方案"><select v-model="rsa.signScheme" class="form-input"><option value="pkcs1-sha256">PKCS#1 v1.5 / SHA-256</option><option value="pss-sha256">RSA-PSS / SHA-256（saltLength = 32）</option></select></Field>
    <Field label="输入编码"><select v-model="rsa.inputEncoding" class="form-input"><option value="utf8">UTF-8 文本</option><option value="hex">Hex 字节</option></select></Field>
    <button class="btn btn-primary btn-block mb-4" :disabled="rsa.loading" @click="generateRsa">
      <Loader2 v-if="rsa.loading" :size="16" :stroke-width="2.2" class="rsa-button-loader" />
      <span>{{ rsa.loading ? '生成中...' : '生成密钥对' }}</span>
    </button>
    <Field label="公钥" hint="PEM，长度随位数变化"><textarea v-model="rsa.publicKey" class="form-input form-input-sm" placeholder="点击生成"></textarea></Field>
    <Field label="私钥" hint="生成结果为 PEM；输入也支持 PEM / Base64 DER / Hex DER"><textarea v-model="rsa.privateKey" class="form-input form-input-sm" placeholder="点击生成或粘贴私钥数据"></textarea></Field>
    <Field label="私钥数据格式" hint="用于“解析私钥”功能"><select v-model="rsa.privateKeyFormat" class="form-input"><option value="pem">PEM</option><option value="base64">Base64 DER</option><option value="hex">Hex DER</option></select></Field>
    <button class="btn btn-secondary btn-block mb-4" @click="runRsaParsePrivateKey">解析私钥</button>
    <Field label="签名" hint="Hex 字符串"><textarea v-model="rsa.signature" class="form-input form-input-sm" placeholder="粘贴待验签名"></textarea></Field>
    <Field label="内容"><textarea v-model="rsa.input" class="form-input form-input-lg" placeholder="加密：明文 | 解密：Hex 密文"></textarea></Field>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runRsaEncrypt">加密</button><button class="btn btn-secondary" @click="runRsaDecrypt">解密</button></div>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runRsaSign">签名</button><button class="btn btn-secondary" @click="runRsaVerify">验签</button></div>
    <FormatTabs v-if="rsa.lastIsEnc" v-model="rsa.format" />
    <FormatTabs v-else-if="isHexOutput(rsa.last)" v-model="rsa.resultFormat" mode="text" />
    <ResultBox label="结果" :value="rsaOutput" lg />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import * as crHeavy from '../../utils/crypto-worker.js'
import Field from './shared/ToolField.vue'
import FormatTabs from './shared/FormatTabs.vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import { formatFromBase64, formatFromTextHex, isConvertError, isEvenHex, isHexOutput, parseCipherHexToBase64 } from './shared/cipher-helpers.js'

const rsa = reactive({ bits: '2048', encryptScheme: 'oaep-sha256', signScheme: 'pkcs1-sha256', inputEncoding: 'utf8', publicKey: '', privateKey: '', privateKeyFormat: 'pem', signature: '', input: '', last: '', lastIsEnc: false, format: 'hex', resultFormat: 'hex', loading: false, parsedPrivateKey: null })
const rsaOutput = computed(() => {
  if (rsa.parsedPrivateKey) return formatParsedPrivateKeyResult(rsa.parsedPrivateKey)
  return rsa.lastIsEnc ? formatFromBase64(rsa.last, rsa.format) : formatFromTextHex(rsa.last, rsa.resultFormat)
})

function isRsaFailureMessage(value) {
  return typeof value === 'string' && value.startsWith('RSA 加密失败：')
}

async function generateRsa() {
  if (rsa.loading) return
  rsa.loading = true
  try {
    const result = await crHeavy.rsaGenerateKey(rsa.bits)
    if (result.error) return rsa.last = result.error
    rsa.parsedPrivateKey = null
    rsa.publicKey = result.publicKey
    rsa.privateKey = result.privateKey
    rsa.last = '密钥对已生成'
  } finally {
    rsa.loading = false
  }
}

async function runRsaEncrypt() {
  if (!rsa.publicKey) return rsa.last = '请生成或粘贴公钥'
  if (!rsa.input) return rsa.last = '请输入内容'
  if (rsa.inputEncoding === 'hex' && !isEvenHex(rsa.input.replace(/\s+/g, ''))) return rsa.last = 'Hex 输入应为偶数位且仅包含 0-9a-f'
  rsa.parsedPrivateKey = null
  const result = await crHeavy.rsaEncrypt(rsa.input, rsa.publicKey, { plainEncoding: rsa.inputEncoding, encryptScheme: rsa.encryptScheme })
  rsa.last = result
  rsa.lastIsEnc = !isRsaFailureMessage(result)
}

async function runRsaDecrypt() {
  if (!rsa.privateKey) return rsa.last = '请生成或粘贴私钥'
  if (!rsa.input) return rsa.last = '请输入密文'
  const value = parseCipherHexToBase64(rsa.input)
  if (isConvertError(value)) return rsa.last = value
  rsa.parsedPrivateKey = null
  rsa.last = await crHeavy.rsaDecrypt(value, rsa.privateKey, { encryptScheme: rsa.encryptScheme })
  rsa.lastIsEnc = false
}

async function runRsaSign() {
  if (!rsa.privateKey || !rsa.input) return rsa.last = '请先输入私钥和内容'
  if (rsa.inputEncoding === 'hex' && !isEvenHex(rsa.input.replace(/\s+/g, ''))) return rsa.last = 'Hex 输入应为偶数位且仅包含 0-9a-f'
  rsa.parsedPrivateKey = null
  rsa.signature = await crHeavy.rsaSign(rsa.input, rsa.privateKey, { inputEncoding: rsa.inputEncoding, signScheme: rsa.signScheme })
  rsa.last = rsa.signature
  rsa.lastIsEnc = false
}

async function runRsaVerify() {
  if (!rsa.publicKey || !rsa.input || !rsa.signature) return rsa.last = '请填写公钥、内容和签名'
  if (rsa.inputEncoding === 'hex' && !isEvenHex(rsa.input.replace(/\s+/g, ''))) return rsa.last = 'Hex 输入应为偶数位且仅包含 0-9a-f'
  rsa.parsedPrivateKey = null
  rsa.last = await crHeavy.rsaVerify(rsa.input, rsa.signature, rsa.publicKey, { inputEncoding: rsa.inputEncoding, signScheme: rsa.signScheme })
  rsa.lastIsEnc = false
}

async function runRsaParsePrivateKey() {
  if (!rsa.privateKey) return rsa.last = '请粘贴待解析私钥'
  const result = await crHeavy.rsaParsePrivateKey(rsa.privateKey, { inputFormat: rsa.privateKeyFormat })
  if (result?.error) {
    rsa.parsedPrivateKey = null
    rsa.last = result.error
    rsa.lastIsEnc = false
    return
  }
  rsa.parsedPrivateKey = result
  rsa.last = ''
  rsa.lastIsEnc = false
}

function formatParsedPrivateKeyResult(result) {
  const lines = []
  const summary = result.summary || {}
  const key = result.key || {}
  const publicKey = result.publicKey || {}
  const components = result.components || {}

  lines.push(summary.encrypted ? 'RSA 私钥解析结果（已加密）' : 'RSA 私钥解析结果')
  lines.push(`输入格式: ${summary.inputFormat || '-'}`)
  if (summary.pemLabel) lines.push(`PEM 标签: ${summary.pemLabel}`)
  lines.push(`封装格式: ${summary.container || '-'}`)
  lines.push(`算法: ${summary.algorithm || '-'}`)
  lines.push(`是否加密: ${summary.encrypted ? '是' : '否'}`)
  lines.push(`DER 长度: ${summary.derLength || 0} 字节`)
  if (summary.derSha256) lines.push(`DER SHA-256: ${summary.derSha256}`)
  if (summary.derSha1) lines.push(`DER SHA-1: ${summary.derSha1}`)
  if (summary.pkcs1Version !== null && summary.pkcs1Version !== undefined) {
    lines.push(`PKCS#1 版本: ${summary.pkcs1Version}${summary.multiPrime ? '（多素数 RSA）' : ''}`)
  }

  if (result.message) {
    lines.push('')
    lines.push(result.message)
  }

  if (summary.encrypted) return lines.join('\n')

  lines.push('')
  lines.push('密钥概要')
  lines.push(`模数位数: ${key.modulusBits || 0}`)
  lines.push(`模数字节数: ${key.modulusBytes || 0}`)
  lines.push(`公钥指数: ${key.publicExponent || '-'} (0x${key.publicExponentHex || '-'})`)
  lines.push(`私钥指数位数: ${key.privateExponentBits || 0}`)
  lines.push(`质因子 p 位数: ${key.prime1Bits || 0}`)
  lines.push(`质因子 q 位数: ${key.prime2Bits || 0}`)

  if (publicKey.pem) {
    lines.push('')
    lines.push('对应公钥 PEM')
    lines.push(publicKey.pem)
    if (publicKey.sha256) lines.push(`公钥 SHA-256: ${publicKey.sha256}`)
    if (publicKey.sha1) lines.push(`公钥 SHA-1: ${publicKey.sha1}`)
  }

  lines.push('')
  lines.push('RSA 参数')
  lines.push(formatComponentLine('n', components.n))
  lines.push(formatComponentLine('d', components.d))
  lines.push(formatComponentLine('p', components.p))
  lines.push(formatComponentLine('q', components.q))
  lines.push(formatComponentLine('dP', components.dP))
  lines.push(formatComponentLine('dQ', components.dQ))
  lines.push(formatComponentLine('qInv', components.qInv))
  return lines.join('\n')
}

function formatComponentLine(label, component) {
  if (!component) return `${label}: -`
  return `${label} (${component.bits} bits / ${component.bytes} bytes):\n${component.hex}`
}

useClearOnInput([
  () => rsa.bits,
  () => rsa.encryptScheme,
  () => rsa.signScheme,
  () => rsa.inputEncoding,
  () => rsa.publicKey,
  () => rsa.privateKey,
  () => rsa.privateKeyFormat,
  () => rsa.signature,
  () => rsa.input,
], () => {
  rsa.parsedPrivateKey = null
  rsa.last = ''
  rsa.lastIsEnc = false
})
</script>