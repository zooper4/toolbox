import {
  rsaDecrypt,
  rsaEncrypt,
  rsaGenerateKey,
  rsaParsePrivateKey,
  rsaSign,
  rsaVerify,
} from '../utils/crypto-rsa.js'
import {
  sm2Decrypt,
  sm2Encrypt,
  sm2GenerateKey,
  sm2Sign,
  sm2Verify,
  sm4Decrypt,
  sm4Encrypt,
} from '../utils/crypto-sm.js'
import {
  chacha20Decrypt,
  chacha20Encrypt,
  chacha20GenerateKey,
} from '../utils/crypto-chacha.js'

const handlers = {
  rsaGenerateKey,
  rsaEncrypt,
  rsaDecrypt,
  rsaSign,
  rsaVerify,
  rsaParsePrivateKey,
  sm2GenerateKey,
  sm2Encrypt,
  sm2Decrypt,
  sm2Sign,
  sm2Verify,
  sm4Encrypt,
  sm4Decrypt,
  chacha20GenerateKey,
  chacha20Encrypt,
  chacha20Decrypt,
}

self.addEventListener('message', async (event) => {
  const { id, action, args = [] } = event.data || {}
  const handler = handlers[action]
  if (!handler) {
    self.postMessage({ id, error: `未知加密任务: ${action}` })
    return
  }
  try {
    const result = await handler(...args)
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) })
  }
})