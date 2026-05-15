<template>
  <component v-if="delegatedComponent" :is="delegatedComponent" />
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps({ toolId: { type: String, required: true } })

const delegated = {
  aes: defineAsyncComponent(() => import('./CryptoCipherAes.vue')),
  des: defineAsyncComponent(() => import('./CryptoCipherDes.vue')),
  sm4: defineAsyncComponent(() => import('./CryptoCipherSm4.vue')),
  rsa: defineAsyncComponent(() => import('./CryptoCipherRsa.vue')),
  sm2: defineAsyncComponent(() => import('./CryptoCipherSm2.vue')),
  chacha20: defineAsyncComponent(() => import('./CryptoCipherChacha20.vue')),
}

const delegatedComponent = computed(() => delegated[props.toolId] || null)
</script>
