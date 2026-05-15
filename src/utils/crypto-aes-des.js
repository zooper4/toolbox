import {
  ab2hex,
  base64ToBuf,
  bufToBase64,
  bytesToBinaryString,
  forge,
  getAesForgeMode,
  getWebCryptoSubtle,
  normalizeFixedLengthBytes,
  normalizeHexInput,
  normalizeInputBytes,
} from './crypto-common.js'

function str2ab(str) {
  return new TextEncoder().encode(str)
}

function hex2ab(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < hex.length; index += 2) bytes[index / 2] = parseInt(hex.substr(index, 2), 16)
  return bytes
}

export async function aesEncrypt(text, key, mode, ivStr, keySize, options = {}) {
  const plainEncoding = options.plainEncoding === 'hex' ? 'hex' : 'utf8'
  const padding = options.padding === 'none' ? 'none' : 'pkcs7'
  const ml = (mode || 'cbc').toLowerCase()
  const ks = parseInt(keySize) || 256
  const plainBytes = plainEncoding === 'hex' ? hex2ab(normalizeHexInput(text)) : str2ab(text)

  if ((ml === 'cbc' || ml === 'ecb') && padding === 'none') {
    try {
      const targetLen = ks / 8
      const forgeKey = bytesToBinaryString(normalizeFixedLengthBytes(key, targetLen))
      const forgeIv = bytesToBinaryString(normalizeFixedLengthBytes(ivStr || '0000000000000000', 16))
      const forgeMode = ml === 'ecb' ? 'AES-ECB' : 'AES-CBC'
      const cipher = forge.cipher.createCipher(forgeMode, forgeKey)
      cipher.start({ iv: forgeIv })
      cipher.update(forge.util.createBuffer(bytesToBinaryString(plainBytes)))
      const ok = cipher.finish((blockSize, input) => input.length() % blockSize === 0)
      if (!ok) return 'AES 加密错误: 明文长度必须是 16 字节的整数倍（无填充模式）'
      return forge.util.encode64(cipher.output.getBytes())
    } catch (error) {
      return 'AES 加密错误: ' + error.message
    }
  }

  const subtle = getWebCryptoSubtle()
  if (subtle && ml !== 'ecb') {
    try {
      const modes = { cbc: 'AES-CBC', gcm: 'AES-GCM', ctr: 'AES-CTR' }
      const targetLen = ks / 8
      const keyBytes = normalizeFixedLengthBytes(key, targetLen)
      const algo = { name: modes[ml] }
      if (ml === 'cbc') algo.iv = normalizeFixedLengthBytes(ivStr || '0000000000000000', 16)
      if (ml === 'gcm') algo.iv = normalizeFixedLengthBytes((ivStr || '000000000000000000000000').padEnd(24, '0').slice(0, 24), 12)
      if (ml === 'ctr') {
        algo.counter = normalizeFixedLengthBytes(ivStr || '0000000000000000', 16)
        algo.length = 64
      }
      const cryptoKey = await subtle.importKey('raw', keyBytes, algo, false, ['encrypt'])
      const enc = await subtle.encrypt(algo, cryptoKey, plainBytes)
      return bufToBase64(enc)
    } catch (error) {
      return 'AES 加密错误: ' + error.message
    }
  }

  try {
    const targetLen = ks / 8
    const forgeKey = bytesToBinaryString(normalizeFixedLengthBytes(key, targetLen))
    const forgeMode = getAesForgeMode(ml)
    const cipher = forge.cipher.createCipher(forgeMode, forgeKey)
    if (ml === 'gcm') {
      const forgeGcmIv = bytesToBinaryString(normalizeFixedLengthBytes((ivStr || '000000000000000000000000').padEnd(24, '0').slice(0, 24), 12))
      cipher.start({ iv: forgeGcmIv, tagLength: 128 })
      cipher.update(forge.util.createBuffer(bytesToBinaryString(plainBytes)))
      const ok = cipher.finish()
      if (!ok) return 'AES 加密错误: 加密失败'
      return forge.util.encode64(cipher.output.getBytes() + cipher.mode.tag.getBytes())
    }
    const forgeIv = bytesToBinaryString(normalizeFixedLengthBytes(ivStr || '0000000000000000', 16))
    cipher.start(ml === 'ecb' ? {} : { iv: forgeIv })
    cipher.update(forge.util.createBuffer(bytesToBinaryString(plainBytes)))
    const ok = cipher.finish()
    if (!ok) return 'AES 加密错误: 加密失败'
    return forge.util.encode64(cipher.output.getBytes())
  } catch (error) {
    return 'AES 加密错误: ' + error.message
  }
}

export async function aesDecrypt(b64Text, key, mode, ivStr, keySize, options = {}) {
  const padding = options.padding === 'none' ? 'none' : 'pkcs7'
  const ml = (mode || 'cbc').toLowerCase()
  const ks = parseInt(keySize) || 256

  if ((ml === 'cbc' || ml === 'ecb') && padding === 'none') {
    try {
      const targetLen = ks / 8
      const forgeKey = bytesToBinaryString(normalizeFixedLengthBytes(key, targetLen))
      const forgeIv = bytesToBinaryString(normalizeFixedLengthBytes(ivStr || '0000000000000000', 16))
      const forgeMode = ml === 'ecb' ? 'AES-ECB' : 'AES-CBC'
      const decipher = forge.cipher.createDecipher(forgeMode, forgeKey)
      decipher.start({ iv: forgeIv })
      decipher.update(forge.util.createBuffer(forge.util.decode64(b64Text)))
      const ok = decipher.finish(() => true)
      if (!ok) return '错误：解密失败（密钥/IV/密文无效）'
      return forge.util.bytesToHex(decipher.output.getBytes()).toUpperCase()
    } catch {
      return '错误：解密失败（密钥/IV/密文无效）'
    }
  }

  const subtle = getWebCryptoSubtle()
  if (subtle && ml !== 'ecb') {
    try {
      const modes = { cbc: 'AES-CBC', gcm: 'AES-GCM', ctr: 'AES-CTR' }
      const targetLen = ks / 8
      const keyBytes = normalizeFixedLengthBytes(key, targetLen)
      const algo = { name: modes[ml] }
      if (ml === 'cbc') algo.iv = normalizeFixedLengthBytes(ivStr || '0000000000000000', 16)
      if (ml === 'gcm') algo.iv = normalizeFixedLengthBytes((ivStr || '000000000000000000000000').padEnd(24, '0').slice(0, 24), 12)
      if (ml === 'ctr') {
        algo.counter = normalizeFixedLengthBytes(ivStr || '0000000000000000', 16)
        algo.length = 64
      }
      const cryptoKey = await subtle.importKey('raw', keyBytes, algo, false, ['decrypt'])
      const dec = await subtle.decrypt(algo, cryptoKey, base64ToBuf(b64Text))
      return ab2hex(dec).toUpperCase()
    } catch {
      return '错误：解密失败（密钥/IV/密文无效）'
    }
  }

  try {
    const targetLen = ks / 8
    const forgeKey = bytesToBinaryString(normalizeFixedLengthBytes(key, targetLen))
    const forgeMode = getAesForgeMode(ml)
    const decipher = forge.cipher.createDecipher(forgeMode, forgeKey)
    if (ml === 'gcm') {
      const payload = base64ToBuf(b64Text)
      if (payload.length < 16) return '错误：解密失败（密钥/IV/密文无效）'
      const encryptedBytes = payload.slice(0, -16)
      const tagBytes = payload.slice(-16)
      const forgeGcmIv = bytesToBinaryString(normalizeFixedLengthBytes((ivStr || '000000000000000000000000').padEnd(24, '0').slice(0, 24), 12))
      decipher.start({ iv: forgeGcmIv, tagLength: 128, tag: bytesToBinaryString(tagBytes) })
      decipher.update(forge.util.createBuffer(bytesToBinaryString(encryptedBytes)))
      const ok = decipher.finish()
      if (!ok) return '错误：解密失败（密钥/IV/密文无效）'
      return decipher.output.toHex().toUpperCase()
    }
    const forgeIv = bytesToBinaryString(normalizeFixedLengthBytes(ivStr || '0000000000000000', 16))
    decipher.start(ml === 'ecb' ? {} : { iv: forgeIv })
    decipher.update(forge.util.createBuffer(forge.util.decode64(b64Text)))
    const ok = decipher.finish()
    if (!ok) return '错误：解密失败（密钥/IV/密文无效）'
    return decipher.output.toHex().toUpperCase()
  } catch {
    return '错误：解密失败（密钥/IV/密文无效）'
  }
}

export async function desEncrypt(text, key, mode, ivStr, key2, key3, options = {}) {
  try {
    const plainEncoding = options.plainEncoding === 'hex' ? 'hex' : 'utf8'
    const padding = options.padding === 'none' ? 'none' : 'pkcs7'
    const blockMode = (options.blockMode || mode || 'cbc').toLowerCase() === 'ecb' ? 'ecb' : 'cbc'
    const dataBytes = normalizeInputBytes(text, plainEncoding)
    if (padding === 'none' && dataBytes.length % 8 !== 0) {
      return 'DES 加密失败: 明文长度必须是 8 字节的整数倍（无填充模式）'
    }

    const k1 = bytesToBinaryString(normalizeFixedLengthBytes(key, 8))
    const k2 = key2 ? bytesToBinaryString(normalizeFixedLengthBytes(key2, 8)) : k1
    const k3 = key3 ? bytesToBinaryString(normalizeFixedLengthBytes(key3, 8)) : k1
    const iv = bytesToBinaryString(normalizeFixedLengthBytes(ivStr || '00000000', 8))
    const isTripleDes = k1 !== k2 || k2 !== k3
    const algorithm = `${isTripleDes ? '3DES' : 'DES'}-${blockMode.toUpperCase()}`
    const cipher = forge.cipher.createCipher(algorithm, isTripleDes ? k1 + k2 + k3 : k1)
    cipher.start(blockMode === 'ecb' ? {} : { iv })
    cipher.update(forge.util.createBuffer(bytesToBinaryString(dataBytes)))
    const ok = padding === 'none' ? cipher.finish((blockSize, input) => input.length() % blockSize === 0) : cipher.finish()
    if (!ok) return 'DES 加密失败: 明文长度必须是 8 字节的整数倍（无填充模式）'
    return forge.util.encode64(cipher.output.getBytes())
  } catch (error) {
    return 'DES 加密失败: ' + error.message
  }
}

export async function desDecrypt(cipherB64, key, mode, ivStr, key2, key3, options = {}) {
  try {
    const padding = options.padding === 'none' ? 'none' : 'pkcs7'
    const blockMode = (options.blockMode || mode || 'cbc').toLowerCase() === 'ecb' ? 'ecb' : 'cbc'
    const k1 = bytesToBinaryString(normalizeFixedLengthBytes(key, 8))
    const k2 = key2 ? bytesToBinaryString(normalizeFixedLengthBytes(key2, 8)) : k1
    const k3 = key3 ? bytesToBinaryString(normalizeFixedLengthBytes(key3, 8)) : k1
    const iv = bytesToBinaryString(normalizeFixedLengthBytes(ivStr || '00000000', 8))
    const isTripleDes = k1 !== k2 || k2 !== k3
    const algorithm = `${isTripleDes ? '3DES' : 'DES'}-${blockMode.toUpperCase()}`
    const decipher = forge.cipher.createDecipher(algorithm, isTripleDes ? k1 + k2 + k3 : k1)
    decipher.start(blockMode === 'ecb' ? {} : { iv })
    decipher.update(forge.util.createBuffer(forge.util.decode64(cipherB64)))
    const ok = padding === 'none' ? decipher.finish(() => true) : decipher.finish()
    if (!ok) return 'DES 解密失败: 密钥/IV/密文无效'
    return decipher.output.toHex().toUpperCase()
  } catch (error) {
    return 'DES 解密失败: ' + error.message
  }
}