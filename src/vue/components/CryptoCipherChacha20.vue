<template>
  <div>
    <ToolPageTitle title="ChaCha20" />
    <p class="mb-4 text-gray-500">RFC 8439 流密码, 256-bit 密钥 + 96-bit 随机数</p>
    <button class="btn btn-primary btn-block mb-4" @click="generateChacha20">生成随机 Key 与 Nonce</button>
    <Field label="Key" :hint="CHACHA_KEY_HINT"><input v-model="chacha.key" class="form-input" placeholder="64 位 Hex 字符" /></Field>
    <Field label="Nonce" :hint="CHACHA_NONCE_HINT"><input v-model="chacha.nonce" class="form-input" placeholder="24 位 Hex 字符" /></Field>
    <Field label="计数器"><input v-model="chacha.counter" class="form-input" placeholder="默认 0" /></Field>
    <Field label="明文编码"><select v-model="chacha.plainEncoding" class="form-input"><option value="utf8">UTF-8 文本</option><option value="hex">Hex 字节</option></select></Field>
    <Field label="文本 / Hex 密文"><textarea v-model="chacha.input" class="form-input form-input-lg" placeholder="加密：文本/Hex 字节 | 解密：Hex 密文"></textarea></Field>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runChachaEncrypt">加密</button><button class="btn btn-secondary" @click="runChachaDecrypt">解密</button></div>
    <FormatTabs v-if="chacha.lastIsEnc" v-model="chacha.format" />
    <FormatTabs v-else-if="isHexOutput(chacha.last)" v-model="chacha.resultFormat" mode="text" />
    <ResultBox label="结果" :value="chachaOutput" lg />
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
import { CHACHA_KEY_HEX_LENGTH, CHACHA_KEY_HINT, CHACHA_NONCE_HEX_LENGTH, CHACHA_NONCE_HINT, formatFromHex, formatFromTextHex, getHexRequirementMessage, isConvertError, isEvenHex, isHexLength, isHexOutput, normalizeCipherHexInput } from './shared/cipher-helpers.js'

const chacha = reactive({ key: '', nonce: '', counter: '0', plainEncoding: 'utf8', input: '', last: null, lastIsEnc: false, format: 'hex', resultFormat: 'hex' })
const chachaOutput = computed(() => chacha.lastIsEnc ? formatFromHex(chacha.last?.hex || '', chacha.format) : formatFromTextHex(chacha.last, chacha.resultFormat))

async function generateChacha20() {
  const result = await crHeavy.chacha20GenerateKey()
  chacha.key = result.keyHex
  chacha.nonce = result.nonceHex
  chacha.last = '随机密钥和Nonce已生成'
  chacha.lastIsEnc = false
}

async function runChachaEncrypt() {
  if (!isHexLength(chacha.key, CHACHA_KEY_HEX_LENGTH)) return chacha.last = getHexRequirementMessage('Key', CHACHA_KEY_HINT)
  if (!isHexLength(chacha.nonce, CHACHA_NONCE_HEX_LENGTH)) return chacha.last = getHexRequirementMessage('Nonce', CHACHA_NONCE_HINT)
  if (!chacha.input) return chacha.last = '请输入内容'
  if (chacha.plainEncoding === 'hex' && !isEvenHex(chacha.input.replace(/\s+/g, ''))) return chacha.last = 'Hex 输入应为偶数位且仅包含 0-9a-f'
  chacha.last = await crHeavy.chacha20Encrypt(chacha.input, chacha.key, chacha.nonce, { plainEncoding: chacha.plainEncoding, counter: Number(chacha.counter) || 0 })
  if (chacha.last.error) chacha.last = chacha.last.error
  else chacha.lastIsEnc = true
}

async function runChachaDecrypt() {
  if (!isHexLength(chacha.key, CHACHA_KEY_HEX_LENGTH)) return chacha.last = getHexRequirementMessage('Key', CHACHA_KEY_HINT)
  if (!isHexLength(chacha.nonce, CHACHA_NONCE_HEX_LENGTH)) return chacha.last = getHexRequirementMessage('Nonce', CHACHA_NONCE_HINT)
  if (!chacha.input) return chacha.last = '请输入密文'
  const inputText = normalizeCipherHexInput(chacha.input)
  if (isConvertError(inputText)) return chacha.last = inputText
  chacha.last = await crHeavy.chacha20Decrypt(inputText, chacha.key, chacha.nonce, { counter: Number(chacha.counter) || 0 })
  chacha.lastIsEnc = false
}

useClearOnInput([
  () => chacha.key,
  () => chacha.nonce,
  () => chacha.counter,
  () => chacha.plainEncoding,
  () => chacha.input,
], () => {
  chacha.last = ''
  chacha.lastIsEnc = false
})
</script>