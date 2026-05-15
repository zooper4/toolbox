<template>
  <div>
    <ToolPageTitle title="二维码生成" />
    <p class="mb-4 text-gray-500">生成文本或 WiFi 配置的二维码</p>
    <div class="mb-4">
      <label class="block mb-1">类型</label>
      <select v-model="type" class="form-input">
        <option value="text">文本 / URL</option>
        <option value="wifi">WiFi 配置</option>
      </select>
    </div>
    <div v-if="type==='text'" class="mb-4">
      <label class="block mb-1">内容</label>
      <textarea v-model="text" class="form-input form-input-lg" placeholder="输入文本或 URL..."></textarea>
    </div>
    <div v-else class="mb-4">
      <label class="block mb-1">SSID</label>
      <input v-model="ssid" class="form-input" placeholder="WiFi 名称" />
      <label class="block mb-1 mt-2">密码</label>
      <input v-model="wifipass" class="form-input" type="password" placeholder="WiFi 密码" />
      <label class="block mb-1 mt-2">加密方式</label>
      <select v-model="enc" class="form-input">
        <option value="WPA">WPA/WPA2</option>
        <option value="WEP">WEP</option>
        <option value="nopass">无密码</option>
      </select>
    </div>
    <div class="mb-4">
      <label class="block mb-1">尺寸</label>
      <div class="flex items-center gap-2">
        <input v-model.number="size" class="form-input" type="number" min="128" max="1024" step="64" style="max-width:80px" />
        <span class="tag-row">
          <span class="tag" :class="{active: size===128}" @click="size=128">128</span>
          <span class="tag" :class="{active: size===256}" @click="size=256">256</span>
          <span class="tag" :class="{active: size===512}" @click="size=512">512</span>
        </span>
      </div>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="generate">生成</button>
    <div class="mb-4">
      <label class="block mb-1">结果</label>
      <div class="result-box flex items-center justify-center" :style="{ minHeight: size + 'px' }">
        <span v-if="qrState === 'idle'" class="qr-placeholder">请输入内容</span>
        <span v-else-if="qrState === 'loading'" class="qr-placeholder">生成中...</span>
        <img v-else-if="qrUrl" class="qr-image" :src="qrUrl" alt="二维码" />
        <span v-else class="qr-placeholder">{{ qrError }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { generateQrCode } from '../../utils/generator-tools.js'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const type = ref('text')
const text = ref('')
const ssid = ref('')
const wifipass = ref('')
const enc = ref('WPA')
const size = ref(256)
const qrUrl = ref('')
const qrError = ref('')
const qrState = ref('idle')
let qrRequestId = 0

useClearOnInput([type, text, ssid, wifipass, enc, size], () => {
  qrUrl.value = ''
  qrError.value = ''
  qrState.value = 'idle'
})

function wifiString() {
  return `WIFI:T:${enc.value};S:${ssid.value};P:${wifipass.value};${enc.value==='nopass'?'H:true;':''};`
}

const qrPayload = computed(() => (type.value === 'text' ? text.value : wifiString()))

async function generate() {
  const value = qrPayload.value
  const requestId = ++qrRequestId

  if (!value) {
    qrUrl.value = ''
    qrError.value = ''
    qrState.value = 'idle'
    return
  }

  qrState.value = 'loading'
  qrError.value = ''
  const result = await generateQrCode(value, { width: size.value, margin: 2 })

  if (requestId !== qrRequestId) return

  if (typeof result === 'string') {
    qrUrl.value = result
    qrState.value = 'ready'
    return
  }

  qrUrl.value = ''
  qrError.value = result.error || '二维码生成失败'
  qrState.value = 'error'
}

watch([type, text, ssid, wifipass, enc, size], () => {
  generate()
}, { immediate: true })
</script>

<style scoped>
.qr-placeholder {
  color: #888;
}

.qr-image {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>

