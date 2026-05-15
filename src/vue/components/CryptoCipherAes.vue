<template>
  <div>
    <ToolPageTitle title="AES 加解密" />
    <p class="mb-4 text-gray-500">AES 对称加密标准（支持 128/192/256-bit）</p>
    <div class="grid gap-4">
      <Field label="模式"><select v-model="aes.mode" class="form-input"><option value="cbc">CBC</option><option value="ecb">ECB</option><option value="gcm">GCM</option><option value="ctr">CTR</option></select></Field>
      <Field label="密钥长度"><select v-model="aes.keySize" class="form-input"><option value="128">128-bit</option><option value="192">192-bit</option><option value="256">256-bit</option></select></Field>
      <Field label="明文编码"><select v-model="aes.plainEncoding" class="form-input"><option value="utf8">UTF-8 文本</option><option value="hex">Hex 字节</option></select></Field>
      <Field v-if="aes.mode === 'cbc' || aes.mode === 'ecb'" label="填充"><select v-model="aes.padding" class="form-input"><option value="pkcs7">PKCS#7</option><option value="none">No Padding</option></select></Field>
      <Field label="密钥" :hint="aesKeyHint"><div class="flex items-center gap-2"><input v-model="aes.key" class="form-input flex-1" placeholder="输入 Hex 密钥" /><button type="button" class="btn btn-outline btn-sm" @click="generateAesKey">生成</button></div></Field>
      <Field v-if="aes.mode !== 'ecb'" label="IV" :hint="aesIvHint"><div class="flex items-center gap-2"><input v-model="aes.iv" class="form-input flex-1" placeholder="输入 Hex IV" /><button type="button" class="btn btn-outline btn-sm" @click="generateAesIv">生成</button></div></Field>
      <Field label="内容"><textarea v-model="aes.input" class="form-input form-input-xl" placeholder="加密：明文/Hex 字节 | 解密：Base64 密文"></textarea></Field>
    </div>
    <div class="btn-group mb-2"><button class="btn btn-primary" @click="runAes(true)">加密</button><button class="btn btn-secondary" @click="runAes(false)">解密</button></div>
    <FormatTabs v-if="aes.lastIsEnc" v-model="aes.format" />
    <FormatTabs v-else-if="isHexOutput(aes.last)" v-model="aes.resultFormat" mode="text" />
    <ResultBox label="结果" :value="aesOutput" lg />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { aesDecrypt, aesEncrypt } from '../../utils/crypto-aes-des.js'
import Field from './shared/ToolField.vue'
import FormatTabs from './shared/FormatTabs.vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import { AES_IV_HEX_LENGTH, AES_IV_HINT, formatFromBase64, formatFromTextHex, getHexRequirementMessage, isConvertError, isEvenHex, isHexLength, isHexOutput, parseBase64Input, randomHex } from './shared/cipher-helpers.js'

const aes = reactive({ mode: 'cbc', keySize: '256', key: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', iv: '00112233445566778899aabbccddeeff', plainEncoding: 'utf8', padding: 'pkcs7', input: '', last: '', lastIsEnc: false, format: 'hex', resultFormat: 'hex' })

const aesKeyHint = computed(() => `${Number(aes.keySize) / 4} 位 Hex`)
const aesIvHint = computed(() => aes.mode === 'gcm' ? '推荐 24 位 Hex（12 字节），也支持其他偶数长度 Hex' : AES_IV_HINT)
const aesOutput = computed(() => aes.lastIsEnc ? formatFromBase64(aes.last, aes.format) : formatFromTextHex(aes.last, aes.resultFormat))

function generateAesKey() {
  aes.key = randomHex(Number(aes.keySize) / 8)
}

function generateAesIv() {
  aes.iv = randomHex(16)
}

// 当用户修改密钥、IV、输入或模式相关设置时，清空旧结果
useClearOnInput([
  () => aes.input,
  () => aes.key,
  () => aes.iv,
  () => aes.mode,
  () => aes.keySize,
  () => aes.plainEncoding,
  () => aes.padding,
], () => {
  aes.last = ''
  aes.lastIsEnc = false
})

async function runAes(enc) {
  if (!aes.input || !aes.key) return aes.last = '请填写密钥和内容'
  if (!isHexLength(aes.key, Number(aes.keySize) / 4)) return aes.last = getHexRequirementMessage('密钥', aesKeyHint.value)
  if (aes.mode !== 'ecb' && !aes.iv) return aes.last = '请输入 IV'
  if (aes.mode === 'cbc' || aes.mode === 'ctr') {
    if (!isHexLength(aes.iv, AES_IV_HEX_LENGTH)) return aes.last = getHexRequirementMessage('IV', AES_IV_HINT)
  }
  if (aes.mode === 'gcm' && !isEvenHex(aes.iv)) return aes.last = 'IV 应为偶数位 Hex'
  if (enc && aes.plainEncoding === 'hex' && !isEvenHex(aes.input.replace(/\s+/g, ''))) return aes.last = 'Hex 明文应为偶数位且仅包含 0-9a-f'
  let inputText = aes.input
  if (!enc) {
    inputText = parseBase64Input(aes.input, aes.format)
    if (isConvertError(inputText)) return aes.last = inputText
  }
  aes.last = enc
    ? await aesEncrypt(inputText, aes.key, aes.mode, aes.iv, Number(aes.keySize), { plainEncoding: aes.plainEncoding, padding: aes.padding })
    : await aesDecrypt(inputText, aes.key, aes.mode, aes.iv, Number(aes.keySize), { padding: aes.padding })
  aes.lastIsEnc = enc
}
</script>