<template>
  <!-- ===== 单字节 XOR 爆破 ===== -->
  <div v-if="toolId === 'xor-single'">
    <ToolPageTitle title="单字节 XOR 爆破" />
    <p class="mb-4 text-gray-500">尝试全部 256 个密钥字节，按英文可读性自动排序（支持 hex 或文本输入）</p>
    <div class="mb-4">
      <label class="block mb-1">密文（hex 或文本）</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="例如：1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736"></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="xorSingleBrute">🔓 爆破</button>
    <ResultBox label="结果（按可读性排序，前 10）" :value="output" lg />
  </div>

  <!-- ===== 重复密钥 XOR 破解 ===== -->
  <div v-else-if="toolId === 'xor-repeat'">
    <ToolPageTitle title="重复密钥 XOR 破解" />
    <p class="mb-4 text-gray-500">汉明距离自动推断密钥长度 → 每列单字节爆破 → 组合密钥解密（Cryptopals 经典方法）</p>
    <div class="mb-4">
      <label class="block mb-1">密文（hex 或文本，越长越准）</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="粘贴密文 hex..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="xorRepeatBrute">🔓 破解</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== XOR 加解密 ===== -->
  <div v-else-if="toolId === 'xor-cipher'">
    <ToolPageTitle title="XOR 加解密" />
    <p class="mb-4 text-gray-500">任意长度密钥循环异或。输入自动识别 hex / 文本，输出可选 hex / 文本</p>
    <div class="mb-4">
      <label class="block mb-1">密钥</label>
      <input v-model="xorKey" class="form-input" placeholder="例如：ICE / secret" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">输入（文本或 hex）</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入要加密/解密的内容..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">输出格式</label>
      <select v-model="xorOutFmt" class="form-input" style="max-width:200px">
        <option value="hex">Hex</option>
        <option value="text">文本</option>
      </select>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="xorDo">执行（XOR 加密 = 解密）</button>
    <ResultBox label="结果" :value="output" lg />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import * as xr from '../../utils/ctf-xor.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const props = defineProps({ toolId: { type: String, required: true } })
const output = ref('')
const textInput = ref('')
const xorKey = ref('')
const xorOutFmt = ref('hex')

function xorSingleBrute() {
  if (!textInput.value) return output.value = '请输入密文'
  const r = xr.xorSingleByteBruteforce(textInput.value)
  if (r.error) return output.value = r.error
  output.value = r.results.slice(0, 10).map((item, i) =>
    `[${i + 1}] key = ${item.key} (${item.char})\n${item.text}\n`
  ).join('─'.repeat(30) + '\n')
}

function xorRepeatBrute() {
  if (!textInput.value) return output.value = '请输入密文'
  const r = xr.xorRepeatCrack(textInput.value)
  if (r.error) return output.value = r.error
  output.value = `🔑 密钥: ${r.key}（${r.keyLength} 字节，hex: ${r.keyHex}）\n\n📄 解密明文:\n${r.text}`
}

function xorDo() {
  if (!textInput.value) return output.value = '请输入内容'
  if (!xorKey.value) return output.value = '请输入密钥'
  const r = xr.xorCipher(textInput.value, xorKey.value, xorOutFmt.value)
  if (r.error) return output.value = r.error
  output.value = xorOutFmt.value === 'hex' ? r.hex : r.text
}

useClearOnInput([textInput], () => { output.value = '' })
useClearOnInput([xorKey, xorOutFmt], () => { output.value = '' })
</script>
