<template>
  <!-- ===== 凯撒密码 ===== -->
  <div v-if="toolId === 'caesar'">
    <ToolPageTitle title="凯撒密码" />
    <p class="mb-4 text-gray-500">经典移位密码。支持加密 / 解密 / ROT13 / ROT47 / 全量爆破（按英文可读性自动排序）</p>
    <div class="mb-4">
      <label class="block mb-1">明文 / 密文</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入文本..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">位移 (1-25)</label>
      <input v-model.number="caesarShift" type="number" class="form-input" min="1" max="25" style="max-width:120px" />
    </div>
    <div class="btn-group mb-2">
      <button class="btn btn-primary" @click="caesarEnc">加密</button>
      <button class="btn btn-secondary" @click="caesarDec">解密</button>
      <button class="btn btn-outline" @click="caesarRot13">ROT13</button>
      <button class="btn btn-outline" @click="caesarRot47">ROT47</button>
    </div>
    <button class="btn btn-ghost btn-block mb-4" style="border:1px solid var(--border)" @click="caesarBrute">🔓 全量爆破 (25 种位移)</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== 维吉尼亚 ===== -->
  <div v-else-if="toolId === 'vigenere'">
    <ToolPageTitle title="维吉尼亚密码" />
    <p class="mb-4 text-gray-500">多表替换密码。支持加密 / 解密</p>
    <div class="mb-4">
      <label class="block mb-1">明文 / 密文</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入文本..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">密钥</label>
      <input v-model="vigenereKey" class="form-input" placeholder="例如：KEY / SECRET" />
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="vigenereEnc">加密</button>
      <button class="btn btn-secondary" @click="vigenereDec">解密</button>
    </div>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== 栅栏密码 ===== -->
  <div v-else-if="toolId === 'rail-fence'">
    <ToolPageTitle title="栅栏密码" />
    <p class="mb-4 text-gray-500">Rail Fence（篱笆）密码，按锯齿形写入再按行读出。支持加密 / 解密 / 栏数爆破</p>
    <div class="mb-4">
      <label class="block mb-1">明文 / 密文</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入文本..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">栏数 (2-20)</label>
      <input v-model.number="railRails" type="number" class="form-input" min="2" max="20" style="max-width:120px" />
    </div>
    <div class="btn-group mb-2">
      <button class="btn btn-primary" @click="railEnc">加密</button>
      <button class="btn btn-secondary" @click="railDec">解密</button>
    </div>
    <button class="btn btn-ghost btn-block mb-4" style="border:1px solid var(--border)" @click="railBrute">🔓 栏数爆破 (2-20)</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== 摩斯电码 ===== -->
  <div v-else-if="toolId === 'morse'">
    <ToolPageTitle title="摩斯电码" />
    <p class="mb-4 text-gray-500">支持字母 / 数字 / 常用标点。字符间用空格分隔，单词间用 / 分隔</p>
    <div class="mb-4">
      <label class="block mb-1">文本 / 摩斯码</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="例如：SOS 或 ... --- ..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="morseEnc">文本 → 摩斯</button>
      <button class="btn btn-secondary" @click="morseDec">摩斯 → 文本</button>
    </div>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== 仿射密码 ===== -->
  <div v-else-if="toolId === 'affine'">
    <ToolPageTitle title="仿射密码" />
    <p class="mb-4 text-gray-500">y = (a·x + b) mod 26，a 需与 26 互质。支持加密 / 解密 / 全量爆破（312 种组合）</p>
    <div class="mb-4">
      <label class="block mb-1">明文 / 密文</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入文本..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">a（与 26 互质：1,3,5,7,9,11,15,17,19,21,23,25）</label>
      <input v-model.number="affineA" type="number" class="form-input" min="1" max="25" style="max-width:120px" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">b (0-25)</label>
      <input v-model.number="affineB" type="number" class="form-input" min="0" max="25" style="max-width:120px" />
    </div>
    <div class="btn-group mb-2">
      <button class="btn btn-primary" @click="affineEnc">加密</button>
      <button class="btn btn-secondary" @click="affineDec">解密</button>
    </div>
    <button class="btn btn-ghost btn-block mb-4" style="border:1px solid var(--border)" @click="affineBrute">🔓 全量爆破 (312 种组合)</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== 词频分析 ===== -->
  <div v-else-if="toolId === 'freq-analysis'">
    <ToolPageTitle title="词频分析" />
    <p class="mb-4 text-gray-500">统计字母出现频率并与英文标准频率对比，辅助破解替换类密码</p>
    <div class="mb-4">
      <label class="block mb-1">文本</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="粘贴密文或任意文本..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="freqAnalyze">分析</button>
    <ResultBox label="结果" :value="output" lg />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import * as cc from '../../utils/ctf-classical.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const props = defineProps({ toolId: { type: String, required: true } })
const output = ref('')
const textInput = ref('')
const caesarShift = ref(3)
const vigenereKey = ref('')
const railRails = ref(3)
const affineA = ref(5)
const affineB = ref(8)

// ===== 凯撒 =====
function caesarEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.caesarEncrypt(textInput.value, caesarShift.value)
}
function caesarDec() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.caesarDecrypt(textInput.value, caesarShift.value)
}
function caesarRot13() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.rot13(textInput.value)
}
function caesarRot47() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.rot47(textInput.value)
}
function caesarBrute() {
  if (!textInput.value) return output.value = '请输入内容'
  const results = cc.caesarBruteforce(textInput.value)
  output.value = results.map((r, i) => `[${i + 1}] shift=${String(r.shift).padStart(2)}: ${r.text}`).join('\n')
}

// ===== 维吉尼亚 =====
function vigenereEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  if (!vigenereKey.value) return output.value = '请输入密钥'
  output.value = cc.vigenereEncrypt(textInput.value, vigenereKey.value)
}
function vigenereDec() {
  if (!textInput.value) return output.value = '请输入内容'
  if (!vigenereKey.value) return output.value = '请输入密钥'
  output.value = cc.vigenereDecrypt(textInput.value, vigenereKey.value)
}

// ===== 栅栏 =====
function railEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.railFenceEncrypt(textInput.value, railRails.value)
}
function railDec() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.railFenceDecrypt(textInput.value, railRails.value)
}
function railBrute() {
  if (!textInput.value) return output.value = '请输入内容'
  const results = cc.railFenceBruteforce(textInput.value)
  output.value = results.map((r, i) => `[${i + 1}] rails=${String(r.rails).padStart(2)}: ${r.text}`).join('\n')
}

// ===== 摩斯 =====
function morseEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.morseEncode(textInput.value)
}
function morseDec() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.morseDecode(textInput.value)
}

// ===== 仿射 =====
function affineEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.affineEncrypt(textInput.value, affineA.value, affineB.value)
}
function affineDec() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.affineDecrypt(textInput.value, affineA.value, affineB.value)
}
function affineBrute() {
  if (!textInput.value) return output.value = '请输入内容'
  const results = cc.affineBruteforce(textInput.value).slice(0, 20)
  output.value = results.map((r, i) => `[${i + 1}] a=${String(r.a).padStart(2)} b=${String(r.b).padStart(2)}: ${r.text}`).join('\n')
}

// ===== 词频分析 =====
function freqAnalyze() {
  if (!textInput.value) return output.value = '请输入文本'
  const r = cc.frequencyAnalysis(textInput.value)
  if (r.total === 0) return output.value = '文本中没有字母'
  const lines = [
    `字母总数: ${r.total}`,
    '',
    '─ 字母频率（降序） ─',
    ...r.sorted.map((s) => {
      const bar = '█'.repeat(Math.round(s.pct / 2))
      return `${s.letter}: ${String(s.count).padStart(3)} (${s.pct.toFixed(1)}%) ${bar}`
    }),
    '',
    '─ 英文标准频率参考 ─',
    ...Object.entries(cc.EN_FREQ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([l, f]) => `${l}: ${f.toFixed(1)}%`).join(' '),
    '',
    '─ 高频单词（≥2字符） ─',
    r.words.length ? r.words.map(([w, n]) => `${w}×${n}`).join('  ') : '(无)',
  ]
  output.value = lines.join('\n')
}

useClearOnInput([textInput], () => { output.value = '' })
useClearOnInput([caesarShift], () => { output.value = '' })
useClearOnInput([vigenereKey], () => { output.value = '' })
useClearOnInput([railRails], () => { output.value = '' })
useClearOnInput([affineA, affineB], () => { output.value = '' })
</script>
