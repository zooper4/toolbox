<template>
  <!-- ===== 培根密码 ===== -->
  <div v-if="toolId === 'bacon'">
    <ToolPageTitle title="培根密码" />
    <p class="mb-4 text-gray-500">每个字母编码为 5 位 A/B 序列（00000=A）。24 字母版（I/J、U/V 合并）或 26 字母版</p>
    <div class="mb-4">
      <label class="block mb-1">变体</label>
      <select v-model="baconVariant" class="form-input" style="max-width:200px">
        <option value="24">24 字母版（I/J、U/V 合并）</option>
        <option value="26">26 字母版</option>
      </select>
    </div>
    <div class="mb-4">
      <label class="block mb-1">文本 / A-B 序列</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="例如：HELLO 或 AABBA AABAA..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="baconEnc">文本 → Bacon</button>
      <button class="btn btn-secondary" @click="baconDec">Bacon → 文本</button>
    </div>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== Playfair ===== -->
  <div v-else-if="toolId === 'playfair'">
    <ToolPageTitle title="Playfair" />
    <p class="mb-4 text-gray-500">双字母替换密码，5×5 矩阵（I/J 合并）。相同字母插 X 分隔，末尾补 X</p>
    <div class="mb-4">
      <label class="block mb-1">密钥</label>
      <input v-model="playfairKey" class="form-input" placeholder="例如：PLAYFAIR" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">明文 / 密文</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入文本..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="playfairEnc">加密</button>
      <button class="btn btn-secondary" @click="playfairDec">解密</button>
    </div>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== ADFGVX ===== -->
  <div v-else-if="toolId === 'adfgvx'">
    <ToolPageTitle title="ADFGVX" />
    <p class="mb-4 text-gray-500">一战德国使用的密码：Polybius 6×6 方阵（A-Z + 0-9）+ 列置换，输出仅含 ADFGVX 六个字母</p>
    <div class="mb-4">
      <label class="block mb-1">列置换密钥</label>
      <input v-model="adfgvxKey" class="form-input" placeholder="例如：PRIVACY" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">明文 / 密文</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入文本（支持 A-Z 和 0-9）..."></textarea>
    </div>
    <div class="btn-group mb-4">
      <button class="btn btn-primary" @click="adfgvxEnc">加密</button>
      <button class="btn btn-secondary" @click="adfgvxDec">解密</button>
    </div>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== 猪圈密码 ===== -->
  <div v-else-if="toolId === 'pigpen'">
    <ToolPageTitle title="猪圈密码" />
    <p class="mb-4 text-gray-500">加密符号由格子与点/叉组成。CTF 中通常以图片形式出现，可对照下方符号表手动翻译</p>
    <div class="mb-4">
      <label class="block mb-1">文本（仅 A-Z）</label>
      <textarea v-model="textInput" class="form-input form-input-lg" placeholder="输入要生成猪圈符号的文本..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="pigpenGen">生成猪圈符号</button>
    <div class="mb-4">
      <label class="block mb-1">符号输出</label>
      <div class="pigpen-output" v-html="pigpenOutput || '（生成后显示）'"></div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">对照表</label>
      <div class="pigpen-table" v-html="pigpenTable"></div>
    </div>
  </div>

  <!-- ===== Brainfuck ===== -->
  <div v-else-if="toolId === 'brainfuck'">
    <ToolPageTitle title="Brainfuck / Ook!" />
    <p class="mb-4 text-gray-500">Brainfuck 解释器（8 指令，30000 字节内存）+ Ook! 语言互转</p>
    <div class="mb-4">
      <label class="block mb-1">Brainfuck 代码</label>
      <textarea v-model="bfCode" class="form-input form-input-lg" placeholder="例如：++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">输入（可选，对应 , 指令）</label>
      <input v-model="bfInput" class="form-input" placeholder="程序读取的输入..." />
    </div>
    <div class="btn-group mb-2">
      <button class="btn btn-primary" @click="bfRun">▶ 运行</button>
      <button class="btn btn-outline" @click="bfToOok">BF → Ook!</button>
      <button class="btn btn-outline" @click="ookToBf">Ook! → BF</button>
    </div>
    <div class="mb-4">
      <label class="block mb-1">Ook! 代码</label>
      <textarea v-model="ookCode" class="form-input form-input-lg" placeholder="Ook. Ook. Ook! Ook?..."></textarea>
    </div>
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
const baconVariant = ref('24')
const playfairKey = ref('')
const adfgvxKey = ref('')
const pigpenOutput = ref('')
const pigpenTable = ref(cc.pigpenTableHtml())
const bfCode = ref('')
const bfInput = ref('')
const ookCode = ref('')

// ===== 培根 =====
function baconEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.baconEncode(textInput.value, baconVariant.value)
}
function baconDec() {
  if (!textInput.value) return output.value = '请输入内容'
  output.value = cc.baconDecode(textInput.value, baconVariant.value)
}

// ===== Playfair =====
function playfairEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  if (!playfairKey.value) return output.value = '请输入密钥'
  output.value = cc.playfairEncrypt(textInput.value, playfairKey.value)
}
function playfairDec() {
  if (!textInput.value) return output.value = '请输入内容'
  if (!playfairKey.value) return output.value = '请输入密钥'
  output.value = cc.playfairDecrypt(textInput.value, playfairKey.value)
}

// ===== ADFGVX =====
function adfgvxEnc() {
  if (!textInput.value) return output.value = '请输入内容'
  if (!adfgvxKey.value) return output.value = '请输入列置换密钥'
  output.value = cc.adfgvxEncrypt(textInput.value, adfgvxKey.value)
}
function adfgvxDec() {
  if (!textInput.value) return output.value = '请输入内容'
  if (!adfgvxKey.value) return output.value = '请输入列置换密钥'
  output.value = cc.adfgvxDecrypt(textInput.value, adfgvxKey.value)
}

// ===== 猪圈 =====
function pigpenGen() {
  if (!textInput.value) return pigpenOutput.value = '<span style="color:var(--muted-foreground)">请输入文本</span>'
  const svg = cc.pigpenSvg(textInput.value)
  if (!svg) return pigpenOutput.value = '<span style="color:var(--muted-foreground)">没有可编码的字母（仅 A-Z）</span>'
  pigpenOutput.value = svg
}

// ===== Brainfuck =====
function bfRun() {
  if (!bfCode.value) return output.value = '请输入 Brainfuck 代码'
  const r = cc.brainfuckRun(bfCode.value, bfInput.value)
  if (r.error) return output.value = '❌ ' + r.error
  output.value = `输出: ${r.output || '（无输出）'}\n\n前 64 个内存单元:\n[${r.cells.join(', ')}]`
}
function bfToOok() {
  if (!bfCode.value) return output.value = '请输入 Brainfuck 代码'
  output.value = cc.brainfuckToOok(bfCode.value)
}
function ookToBf() {
  if (!ookCode.value) return output.value = '请输入 Ook! 代码'
  output.value = cc.ookToBrainfuck(ookCode.value)
}

useClearOnInput([textInput], () => { output.value = '' })
useClearOnInput([baconVariant], () => { output.value = '' })
useClearOnInput([playfairKey], () => { output.value = '' })
useClearOnInput([adfgvxKey], () => { output.value = '' })
useClearOnInput([bfCode, bfInput, ookCode], () => { output.value = '' })
</script>

<style scoped>
.pigpen-output {
  background: color-mix(in oklch, var(--card), var(--foreground) 5%);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  padding: 0.75rem 1rem;
  min-height: 3rem;
  overflow-x: auto;
  white-space: nowrap;
  color: var(--foreground);
}
.pigpen-table {
  background: color-mix(in oklch, var(--card), var(--foreground) 5%);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  padding: 0.75rem 1rem;
  color: var(--foreground);
}
.pigpen-group {
  margin-bottom: 0.75rem;
}
.pigpen-group:last-child {
  margin-bottom: 0;
}
.pigpen-group-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
}
.pigpen-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.pigpen-cell {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--card);
}
.pigpen-letter {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  min-width: 0.75rem;
  text-align: center;
}
</style>
