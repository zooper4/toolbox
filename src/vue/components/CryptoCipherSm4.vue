<template>
  <div>
    <ToolPageTitle title="SM4 加解密" />
    <p class="mb-4 text-gray-500">GB/T 32907-2016 SM4, 128-bit block</p>
    <div class="grid gap-4">
      <Field label="模式"><select v-model="sm4.mode" class="form-input"><option value="ecb">ECB</option><option value="cbc">CBC</option></select></Field>
      <Field label="明文编码"><select v-model="sm4.plainEncoding" class="form-input"><option value="utf8">UTF-8 文本</option><option value="hex">Hex 字节</option></select></Field>
      <Field label="填充"><select v-model="sm4.padding" class="form-input"><option value="pkcs7">PKCS#7</option><option value="none">No Padding</option></select></Field>
      <Field label="密钥" :hint="SM4_KEY_HINT"><div class="flex items-center gap-2"><input v-model="sm4.key" class="form-input flex-1" placeholder="输入 32 位 Hex" /><button type="button" class="btn btn-outline btn-sm" @click="generateSm4Key">生成</button></div></Field>
      <Field v-if="sm4.mode === 'cbc'" label="IV" :hint="SM4_IV_HINT"><div class="flex items-center gap-2"><input v-model="sm4.iv" class="form-input flex-1" placeholder="输入 32 位 Hex" /><button type="button" class="btn btn-outline btn-sm" @click="generateSm4Iv">生成</button></div></Field>
      <Field label="内容"><textarea v-model="sm4.input" class="form-input form-input-lg" placeholder="加密：明文/Hex 字节 | 解密：Hex 密文"></textarea></Field>
    </div>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runSm4(true)">加密</button><button class="btn btn-secondary" @click="runSm4(false)">解密</button></div>
    <FormatTabs v-if="sm4.lastIsEnc" v-model="sm4.format" />
    <FormatTabs v-else-if="isHexOutput(sm4.last)" v-model="sm4.resultFormat" mode="text" />
    <ResultBox label="结果" :value="sm4Output" lg />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import * as crHeavy from '../../utils/crypto-worker.js'
import Field from './shared/ToolField.vue'
import FormatTabs from './shared/FormatTabs.vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import { SM4_IV_HINT, SM4_KEY_HEX_LENGTH, SM4_KEY_HINT, formatFromHex, formatFromTextHex, getHexRequirementMessage, isConvertError, isEvenHex, isHexLength, isHexOutput, parseHexInput, randomHex } from './shared/cipher-helpers.js'

const sm4 = reactive({ mode: 'ecb', plainEncoding: 'utf8', padding: 'pkcs7', key: '0123456789abcdeffedcba9876543210', iv: '00112233445566778899aabbccddeeff', input: '', last: '', lastIsEnc: false, format: 'hex', resultFormat: 'hex' })
const sm4Output = computed(() => sm4.lastIsEnc ? formatFromHex(sm4.last, sm4.format) : formatFromTextHex(sm4.last, sm4.resultFormat))

function generateSm4Key() {
  sm4.key = randomHex(16)
}

function generateSm4Iv() {
  sm4.iv = randomHex(16)
}

useClearOnInput([
  () => sm4.input,
  () => sm4.key,
  () => sm4.iv,
  () => sm4.mode,
  () => sm4.plainEncoding,
  () => sm4.padding,
], () => {
  sm4.last = ''
  sm4.lastIsEnc = false
})

async function runSm4(enc) {
  if (!sm4.input) return sm4.last = enc ? '请输入内容' : '请输入密文'
  if (!isHexLength(sm4.key, SM4_KEY_HEX_LENGTH)) return sm4.last = getHexRequirementMessage('密钥', SM4_KEY_HINT)
  if (sm4.mode === 'cbc' && !isHexLength(sm4.iv, SM4_KEY_HEX_LENGTH)) return sm4.last = getHexRequirementMessage('IV', SM4_IV_HINT)
  if (enc && sm4.plainEncoding === 'hex' && !isEvenHex(sm4.input.replace(/\s+/g, ''))) return sm4.last = 'Hex 明文应为偶数位且仅包含 0-9a-f'
  if (enc) sm4.last = await crHeavy.sm4Encrypt(sm4.input, sm4.key, sm4.mode, sm4.iv, { plainEncoding: sm4.plainEncoding, padding: sm4.padding })
  else {
    const inputText = parseHexInput(sm4.input, sm4.format)
    if (isConvertError(inputText)) return sm4.last = inputText
    sm4.last = await crHeavy.sm4Decrypt(inputText, sm4.key, sm4.mode, sm4.iv, { padding: sm4.padding })
  }
  sm4.lastIsEnc = enc
}
</script>