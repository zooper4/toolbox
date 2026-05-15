import { ab2hex, bufToBase64, hex2ab, str2ab } from './crypto-common.js'

const CHACHA_CONSTANTS = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]

function chacha20QuarterRound(a, b, c, d) {
  a = (a + b) | 0; d ^= a; d = (d << 16) | (d >>> 16)
  c = (c + d) | 0; b ^= c; b = (b << 12) | (b >>> 20)
  a = (a + b) | 0; d ^= a; d = (d << 8) | (d >>> 24)
  c = (c + d) | 0; b ^= c; b = (b << 7) | (b >>> 25)
  return [a, b, c, d]
}

function chacha20Block(key, counter, nonce) {
  const state = new Uint32Array(16)
  state[0] = CHACHA_CONSTANTS[0]
  state[1] = CHACHA_CONSTANTS[1]
  state[2] = CHACHA_CONSTANTS[2]
  state[3] = CHACHA_CONSTANTS[3]
  for (let i = 0; i < 8; i++) {
    state[4 + i] = (key[4 * i + 3] << 24) | (key[4 * i + 2] << 16) | (key[4 * i + 1] << 8) | key[4 * i]
  }
  state[12] = counter
  state[13] = (nonce[3] << 24) | (nonce[2] << 16) | (nonce[1] << 8) | nonce[0]
  state[14] = (nonce[7] << 24) | (nonce[6] << 16) | (nonce[5] << 8) | nonce[4]
  state[15] = (nonce[11] << 24) | (nonce[10] << 16) | (nonce[9] << 8) | nonce[8]

  const working = new Uint32Array(state)
  for (let i = 0; i < 10; i++) {
    [working[0], working[4], working[8], working[12]] = chacha20QuarterRound(working[0], working[4], working[8], working[12])
    [working[1], working[5], working[9], working[13]] = chacha20QuarterRound(working[1], working[5], working[9], working[13])
    [working[2], working[6], working[10], working[14]] = chacha20QuarterRound(working[2], working[6], working[10], working[14])
    [working[3], working[7], working[11], working[15]] = chacha20QuarterRound(working[3], working[7], working[11], working[15])
    [working[0], working[5], working[10], working[15]] = chacha20QuarterRound(working[0], working[5], working[10], working[15])
    [working[1], working[6], working[11], working[12]] = chacha20QuarterRound(working[1], working[6], working[11], working[12])
    [working[2], working[7], working[8], working[13]] = chacha20QuarterRound(working[2], working[7], working[8], working[13])
    [working[3], working[4], working[9], working[14]] = chacha20QuarterRound(working[3], working[4], working[9], working[14])
  }

  const output = new Uint8Array(64)
  for (let i = 0; i < 16; i++) {
    const val = (working[i] + state[i]) >>> 0
    output[4 * i] = val & 0xFF
    output[4 * i + 1] = (val >>> 8) & 0xFF
    output[4 * i + 2] = (val >>> 16) & 0xFF
    output[4 * i + 3] = (val >>> 24) & 0xFF
  }
  return output
}

function chacha20EncryptInternal(key, counter, nonce, plaintext) {
  const keyBytes = typeof key === 'string' ? hex2ab(key) : key
  const nonceBytes = typeof nonce === 'string' ? hex2ab(nonce) : nonce
  const plainBytes = typeof plaintext === 'string' ? str2ab(plaintext) : plaintext
  const result = new Uint8Array(plainBytes.length)
  let blockCount = counter
  let offset = 0

  while (offset < plainBytes.length) {
    const keystream = chacha20Block(keyBytes, blockCount, nonceBytes)
    blockCount = (blockCount + 1) >>> 0
    for (let i = 0; i < 64 && offset < plainBytes.length; i++, offset++) {
      result[offset] = plainBytes[offset] ^ keystream[i]
    }
  }
  return result
}

export function chacha20GenerateKey() {
  const key = new Uint8Array(32)
  const nonce = new Uint8Array(12)
  crypto.getRandomValues(key)
  crypto.getRandomValues(nonce)
  return { keyHex: ab2hex(key), nonceHex: ab2hex(nonce) }
}

export function chacha20Encrypt(plaintext, keyHex, nonceHex, options = {}) {
  try {
    const plainEncoding = options.plainEncoding === 'hex' ? 'hex' : 'utf8'
    const counter = Number.isInteger(options.counter) ? options.counter : parseInt(options.counter ?? '0', 10) || 0
    const inputValue = plainEncoding === 'hex' ? hex2ab(plaintext.replace(/\s+/g, '')) : plaintext
    const result = chacha20EncryptInternal(keyHex, counter >>> 0, nonceHex, inputValue)
    return { hex: ab2hex(result), base64: bufToBase64(result) }
  } catch (error) {
    return { error: `ChaCha20 加密错误: ${error.message}` }
  }
}

export function chacha20Decrypt(cipherHex, keyHex, nonceHex, options = {}) {
  try {
    const counter = Number.isInteger(options.counter) ? options.counter : parseInt(options.counter ?? '0', 10) || 0
    const cipherBytes = hex2ab(cipherHex)
    const result = chacha20EncryptInternal(keyHex, counter >>> 0, nonceHex, cipherBytes)
    return ab2hex(result).toUpperCase()
  } catch (error) {
    return `ChaCha20 解密错误: ${error.message}`
  }
}