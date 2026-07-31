<template>
  <div>
    <ToolPageTitle title="二维码识别" />
    <p class="mb-4 text-gray-500">识别图片中的二维码内容，支持上传、粘贴图片或 Data URI</p>

    <div class="mb-4">
      <label class="block mb-1 text-sm font-medium" style="color:var(--muted-foreground);">Data URI / Base64</label>
      <div class="flex gap-2">
        <textarea
          v-model="dataUriInput"
          class="form-input flex-1 min-h-0"
          rows="2"
          placeholder="粘贴 data:image/...;base64, 开头的 Data URI，或纯 Base64 数据"
        ></textarea>
      </div>
      <div class="flex gap-2 mt-2">
        <button class="btn btn-primary btn-sm" @click="scanFromDataUri">识别 Data URI</button>
        <button class="btn btn-ghost btn-sm" @click="dataUriInput = ''">清除</button>
      </div>
    </div>

    <div class="mb-4 text-center" style="color:var(--muted-foreground);font-size:0.75rem;">—— 或 ——</div>

    <div
      class="drop-zone"
      :class="{ 'has-image': imageUrl, 'is-drag-over': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
      tabindex="0"
      @paste="handlePaste"
    >
      <div v-if="!imageUrl" class="drop-zone-content">
        <Scan class="drop-zone-icon" :size="48" :stroke-width="1.5" />
        <p class="drop-zone-text">点击上传图片，或粘贴图片 (Ctrl+V)</p>
      </div>
      <img v-else :src="imageUrl" alt="预览" class="drop-zone-image" />
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary" @click="triggerFileSelect">选择图片</button>
      <button v-if="imageUrl" class="btn btn-secondary" @click="clearImage">清除图片</button>
    </div>

    <div v-if="scanState === 'loading'" class="mb-4 text-center text-gray-500">识别中...</div>
    <div v-else-if="scanState === 'error'" class="mb-4 text-center" style="color:var(--muted-foreground);">{{ scanError }}</div>

    <ResultBox v-if="result" label="识别结果" :value="result" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Scan } from 'lucide-vue-next'
import jsQR from 'jsqr'
import ToolPageTitle from './shared/ToolPageTitle.vue'
import ResultBox from './shared/ResultBox.vue'

const fileInput = ref(null)
const imageUrl = ref('')
const dataUriInput = ref('')
const result = ref('')
const scanError = ref('')
const scanState = ref('idle') // idle | loading | error
const isDragOver = ref(false)
let scanRequestId = 0
let fromDataUri = false

function scanFromDataUri() {
  let input = dataUriInput.value.trim()
  if (!input) {
    scanState.value = 'error'
    scanError.value = '请输入 Data URI 或 Base64 数据'
    return
  }

  // 如果纯 base64，自动添加前缀
  if (!input.startsWith('data:')) {
    // 尝试判断是否为 valid base64 字符
    if (/^[A-Za-z0-9+/=]+$/.test(input)) {
      input = 'data:image/png;base64,' + input
    } else {
      scanState.value = 'error'
      scanError.value = '请输入有效的 Data URI 或 Base64 数据'
      return
    }
  }

  scanState.value = 'loading'
  scanError.value = ''
  result.value = ''

  const img = new Image()
  img.onload = () => {
    // 标记为来自 Data URI，避免 watch 重复触发
    fromDataUri = true
    imageUrl.value = input
    scanImage(img)
    fromDataUri = false
  }
  img.onerror = () => {
    scanState.value = 'error'
    scanError.value = '图片加载失败，请检查 Data URI 格式是否正确'
  }
  img.src = input
}

function scanImage(imageElement) {
  const requestId = ++scanRequestId
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = imageElement

  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  if (canvas.width === 0 || canvas.height === 0) {
    scanState.value = 'error'
    scanError.value = '无法读取图片尺寸'
    return
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  scanState.value = 'loading'
  scanError.value = ''
  result.value = ''

  // 使用 nextTick 确保 loading 状态先渲染
  nextTick(() => {
    let code = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionModes: ['LIGHT_MODULES', 'DARK_MODULES']
    })

    if (requestId !== scanRequestId) return

    if (code) {
      result.value = code.data
      scanState.value = 'idle'
    } else {
      // 尝试灰度化处理再识别
      const grayData = new Uint8ClampedArray(imageData.data.length)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = Math.round(0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2])
        grayData[i] = grayData[i + 1] = grayData[i + 2] = gray
        grayData[i + 3] = 255
      }
      code = jsQR(grayData, canvas.width, canvas.height, {
        inversionModes: ['LIGHT_MODULES', 'DARK_MODULES']
      })

      if (requestId !== scanRequestId) return

      if (code) {
        result.value = code.data
        scanState.value = 'idle'
      } else {
        scanState.value = 'error'
        scanError.value = '未检测到二维码，请确保图片包含清晰的二维码'
      }
    }
  })
}

function triggerFileSelect() {
  fileInput.value?.click()
}

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) loadImageFile(file)
  // 清空 input 以便重复选择同一文件
  event.target.value = ''
}

function handleDrop(event) {
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    loadImageFile(file)
  }
}

function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        loadImageFile(file)
        break
      }
    }
  }
}

function loadImageFile(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    imageUrl.value = e.target.result
  }
  reader.readAsDataURL(file)
}

function clearImage() {
  imageUrl.value = ''
  result.value = ''
  scanError.value = ''
  scanState.value = 'idle'
}

function clearAll() {
  clearImage()
  dataUriInput.value = ''
}

// 当图片加载完成后自动识别（来自文件上传时）
watch(imageUrl, async (newUrl) => {
  if (!newUrl || fromDataUri) return
  await nextTick()
  const img = new Image()
  img.onload = () => {
    scanImage(img)
  }
  img.onerror = () => {
    scanState.value = 'error'
    scanError.value = '图片加载失败'
  }
  img.src = newUrl
})
</script>

<style scoped>
.drop-zone {
  position: relative;
  border: 2px dashed var(--muted-border, #d1d5db);
  border-radius: 8px;
  min-height: 200px;
  max-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  overflow: hidden;
  background-color: var(--muted-bg, #f9fafb);
}

.dark .drop-zone {
  background-color: #1a1a2e;
}

.drop-zone:hover,
.drop-zone.is-drag-over {
  border-color: var(--primary, #3b82f6);
  background-color: var(--primary-bg, #eff6ff);
}

.dark .drop-zone:hover,
.dark .drop-zone.is-drag-over {
  background-color: #1e2a4a;
}

.drop-zone.has-image {
  border-style: solid;
  border-color: var(--muted-border, #d1d5db);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.drop-zone-icon {
  color: var(--muted-foreground, #6b7280);
}

.drop-zone-text {
  color: var(--muted-foreground, #6b7280);
  font-size: 0.875rem;
}

.drop-zone-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.hidden {
  display: none;
}
</style>