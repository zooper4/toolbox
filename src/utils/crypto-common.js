import forge from 'node-forge'
import smCryptoModule from 'sm-crypto'

export const smCrypto = smCryptoModule?.default || smCryptoModule

export function str2ab(str) {
  return new TextEncoder().encode(str)
}

export function ab2str(buf) {
  return new TextDecoder().decode(buf)
}

export function ab2hex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function hex2ab(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < hex.length; index += 2) bytes[index / 2] = parseInt(hex.substr(index, 2), 16)
  return bytes
}

export function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

export function isExactHexLength(input, byteLength) {
  return typeof input === 'string' && new RegExp(`^[0-9a-fA-F]{${byteLength * 2}}$`).test(input)
}

export function isFlexibleHex(input) {
  return typeof input === 'string' && input.length >= 16 && input.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(input)
}

export function normalizeFixedLengthBytes(input, byteLength) {
  if (isExactHexLength(input, byteLength)) {
    return hex2ab(input)
  }
  const source = str2ab(input || '')
  const bytes = new Uint8Array(byteLength)
  bytes.set(source.slice(0, byteLength))
  return bytes
}

export function normalizeFlexibleBytes(input) {
  if (isFlexibleHex(input)) {
    return hex2ab(input)
  }
  return str2ab(input || '')
}

export function normalizeHexInput(input) {
  return String(input || '').replace(/\s+/g, '')
}

export function normalizeInputBytes(input, encoding = 'utf8') {
  if (input instanceof Uint8Array) return input
  if (encoding === 'hex') return hex2ab(normalizeHexInput(input))
  return str2ab(String(input || ''))
}

export function decodeOutputBytes(bytes, encoding = 'utf8') {
  const normalized = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (encoding === 'hex') return ab2hex(normalized)
  return ab2str(normalized)
}

export function byteArrayToUint8Array(bytes) {
  return bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes)
}

export function getWebCryptoSubtle() {
  return globalThis.crypto?.subtle || null
}

export function getForgeMessageDigest(hashName = 'sha256') {
  switch ((hashName || 'sha256').toLowerCase()) {
    case 'sha1': return forge.md.sha1.create()
    case 'sha256': return forge.md.sha256.create()
    case 'sha384': return forge.md.sha384.create()
    case 'sha512': return forge.md.sha512.create()
    default: throw new Error(`不支持的哈希算法: ${hashName}`)
  }
}

export function getForgeHmacAlgorithm(hashName = 'sha256') {
  switch ((hashName || 'sha256').toLowerCase()) {
    case 'sha1':
    case 'sha256':
    case 'sha384':
    case 'sha512':
      return hashName.toLowerCase()
    default:
      throw new Error(`不支持的 HMAC 算法: ${hashName}`)
  }
}

export function getAesForgeMode(mode = 'cbc') {
  switch ((mode || 'cbc').toLowerCase()) {
    case 'ecb': return 'AES-ECB'
    case 'cbc': return 'AES-CBC'
    case 'ctr': return 'AES-CTR'
    case 'gcm': return 'AES-GCM'
    default: throw new Error(`不支持的 AES 模式: ${mode}`)
  }
}

export function getRsaEncryptionSchemeOptions(scheme = 'oaep-sha256') {
  switch ((scheme || 'oaep-sha256').toLowerCase()) {
    case 'pkcs1v15':
      return { webcrypto: null, forgeScheme: 'RSAES-PKCS1-V1_5', forgeOptions: undefined }
    case 'oaep-sha1':
      return {
        webcrypto: { name: 'RSA-OAEP', hash: 'SHA-1' },
        forgeScheme: 'RSA-OAEP',
        forgeOptions: undefined,
      }
    case 'oaep-sha256':
    default: {
      const md = getForgeMessageDigest('sha256')
      return {
        webcrypto: { name: 'RSA-OAEP', hash: 'SHA-256' },
        forgeScheme: 'RSA-OAEP',
        forgeOptions: { md, mgf1: { md: getForgeMessageDigest('sha256') } },
      }
    }
  }
}

export function getRsaSignatureSchemeOptions(scheme = 'pss-sha256') {
  switch ((scheme || 'pss-sha256').toLowerCase()) {
    case 'pkcs1-sha256':
      return {
        webcrypto: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        forgeScheme: 'RSASSA-PKCS1-V1_5',
        md: getForgeMessageDigest('sha256'),
        pss: null,
      }
    case 'pss-sha256':
    default: {
      const md = getForgeMessageDigest('sha256')
      return {
        webcrypto: { name: 'RSA-PSS', hash: 'SHA-256', saltLength: 32 },
        forgeScheme: 'RSA-PSS',
        md,
        pss: forge.pss.create({
          md: getForgeMessageDigest('sha256'),
          mgf: forge.mgf.mgf1.create(getForgeMessageDigest('sha256')),
          saltLength: 32,
        }),
      }
    }
  }
}

export function bytesToBinaryString(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
}

export function formatPem(type, base64Body) {
  const wrapped = String(base64Body || '').replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') || ''
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`
}

export function isPemKey(input) {
  return typeof input === 'string' && /-----BEGIN [A-Z0-9 ]+-----/.test(input)
}

export function pemToBase64Body(pem) {
  return String(pem || '')
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
}

export function getRsaKeyMaterial(keyText, type) {
  if (isPemKey(keyText)) {
    const pem = String(keyText).trim()
    const derBase64 = pemToBase64Body(pem)
    return { pem, derBytes: base64ToBuf(derBase64) }
  }
  const normalized = String(keyText || '').replace(/\s+/g, '')
  const isHexDer = normalized.length > 0 && normalized.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(normalized)
  const derBytes = isHexDer ? hex2ab(normalized) : base64ToBuf(normalized)
  const derBase64 = isHexDer ? bufToBase64(derBytes) : normalized
  const pemType = type === 'public' ? 'PUBLIC KEY' : 'PRIVATE KEY'
  return { pem: formatPem(pemType, derBase64), derBytes }
}

export function getRsaKeyByteLength(keyText, type) {
  try {
    const { pem } = getRsaKeyMaterial(keyText, type)
    const key = type === 'private' ? forge.pki.privateKeyFromPem(pem) : forge.pki.publicKeyFromPem(pem)
    return Math.ceil(key.n.bitLength() / 8)
  } catch {
    return 0
  }
}

export function getRsaMaxPlaintextBytes(keyText, type, scheme = 'oaep-sha256') {
  const keyBytes = getRsaKeyByteLength(keyText, type)
  if (!keyBytes) return 0
  switch ((scheme || 'oaep-sha256').toLowerCase()) {
    case 'pkcs1v15':
      return Math.max(0, keyBytes - 11)
    case 'oaep-sha1':
      return Math.max(0, keyBytes - 42)
    case 'oaep-sha256':
    default:
      return Math.max(0, keyBytes - 66)
  }
}

export function normalizeKey16(input) {
  if (/^[0-9a-fA-F]{32}$/.test(input)) {
    return input.toLowerCase()
  }
  const bytes = str2ab(input)
  const key = new Uint8Array(16)
  key.set(bytes.slice(0, 16))
  return ab2hex(key)
}

export function pkcs7Pad(data, blockSize) {
  const padLen = blockSize - (data.length % blockSize)
  const padded = new Uint8Array(data.length + padLen)
  padded.set(new Uint8Array(data))
  for (let index = 0; index < padLen; index++) padded[data.length + index] = padLen
  return padded
}

export function pkcs7Unpad(str) {
  const last = str.charCodeAt(str.length - 1)
  if (last > 0 && last <= 16) {
    const allPad = str.slice(-last).split('').every((c) => c.charCodeAt(0) === last)
    if (allPad) return str.slice(0, -last)
  }
  return str
}

export { forge }