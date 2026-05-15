import { base64ToBin, base64ToHex, binToBase64, binToHex, hexDecode, hexToBase64, hexToBin } from '../../../utils/encoding-tools.js'

export const AES_IV_HEX_LENGTH = 32
export const DES_KEY_HEX_LENGTH = 16
export const SM4_KEY_HEX_LENGTH = 32
export const SM2_PUBLIC_KEY_HEX_LENGTH = 130
export const SM2_PRIVATE_KEY_HEX_LENGTH = 64
export const CHACHA_KEY_HEX_LENGTH = 64
export const CHACHA_NONCE_HEX_LENGTH = 24

export const AES_IV_HINT = `${AES_IV_HEX_LENGTH} 位 Hex`
export const DES_KEY_HINT = `${DES_KEY_HEX_LENGTH} 位 Hex`
export const SM4_KEY_HINT = `${SM4_KEY_HEX_LENGTH} 位 Hex`
export const SM4_IV_HINT = `${SM4_KEY_HEX_LENGTH} 位 Hex`
export const SM2_PUBLIC_KEY_HINT = `${SM2_PUBLIC_KEY_HEX_LENGTH} 位 Hex`
export const SM2_PRIVATE_KEY_HINT = `${SM2_PRIVATE_KEY_HEX_LENGTH} 位 Hex`
export const CHACHA_KEY_HINT = `${CHACHA_KEY_HEX_LENGTH} 位 Hex`
export const CHACHA_NONCE_HINT = `${CHACHA_NONCE_HEX_LENGTH} 位 Hex`

export function fillRandomBytes(bytes) {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return bytes
  }
  for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256)
  return bytes
}

export function randomHex(byteLength) {
  const bytes = fillRandomBytes(new Uint8Array(byteLength))
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

export function isConvertError(value) {
  return typeof value === 'string' && value.startsWith('错误：')
}

export function isHexLength(value, length) {
  return typeof value === 'string' && new RegExp(`^[0-9a-fA-F]{${length}}$`).test(value)
}

export function isEvenHex(value) {
  return typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value)
}

export function isHexOutput(value) {
  return typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value)
}

export function getHexRequirementMessage(label, hint) {
  return `${label}应为 ${hint}`
}

export function formatFromBase64(value, format) {
  if (format === 'b64') return value
  if (format === 'hex') return base64ToHex(value)
  return base64ToBin(value)
}

export function formatFromHex(value, format) {
  if (format === 'hex') return value
  if (format === 'b64') return hexToBase64(value)
  return hexToBin(value)
}

export function parseBase64Input(value, format) {
  if (format === 'b64') return value
  if (format === 'hex') return hexToBase64(value)
  return binToBase64(value)
}

export function parseHexInput(value, format) {
  if (format === 'hex') return value
  if (format === 'b64') return base64ToHex(value)
  return binToHex(value)
}

export function formatFromTextHex(value, format) {
  if (!isHexOutput(value)) return value
  if (format === 'hex') return value.toUpperCase()
  if (format === 'raw') return hexToBin(value)
  return hexDecode(value)
}