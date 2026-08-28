<template>
  <!-- ===== RSA 基础解密 ===== -->
  <div v-if="toolId === 'rsa-basic'">
    <ToolPageTitle title="RSA 基础解密" />
    <p class="mb-4 text-gray-500">已知 n / e / c 解密。可选提供 p、q 或 d；都不提供时自动尝试分解 n</p>
    <div class="mb-4">
      <label class="block mb-1">n（十进制或 0x 十六进制）</label>
      <input v-model="n1" class="form-input" placeholder="例如：3233 或 0xc9b..." />
    </div>
    <div class="mb-4">
      <label class="block mb-1">e</label>
      <input v-model="e1" class="form-input" placeholder="例如：65537" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">c（密文）</label>
      <textarea v-model="c1" class="form-input form-input-lg" placeholder="密文数值..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">p、q（可选，加速解密）</label>
      <div class="flex gap-2">
        <input v-model="p1" class="form-input flex-1" placeholder="p（可选）" />
        <input v-model="q1" class="form-input flex-1" placeholder="q（可选）" />
      </div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">d（可选）</label>
      <input v-model="d1" class="form-input" placeholder="私钥指数（可选）" />
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="rsaBasic">解密</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== RSA 质因数分解 ===== -->
  <div v-else-if="toolId === 'rsa-factor'">
    <ToolPageTitle title="RSA 质因数分解" />
    <p class="mb-4 text-gray-500">分解 n 得到 p、q。依次尝试：试除法 → Fermat（p/q 接近）→ Pollard rho。建议 n 不超过 512 位</p>
    <div class="mb-4">
      <label class="block mb-1">n（十进制或 0x 十六进制）</label>
      <textarea v-model="n1" class="form-input form-input-lg" placeholder="要分解的模数..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="rsaFactor">分解</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== RSA 共模攻击 ===== -->
  <div v-else-if="toolId === 'rsa-common'">
    <ToolPageTitle title="RSA 共模攻击" />
    <p class="mb-4 text-gray-500">同一明文用相同 n、不同 e 加密两次（gcd(e1,e2)=1），无需分解即可恢复明文</p>
    <div class="mb-4">
      <label class="block mb-1">n（共同的模数）</label>
      <input v-model="n1" class="form-input" placeholder="十进制或 0x hex" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">e1、c1</label>
      <div class="flex gap-2">
        <input v-model="e1" class="form-input flex-1" placeholder="e1" />
        <input v-model="c1" class="form-input flex-1" placeholder="c1" />
      </div>
    </div>
    <div class="mb-4">
      <label class="block mb-1">e2、c2</label>
      <div class="flex gap-2">
        <input v-model="e2" class="form-input flex-1" placeholder="e2" />
        <input v-model="c2" class="form-input flex-1" placeholder="c2" />
      </div>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="rsaCommon">攻击</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== RSA 低指数广播攻击 ===== -->
  <div v-else-if="toolId === 'rsa-broadcast'">
    <ToolPageTitle title="RSA 低指数广播攻击" />
    <p class="mb-4 text-gray-500">同一明文 m 用相同 e（通常 e=3）加密成多组 (n, c)，n 两两互质。CRT 合并后开 e 次方恢复明文</p>
    <div class="mb-4">
      <label class="block mb-1">e</label>
      <input v-model="broadE" class="form-input" placeholder="3" style="max-width:120px" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">分组数量（每组一行：n,c）</label>
      <textarea v-model="broadGroups" class="form-input form-input-lg" placeholder="每行格式：n 空格 c&#10;例如：&#10;99991 83727&#10;99989 45212&#10;99971 91834"></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="rsaBroadcast">攻击</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== RSA Wiener 攻击 ===== -->
  <div v-else-if="toolId === 'rsa-wiener'">
    <ToolPageTitle title="RSA Wiener 攻击" />
    <p class="mb-4 text-gray-500">私钥指数 d 较小时（d &lt; n^0.25/3），用连分数展开 e/n 恢复 d 与 p、q</p>
    <div class="mb-4">
      <label class="block mb-1">n</label>
      <input v-model="n1" class="form-input" placeholder="十进制或 0x hex" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">e（通常很大）</label>
      <textarea v-model="e1" class="form-input form-input-lg" placeholder="公钥指数..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="rsaWiener">攻击</button>
    <ResultBox label="结果" :value="output" lg />
  </div>

  <!-- ===== RSA 已知 d 解密 ===== -->
  <div v-else-if="toolId === 'rsa-known-d'">
    <ToolPageTitle title="RSA 已知 d 解密" />
    <p class="mb-4 text-gray-500">已知私钥指数 d，直接计算 m = c^d mod n（无需 p、q）</p>
    <div class="mb-4">
      <label class="block mb-1">n</label>
      <input v-model="n1" class="form-input" placeholder="十进制或 0x hex" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">d（私钥指数）</label>
      <textarea v-model="d1" class="form-input form-input-lg" placeholder="私钥指数..."></textarea>
    </div>
    <div class="mb-4">
      <label class="block mb-1">c（密文）</label>
      <textarea v-model="c1" class="form-input form-input-lg" placeholder="密文数值..."></textarea>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="rsaKnownD">解密</button>
    <ResultBox label="结果" :value="output" lg />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import * as rsa from '../../utils/ctf-rsa.js'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const props = defineProps({ toolId: { type: String, required: true } })
const output = ref('')
const n1 = ref('')
const e1 = ref('')
const c1 = ref('')
const p1 = ref('')
const q1 = ref('')
const d1 = ref('')
const e2 = ref('')
const c2 = ref('')
const broadE = ref('3')
const broadGroups = ref('')

function fmtResult(label, obj) {
  if (obj.error) return `❌ ${obj.error}`
  const lines = []
  if (obj.detail) lines.push(obj.detail)
  if (obj.p) lines.push(`p = ${obj.p}`)
  if (obj.q) lines.push(`q = ${obj.q}`)
  if (obj.d) lines.push(`d = ${obj.d}`)
  if (obj.phi) lines.push(`φ(n) = ${obj.phi}`)
  if (obj.m !== undefined) {
    lines.push(`m = ${obj.m}`)
    lines.push(`m (hex) = ${obj.hex}`)
    lines.push(`m 文本: ${obj.text}`)
  }
  return lines.join('\n')
}

function parseNum(val, name) {
  if (!val || !String(val).trim()) return null
  const n = rsa.parseBigInt(val)
  if (n === null) {
    output.value = `❌ ${name} 格式无效（需要十进制数字或 0x 前缀的十六进制）`
    return undefined
  }
  return n
}

function rsaBasic() {
  const n = parseNum(n1.value, 'n'); if (n === undefined) return
  const e = parseNum(e1.value, 'e'); if (e === undefined) return
  const c = parseNum(c1.value, 'c'); if (c === undefined) return
  if (n === null || e === null || c === null) return output.value = '❌ 请填写 n、e、c'
  const p = parseNum(p1.value, 'p'), q = parseNum(q1.value, 'q'), d = parseNum(d1.value, 'd')
  const result = rsa.rsaBasicDecrypt(n, e, c, { p, q, d })
  output.value = fmtResult('解密', result)
}

function rsaFactor() {
  const n = parseNum(n1.value, 'n'); if (n === undefined) return
  if (n === null) return output.value = '❌ 请填写 n'
  const result = rsa.rsaFactorize(n)
  output.value = fmtResult('分解', result)
}

function rsaCommon() {
  const n = parseNum(n1.value, 'n'); if (n === undefined) return
  const eA = parseNum(e1.value, 'e1'), cA = parseNum(c1.value, 'c1')
  const eB = parseNum(e2.value, 'e2'), cB = parseNum(c2.value, 'c2')
  if ([n, eA, cA, eB, cB].some((v) => v === null)) return output.value = '❌ 请填写 n、e1、c1、e2、c2'
  const result = rsa.rsaCommonModulusAttack(n, eA, cA, eB, cB)
  output.value = fmtResult('共模', result)
}

function rsaBroadcast() {
  const e = rsa.parseBigInt(broadE.value || '3')
  const lines = broadGroups.value.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return output.value = '❌ 至少需要 2 组 (n, c)'
  const moduli = [], ciphers = []
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/)
    if (parts.length < 2) return output.value = `❌ 第 ${i + 1} 行格式错误：需要 "n c"`
    const n = rsa.parseBigInt(parts[0]), c = rsa.parseBigInt(parts[1])
    if (n === null || c === null) return output.value = `❌ 第 ${i + 1} 行数值格式无效`
    moduli.push(n); ciphers.push(c)
  }
  const result = rsa.rsaBroadcastAttack(ciphers, moduli, e)
  output.value = fmtResult('广播', result)
}

function rsaWiener() {
  const n = parseNum(n1.value, 'n'); if (n === undefined) return
  const e = parseNum(e1.value, 'e'); if (e === undefined) return
  if (n === null || e === null) return output.value = '❌ 请填写 n、e'
  const result = rsa.rsaWienerAttack(n, e)
  output.value = fmtResult('Wiener', result)
}

function rsaKnownD() {
  const n = parseNum(n1.value, 'n'); if (n === undefined) return
  const d = parseNum(d1.value, 'd'); if (d === undefined) return
  const c = parseNum(c1.value, 'c'); if (c === undefined) return
  if (n === null || d === null || c === null) return output.value = '❌ 请填写 n、d、c'
  const result = rsa.rsaKnownDDecrypt(n, d, c)
  output.value = fmtResult('解密', result)
}

useClearOnInput([n1, e1, c1, p1, q1, d1, e2, c2, broadE, broadGroups], () => { output.value = '' })
</script>
