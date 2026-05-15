let workerInstance = null
let requestId = 0
const pending = new Map()

function resetWorker(error) {
  for (const { reject } of pending.values()) reject(error)
  pending.clear()
  workerInstance?.terminate()
  workerInstance = null
}

function getWorker() {
  if (workerInstance) return workerInstance
  workerInstance = new Worker(new URL('../workers/crypto-heavy.worker.js', import.meta.url), { type: 'module' })
  workerInstance.addEventListener('message', (event) => {
    const { id, result, error } = event.data || {}
    const task = pending.get(id)
    if (!task) return
    pending.delete(id)
    if (error) task.reject(new Error(error))
    else task.resolve(result)
  })
  workerInstance.addEventListener('error', (event) => {
    resetWorker(event.error || new Error('加密 Worker 执行失败'))
  })
  return workerInstance
}

async function runFallback(action, args) {
  const cryptoUtils = await import('./crypto-utils.js')
  return cryptoUtils[action](...args)
}

async function runCryptoTask(action, args) {
  if (typeof Worker === 'undefined') {
    return runFallback(action, args)
  }
  const worker = getWorker()
  const id = ++requestId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, action, args })
  })
}

export function rsaGenerateKey(bits = 2048) { return runCryptoTask('rsaGenerateKey', [bits]) }
export function rsaEncrypt(text, publicKey, options = {}) { return runCryptoTask('rsaEncrypt', [text, publicKey, options]) }
export function rsaDecrypt(cipherText, privateKey, options = {}) { return runCryptoTask('rsaDecrypt', [cipherText, privateKey, options]) }
export function rsaSign(text, privateKey, options = {}) { return runCryptoTask('rsaSign', [text, privateKey, options]) }
export function rsaVerify(text, signature, publicKey, options = {}) { return runCryptoTask('rsaVerify', [text, signature, publicKey, options]) }
export function sm2GenerateKey() { return runCryptoTask('sm2GenerateKey', []) }
export function sm2Encrypt(text, publicKey, options = {}) { return runCryptoTask('sm2Encrypt', [text, publicKey, options]) }
export function sm2Decrypt(cipherText, privateKey, options = {}) { return runCryptoTask('sm2Decrypt', [cipherText, privateKey, options]) }
export function sm2Sign(text, privateKey, options = {}) { return runCryptoTask('sm2Sign', [text, privateKey, options]) }
export function sm2Verify(text, signature, publicKey, options = {}) { return runCryptoTask('sm2Verify', [text, signature, publicKey, options]) }
export function sm4Encrypt(text, key, mode = 'ecb', iv, options = {}) { return runCryptoTask('sm4Encrypt', [text, key, mode, iv, options]) }
export function sm4Decrypt(cipherText, key, mode = 'ecb', iv, options = {}) { return runCryptoTask('sm4Decrypt', [cipherText, key, mode, iv, options]) }
export function chacha20GenerateKey() { return runCryptoTask('chacha20GenerateKey', []) }
export function chacha20Encrypt(text, keyHex, nonceHex, options = {}) { return runCryptoTask('chacha20Encrypt', [text, keyHex, nonceHex, options]) }
export function chacha20Decrypt(cipherHex, keyHex, nonceHex, options = {}) { return runCryptoTask('chacha20Decrypt', [cipherHex, keyHex, nonceHex, options]) }