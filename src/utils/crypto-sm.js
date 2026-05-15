import {
  ab2hex,
  byteArrayToUint8Array,
  hex2ab,
  normalizeHexInput,
  normalizeInputBytes,
  normalizeKey16,
  smCrypto,
  str2ab,
} from './crypto-common.js'

export function sm3(text) {
  try { return smCrypto.sm3(text) } catch (error) { return `SM3 错误: ${error.message}` }
}

export function sm4Encrypt(text, key, mode, ivStr, options = {}) {
  try {
    const plainEncoding = options.plainEncoding === 'hex' ? 'hex' : 'utf8'
    const padding = options.padding === 'none' ? 'none' : 'pkcs#7'
    const plainBytes = normalizeInputBytes(text, plainEncoding)
    if (padding === 'none' && plainBytes.length % 16 !== 0) {
      return 'SM4 加密错误: 明文长度必须是 16 字节的整数倍（无填充模式）'
    }
    const hexKey = normalizeKey16(key)
    let hexIV = '00000000000000000000000000000000'
    if (ivStr) hexIV = /^[0-9a-fA-F]{32}$/.test(ivStr) ? ivStr.toLowerCase() : normalizeKey16(ivStr)
    const modeLower = (mode || 'ecb').toLowerCase()
    const inputValue = plainEncoding === 'hex' ? Array.from(plainBytes) : text
    const result = modeLower === 'cbc'
      ? smCrypto.sm4.encrypt(inputValue, hexKey, { mode: 'cbc', iv: hexIV, padding })
      : smCrypto.sm4.encrypt(inputValue, hexKey, { mode: 'ecb', padding })
    return typeof result === 'string' ? result.toUpperCase() : ab2hex(byteArrayToUint8Array(result)).toUpperCase()
  } catch (error) {
    return `SM4 加密错误: ${error.message}`
  }
}

export function sm4Decrypt(hexText, key, mode, ivStr, options = {}) {
  try {
    const padding = options.padding === 'none' ? 'none' : 'pkcs#7'
    const hexKey = normalizeKey16(key)
    let hexIV = '00000000000000000000000000000000'
    if (ivStr) hexIV = /^[0-9a-fA-F]{32}$/.test(ivStr) ? ivStr.toLowerCase() : normalizeKey16(ivStr)
    const modeLower = (mode || 'ecb').toLowerCase()
    const params = { mode: modeLower, padding, output: 'array' }
    if (modeLower === 'cbc') params.iv = hexIV
    const result = smCrypto.sm4.decrypt(normalizeHexInput(hexText), hexKey, params)
    return ab2hex(byteArrayToUint8Array(result)).toUpperCase()
  } catch (error) {
    return `SM4 解密错误: ${error.message}`
  }
}

export function sm2GenerateKey() {
  const keypair = smCrypto.sm2.generateKeyPairHex()
  return { publicKey: keypair.publicKey, privateKey: keypair.privateKey }
}

export function sm2Encrypt(text, publicKey, options = {}) {
  try {
    if (!publicKey) return '错误：请先输入公钥'
    const cipherMode = options.cipherMode === 'c1c2c3' ? 0 : 1
    const plainEncoding = options.plainEncoding === 'hex' ? 'hex' : 'utf8'
    const inputValue = plainEncoding === 'hex' ? Array.from(normalizeInputBytes(text, 'hex')) : text
    return smCrypto.sm2.doEncrypt(inputValue, publicKey, cipherMode)
  } catch (error) {
    return `SM2 加密错误: ${error.message}`
  }
}

export function sm2Decrypt(hexCipher, privateKey, options = {}) {
  try {
    if (!privateKey) return '错误：请先输入私钥'
    const cipherMode = options.cipherMode === 'c1c2c3' ? 0 : 1
    const result = smCrypto.sm2.doDecrypt(normalizeHexInput(hexCipher), privateKey, cipherMode, { output: 'array' })
    return ab2hex(byteArrayToUint8Array(result)).toUpperCase()
  } catch (error) {
    return `SM2 解密错误: ${error.message}`
  }
}

export function sm2Sign(text, privateKey, options = {}) {
  try {
    if (!privateKey) return '错误：请先输入私钥'
    const inputEncoding = options.inputEncoding === 'hex' ? 'hex' : 'utf8'
    const signatureFormat = options.signatureFormat === 'der' ? 'der' : 'plain'
    const inputValue = inputEncoding === 'hex' ? Array.from(normalizeInputBytes(text, 'hex')) : text
    return smCrypto.sm2.doSignature(inputValue, privateKey, { der: signatureFormat === 'der' })
  } catch (error) {
    return `SM2 签名错误: ${error.message}`
  }
}

export function sm2Verify(text, signature, publicKey, options = {}) {
  try {
    if (!publicKey) return '错误：请先输入公钥'
    const inputEncoding = options.inputEncoding === 'hex' ? 'hex' : 'utf8'
    const signatureFormat = options.signatureFormat === 'der' ? 'der' : 'plain'
    const inputValue = inputEncoding === 'hex' ? Array.from(normalizeInputBytes(text, 'hex')) : text
    const result = smCrypto.sm2.doVerifySignature(inputValue, signature, publicKey, { der: signatureFormat === 'der' })
    return result ? '✅ 签名验证通过' : '❌ 签名验证失败'
  } catch (error) {
    return `SM2 验签错误: ${error.message}`
  }
}

export async function hmac(algorithm, key, text) {
  if (algorithm.toLowerCase() !== 'sm3') return null
  return hmacSm3(key, text)
}

function hmacSm3(key, text) {
  const blockSize = 64
  let keyBytes = typeof key === 'string' ? normalizeFlexibleBytes(key) : key
  if (keyBytes.length > blockSize) {
    keyBytes = hex2ab(smCrypto.sm3(keyBytes))
  }
  const kPad = new Uint8Array(blockSize)
  kPad.set(new Uint8Array(keyBytes))
  const iPad = kPad.map((b) => b ^ 0x36)
  const oPad = kPad.map((b) => b ^ 0x5C)
  const textBytes = str2ab(text)
  const innerInput = new Uint8Array(blockSize + textBytes.length)
  innerInput.set(iPad)
  innerInput.set(textBytes, blockSize)
  const innerHash = smCrypto.sm3(innerInput)
  const innerHashBytes = hex2ab(innerHash)
  const outerInput = new Uint8Array(blockSize + 32)
  outerInput.set(oPad)
  outerInput.set(innerHashBytes, blockSize)
  return smCrypto.sm3(outerInput)
}

function normalizeFlexibleBytes(input) {
  if (typeof input === 'string' && input.length >= 16 && input.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(input)) {
    return hex2ab(input)
  }
  return str2ab(input || '')
}