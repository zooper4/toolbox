<template>
  <div>
    <ToolPageTitle title="DES/3DES" />
    <div class="security-risk-banner mb-4" role="note" aria-live="polite">
      <TriangleAlert class="security-risk-icon" :size="18" :stroke-width="2.2" />
      <div class="security-risk-content">
        <p class="security-risk-title">高风险算法警告</p>
        <p class="security-risk-text">DES/3DES 已无法满足现代安全要求，仅建议用于兼容旧系统或教学演示，请优先使用 AES / SM4 / ChaCha20。</p>
      </div>
    </div>
    <div class="grid gap-4">
      <Field label="模式"><select v-model="des.mode" class="form-input"><option value="des">DES（单密钥）</option><option value="3des2">3DES（双密钥）</option><option value="3des3">3DES（三密钥）</option></select></Field>
      <Field label="分组模式"><select v-model="des.blockMode" class="form-input"><option value="cbc">CBC</option><option value="ecb">ECB</option></select></Field>
      <Field label="明文编码"><select v-model="des.plainEncoding" class="form-input"><option value="utf8">UTF-8 文本</option><option value="hex">Hex 字节</option></select></Field>
      <Field label="填充"><select v-model="des.padding" class="form-input"><option value="pkcs7">PKCS#7</option><option value="none">No Padding</option></select></Field>
      <Field label="密钥 1" :hint="DES_KEY_HINT"><div class="flex items-center gap-2"><input v-model="des.key1" class="form-input flex-1" placeholder="输入 16 位 Hex" /><button type="button" class="btn btn-outline btn-sm" @click="generateDesKey('key1')">生成</button></div></Field>
      <Field v-if="des.mode !== 'des'" label="密钥 2" :hint="DES_KEY_HINT"><div class="flex items-center gap-2"><input v-model="des.key2" class="form-input flex-1" placeholder="输入 16 位 Hex" /><button type="button" class="btn btn-outline btn-sm" @click="generateDesKey('key2')">生成</button></div></Field>
      <Field v-if="des.mode === '3des3'" label="密钥 3" :hint="DES_KEY_HINT"><div class="flex items-center gap-2"><input v-model="des.key3" class="form-input flex-1" placeholder="输入 16 位 Hex" /><button type="button" class="btn btn-outline btn-sm" @click="generateDesKey('key3')">生成</button></div></Field>
      <Field v-if="des.blockMode === 'cbc'" label="IV" hint="16 位 Hex"><div class="flex items-center gap-2"><input v-model="des.iv" class="form-input flex-1" placeholder="输入 16 位 Hex" /><button type="button" class="btn btn-outline btn-sm" @click="generateDesIv">生成</button></div></Field>
      <Field label="内容"><textarea v-model="des.input" class="form-input form-input-lg" placeholder="加密：明文/Hex 字节 | 解密：Hex 密文"></textarea></Field>
    </div>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runDes(true)">加密</button><button class="btn btn-secondary" @click="runDes(false)">解密</button></div>
    <FormatTabs v-if="des.lastIsEnc" v-model="des.format" />
    <FormatTabs v-else-if="isHexOutput(des.last)" v-model="des.resultFormat" mode="text" />
    <ResultBox label="结果" :value="desOutput" />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { desDecrypt, desEncrypt } from '../../utils/crypto-aes-des.js'
import Field from './shared/ToolField.vue'
import FormatTabs from './shared/FormatTabs.vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import { DES_KEY_HEX_LENGTH, DES_KEY_HINT, formatFromBase64, formatFromTextHex, getHexRequirementMessage, isConvertError, isEvenHex, isHexLength, isHexOutput, parseCipherHexToBase64, randomHex } from './shared/cipher-helpers.js'

const des = reactive({ mode: 'des', blockMode: 'cbc', plainEncoding: 'utf8', padding: 'pkcs7', key1: '0123456789abcdef', key2: 'fedcba9876543210', key3: '0011223344556677', iv: '0000000000000000', input: '', last: '', lastIsEnc: false, format: 'hex', resultFormat: 'hex' })
const desOutput = computed(() => des.lastIsEnc ? formatFromBase64(des.last, des.format) : formatFromTextHex(des.last, des.resultFormat))

function generateDesKey(field) {
  des[field] = randomHex(8)
}

function generateDesIv() {
  des.iv = randomHex(8)
}

useClearOnInput([
  () => des.input,
  () => des.key1,
  () => des.key2,
  () => des.key3,
  () => des.iv,
  () => des.mode,
  () => des.blockMode,
  () => des.plainEncoding,
  () => des.padding,
], () => {
  des.last = ''
  des.lastIsEnc = false
})

async function runDes(enc) {
  if (!des.input || !des.key1) return des.last = '请填写密钥和内容'
  if (!isHexLength(des.key1, DES_KEY_HEX_LENGTH)) return des.last = getHexRequirementMessage('密钥 1', DES_KEY_HINT)
  if (des.mode !== 'des' && !isHexLength(des.key2, DES_KEY_HEX_LENGTH)) return des.last = getHexRequirementMessage('密钥 2', DES_KEY_HINT)
  if (des.mode === '3des3' && !isHexLength(des.key3, DES_KEY_HEX_LENGTH)) return des.last = getHexRequirementMessage('密钥 3', DES_KEY_HINT)
  if (des.blockMode === 'cbc' && !isHexLength(des.iv, DES_KEY_HEX_LENGTH)) return des.last = getHexRequirementMessage('IV', DES_KEY_HINT)
  if (enc && des.plainEncoding === 'hex' && !isEvenHex(des.input.replace(/\s+/g, ''))) return des.last = 'Hex 明文应为偶数位且仅包含 0-9a-f'
  let inputText = des.input
  if (!enc) {
    inputText = parseCipherHexToBase64(des.input)
    if (isConvertError(inputText)) return des.last = inputText
  }
  const iv = des.blockMode === 'cbc' ? des.iv : undefined
  const options = { blockMode: des.blockMode, plainEncoding: des.plainEncoding, padding: des.padding }
  if (enc) des.last = des.mode === 'des'
    ? await desEncrypt(des.input, des.key1, des.blockMode, iv, undefined, undefined, options)
    : des.mode === '3des2'
      ? await desEncrypt(des.input, des.key1, des.blockMode, iv, des.key2, undefined, options)
      : await desEncrypt(des.input, des.key1, des.blockMode, iv, des.key2, des.key3, options)
  else des.last = des.mode === 'des'
    ? await desDecrypt(inputText, des.key1, des.blockMode, iv, undefined, undefined, options)
    : des.mode === '3des2'
      ? await desDecrypt(inputText, des.key1, des.blockMode, iv, des.key2, undefined, options)
      : await desDecrypt(inputText, des.key1, des.blockMode, iv, des.key2, des.key3, options)
  des.lastIsEnc = enc
}
</script>