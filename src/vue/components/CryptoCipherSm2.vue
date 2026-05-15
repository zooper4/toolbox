<template>
  <div>
    <ToolPageTitle title="SM2 加解密" />
    <p class="mb-4 text-gray-500">GB/T 32918-2016 椭圆曲线算法</p>
    <Field label="密文编排"><select v-model="sm2.cipherMode" class="form-input"><option value="c1c3c2">C1C3C2</option><option value="c1c2c3">C1C2C3</option></select></Field>
    <Field label="输入编码"><select v-model="sm2.inputEncoding" class="form-input"><option value="utf8">UTF-8 文本</option><option value="hex">Hex 字节</option></select></Field>
    <Field label="签名格式"><select v-model="sm2.signatureFormat" class="form-input"><option value="plain">Plain Hex</option><option value="der">DER</option></select></Field>
    <button class="btn btn-primary btn-block mb-4" :disabled="sm2.loading" @click="generateSm2">
      <Loader2 v-if="sm2.loading" :size="16" :stroke-width="2.2" class="sm2-button-loader" />
      <span>{{ sm2.loading ? '生成中...' : '生成密钥对' }}</span>
    </button>
    <Field label="公钥" :hint="SM2_PUBLIC_KEY_HINT"><textarea v-model="sm2.publicKey" class="form-input form-input-sm" placeholder="或粘贴你自己的公钥"></textarea></Field>
    <Field label="私钥" :hint="SM2_PRIVATE_KEY_HINT"><textarea v-model="sm2.privateKey" class="form-input form-input-sm" placeholder="或粘贴你自己的私钥"></textarea></Field>
    <Field label="签名" hint="Hex 字符串"><textarea v-model="sm2.signature" class="form-input form-input-sm" placeholder="粘贴待验签名"></textarea></Field>
    <Field label="内容"><textarea v-model="sm2.input" class="form-input form-input-lg" placeholder="加密：明文 | 解密：Hex 密文"></textarea></Field>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runSm2Encrypt">加密</button><button class="btn btn-secondary" @click="runSm2Decrypt">解密</button></div>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runSm2Sign">签名</button><button class="btn btn-secondary" @click="runSm2Verify">验签</button></div>
    <FormatTabs v-if="sm2.lastIsEnc" v-model="sm2.format" />
    <FormatTabs v-else-if="isHexOutput(sm2.last)" v-model="sm2.resultFormat" mode="text" />
    <ResultBox label="结果" :value="sm2Output" lg />
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
import { SM2_PRIVATE_KEY_HEX_LENGTH, SM2_PRIVATE_KEY_HINT, SM2_PUBLIC_KEY_HEX_LENGTH, SM2_PUBLIC_KEY_HINT, formatFromHex, formatFromTextHex, getHexRequirementMessage, isConvertError, isEvenHex, isHexLength, isHexOutput, normalizeCipherHexInput } from './shared/cipher-helpers.js'

const sm2 = reactive({ cipherMode: 'c1c3c2', inputEncoding: 'utf8', signatureFormat: 'plain', publicKey: '', privateKey: '', signature: '', input: '', last: '', lastIsEnc: false, format: 'hex', resultFormat: 'hex', loading: false })
const sm2Output = computed(() => sm2.lastIsEnc ? formatFromHex(sm2.last, sm2.format) : formatFromTextHex(sm2.last, sm2.resultFormat))

async function generateSm2() {
  if (sm2.loading) return
  sm2.loading = true
  try {
    const result = await crHeavy.sm2GenerateKey()
    if (result.error) return sm2.last = result.error
    sm2.publicKey = result.publicKey
    sm2.privateKey = result.privateKey
    sm2.last = '密钥对已生成'
  } finally {
    sm2.loading = false
  }
}

async function runSm2Encrypt() {
  if (!sm2.publicKey || !sm2.input) return sm2.last = '请填写公钥和内容'
  if (!isHexLength(sm2.publicKey, SM2_PUBLIC_KEY_HEX_LENGTH)) return sm2.last = getHexRequirementMessage('公钥', SM2_PUBLIC_KEY_HINT)
  if (sm2.inputEncoding === 'hex' && !isEvenHex(sm2.input.replace(/\s+/g, ''))) return sm2.last = 'Hex 输入应为偶数位且仅包含 0-9a-f'
  sm2.last = await crHeavy.sm2Encrypt(sm2.input, sm2.publicKey, { cipherMode: sm2.cipherMode, plainEncoding: sm2.inputEncoding })
  sm2.lastIsEnc = true
}

async function runSm2Decrypt() {
  if (!sm2.privateKey || !sm2.input) return sm2.last = '请填写私钥和内容'
  if (!isHexLength(sm2.privateKey, SM2_PRIVATE_KEY_HEX_LENGTH)) return sm2.last = getHexRequirementMessage('私钥', SM2_PRIVATE_KEY_HINT)
  const inputText = normalizeCipherHexInput(sm2.input)
  if (isConvertError(inputText)) return sm2.last = inputText
  sm2.last = await crHeavy.sm2Decrypt(inputText, sm2.privateKey, { cipherMode: sm2.cipherMode })
  sm2.lastIsEnc = false
}

async function runSm2Sign() {
  if (!sm2.privateKey || !sm2.input) return sm2.last = '请填写私钥和内容'
  if (!isHexLength(sm2.privateKey, SM2_PRIVATE_KEY_HEX_LENGTH)) return sm2.last = getHexRequirementMessage('私钥', SM2_PRIVATE_KEY_HINT)
  if (sm2.inputEncoding === 'hex' && !isEvenHex(sm2.input.replace(/\s+/g, ''))) return sm2.last = 'Hex 输入应为偶数位且仅包含 0-9a-f'
  sm2.signature = await crHeavy.sm2Sign(sm2.input, sm2.privateKey, { inputEncoding: sm2.inputEncoding, signatureFormat: sm2.signatureFormat })
  sm2.last = sm2.signature
  sm2.lastIsEnc = false
}

async function runSm2Verify() {
  if (!sm2.publicKey || !sm2.input || !sm2.signature) return sm2.last = '请填写公钥、内容和签名'
  if (!isHexLength(sm2.publicKey, SM2_PUBLIC_KEY_HEX_LENGTH)) return sm2.last = getHexRequirementMessage('公钥', SM2_PUBLIC_KEY_HINT)
  if (sm2.inputEncoding === 'hex' && !isEvenHex(sm2.input.replace(/\s+/g, ''))) return sm2.last = 'Hex 输入应为偶数位且仅包含 0-9a-f'
  sm2.last = await crHeavy.sm2Verify(sm2.input, sm2.signature, sm2.publicKey, { inputEncoding: sm2.inputEncoding, signatureFormat: sm2.signatureFormat })
  sm2.lastIsEnc = false
}

useClearOnInput([
  () => sm2.publicKey,
  () => sm2.privateKey,
  () => sm2.signature,
  () => sm2.input,
  () => sm2.cipherMode,
  () => sm2.inputEncoding,
  () => sm2.signatureFormat,
], () => {
  sm2.last = ''
  sm2.lastIsEnc = false
})
</script>