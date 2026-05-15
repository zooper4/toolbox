<template>
  <component v-if="delegatedComponent" :is="delegatedComponent" />

  <div v-else>
    <ToolPageTitle title="占位文本（Lorem Ipsum）" />
    <p class="mb-4 text-gray-500">生成用于原型和排版的占位文本</p>
    <div class="mb-4">
      <label class="block mb-1">段落数</label>
      <input v-model.number="paragraphs" class="form-input" type="number" min="1" max="50" style="max-width:150px" />
    </div>
    <div class="mb-4">
      <label class="block mb-1">每段句子数</label>
      <div class="flex items-center gap-2">
        <input v-model.number="sentences" class="form-input" type="number" min="1" max="20" style="max-width:80px" />
        <span class="tag-row">
          <span class="tag" :class="{ active: sentences === 1 }" @click="sentences = 1">1</span>
          <span class="tag" :class="{ active: sentences === 3 }" @click="sentences = 3">3</span>
          <span class="tag" :class="{ active: sentences === 5 }" @click="sentences = 5">5</span>
        </span>
      </div>
    </div>
    <button class="btn btn-primary btn-block mb-4" @click="output = generateLoremIpsum(paragraphs || 3, sentences || 4, 8)">生成</button>
    <ResultBox label="结果" :value="output" lg />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useClearOnInput } from '../composables/useClearOnInput.js'
import { generateLoremIpsum } from '../../utils/generator-tools.js'
import GeneratorUUID from './GeneratorUUID.vue'
import GeneratorPassword from './GeneratorPassword.vue'
import GeneratorQRCode from './GeneratorQRCode.vue'
import ResultBox from './shared/ResultBox.vue'
import ToolPageTitle from './shared/ToolPageTitle.vue'

const props = defineProps({
  toolId: { type: String, required: true },
})

const delegated = {
  uuid: GeneratorUUID,
  password: GeneratorPassword,
  qrcode: GeneratorQRCode,
}

const delegatedComponent = computed(() => delegated[props.toolId] || null)
const paragraphs = ref(3)
const sentences = ref(4)
const output = ref('')

useClearOnInput([paragraphs, sentences], () => { output.value = '' })
</script>

