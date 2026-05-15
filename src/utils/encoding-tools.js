const enc = new TextEncoder()
const dec = new TextDecoder()

export function str2ab(s) { return enc.encode(s) }
export function ab2str(b) { return dec.decode(b) }
export function ab2hex(b) { return Array.from(new Uint8Array(b)).map((i) => i.toString(16).padStart(2, '0')).join('') }
export function hex2ab(h) {
  const clean = String(h || '').replace(/\s/g, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let index = 0; index < clean.length; index += 2) bytes[index / 2] = parseInt(clean.substr(index, 2), 16)
  return bytes
}

function hexToBytesStrict(hex) {
  const clean = String(hex).replace(/\s/g, '')
  if (!clean || clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error('invalid hex')
  }
  return hex2ab(clean)
}

function binaryToBytesStrict(bin) {
  const clean = String(bin).replace(/\s+/g, '')
  if (!clean || clean.length % 8 !== 0 || /[^01]/.test(clean)) {
    throw new Error('invalid binary')
  }
  const bytes = new Uint8Array(clean.length / 8)
  for (let index = 0; index < clean.length; index += 8) {
    bytes[index / 8] = parseInt(clean.slice(index, index + 8), 2)
  }
  return bytes
}

function bytesToBinary(bytes) {
  return Array.from(bytes).map((b) => b.toString(2).padStart(8, '0')).join(' ')
}

export function base64Encode(s) {
  try {
    const bytes = str2ab(s)
    let bin = ''
    for (let index = 0; index < bytes.length; index++) bin += String.fromCharCode(bytes[index])
    return btoa(bin)
  } catch (error) {
    return '错误：无法编码 — ' + error.message
  }
}

export function base64Decode(s) {
  try {
    const bin = atob(s)
    const bytes = new Uint8Array(bin.length)
    for (let index = 0; index < bin.length; index++) bytes[index] = bin.charCodeAt(index)
    return ab2str(bytes)
  } catch (error) {
    return '错误：Base64 无效 — ' + error.message
  }
}

export function urlEncode(s) { return encodeURIComponent(s) }
export function urlDecode(s) {
  try { return decodeURIComponent(s) } catch (error) { return '错误：URL 编码无效' }
}

export function hexEncode(s) {
  return Array.from(str2ab(s)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function hexDecode(h) {
  try { return ab2str(hexToBytesStrict(h)) } catch (error) { return '错误：Hex 无效' }
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(s) {
  const bytes = str2ab(s)
  let bits = 0
  let count = 0
  let result = ''
  for (const byte of bytes) {
    bits = (bits << 8) | byte
    count += 8
    while (count >= 5) {
      count -= 5
      result += B32[(bits >> count) & 31]
    }
  }
  if (count > 0) {
    bits <<= (5 - count)
    result += B32[bits & 31]
  }
  while (result.length % 8 !== 0) result += '='
  return result
}

export function base32Decode(s) {
  try {
    let normalized = s.replace(/=+$/, '').toUpperCase()
    let bits = 0
    let count = 0
    const bytes = []
    for (const char of normalized) {
      const index = B32.indexOf(char)
      if (index < 0) throw new Error('invalid base32')
      bits = (bits << 5) | index
      count += 5
      if (count >= 8) {
        count -= 8
        bytes.push((bits >> count) & 255)
      }
    }
    return ab2str(Uint8Array.from(bytes))
  } catch (error) {
    return '错误：Base32 无效'
  }
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58Encode(s) {
  const bytes = str2ab(s)
  let value = BigInt(0)
  for (const byte of bytes) value = (value << 8n) + BigInt(byte)
  let result = ''
  while (value > 0) {
    result = B58[Number(value % 58n)] + result
    value /= 58n
  }
  for (const byte of bytes) {
    if (byte === 0) result = '1' + result
    else break
  }
  return result
}

export function base58Decode(s) {
  try {
    let value = BigInt(0)
    for (const char of s) {
      const index = B58.indexOf(char)
      if (index < 0) throw new Error('invalid base58')
      value = value * 58n + BigInt(index)
    }
    const bytes = []
    while (value > 0) {
      bytes.unshift(Number(value & 255n))
      value >>= 8n
    }
    for (const char of s) {
      if (char === '1') bytes.unshift(0)
      else break
    }
    return ab2str(Uint8Array.from(bytes))
  } catch (error) {
    return '错误：Base58 无效'
  }
}

export function htmlEncode(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) }
export function htmlDecode(s) {
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}
export function unicodeEncode(s) {
  let result = ''
  for (const char of s) {
    const codePoint = char.codePointAt(0)
    if (codePoint == null || codePoint <= 127) {
      result += char
      continue
    }
    if (codePoint <= 0xFFFF) {
      result += '\\u' + codePoint.toString(16).padStart(4, '0')
      continue
    }
    const adjusted = codePoint - 0x10000
    const high = 0xD800 + (adjusted >> 10)
    const low = 0xDC00 + (adjusted & 0x3FF)
    result += `\\u${high.toString(16).padStart(4, '0')}\\u${low.toString(16).padStart(4, '0')}`
  }
  return result
}
export function unicodeDecode(s) {
  try { return s.replace(/\\u[0-9a-fA-F]{4}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16))) } catch (error) { return '错误：Unicode 转义无效' }
}
export function asciiToBin(s) { return Array.from(str2ab(s)).map((byte) => byte.toString(2).padStart(8, '0')).join(' ') }
export function binToAscii(b) {
  try {
    const bytes = binaryToBytesStrict(b)
    return ab2str(bytes)
  } catch (error) {
    return '错误：二进制无效（仅支持 0/1，且位数应为 8 的倍数）'
  }
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

export function jwtEncode(structureOrHeaderText, payloadText, signatureText = '') {
  try {
    let header = {}
    let payload = {}
    let signature = signatureText == null ? '' : String(signatureText)

    if (typeof payloadText === 'string') {
      header = JSON.parse(structureOrHeaderText)
      payload = JSON.parse(payloadText || '{}')
    } else {
      const structure = typeof structureOrHeaderText === 'string'
        ? JSON.parse(structureOrHeaderText || '{}')
        : structureOrHeaderText
      if (!isPlainObject(structure)) return '错误：JWT 结构必须是对象'
      if (structure.header != null) header = structure.header
      if (structure.payload != null) payload = structure.payload
      if (structure.signature != null) signature = String(structure.signature)
    }

    if (!isPlainObject(header)) return '错误：header 必须是对象'
    if (!isPlainObject(payload)) return '错误：payload 必须是对象'

    const headerSegment = base64UrlEncode(JSON.stringify(header))
    const payloadSegment = base64UrlEncode(JSON.stringify(payload))
    if (headerSegment.startsWith('错误：') || payloadSegment.startsWith('错误：')) {
      return '错误：JWT 编码失败'
    }
    return `${headerSegment}.${payloadSegment}.${signature}`
  } catch (error) {
    return '错误：JWT 编码失败 - ' + error.message
  }
}

export function jwtDecode(token) {
  try {
    const parts = String(token || '').trim().split('.')
    if (parts.length !== 3) return '错误：无效 JWT'
    const headerText = base64UrlDecode(parts[0])
    const payloadText = base64UrlDecode(parts[1])
    if (headerText.startsWith('错误：') || payloadText.startsWith('错误：')) return '错误：JWT 解析失败'
    return JSON.stringify({
      header: JSON.parse(headerText),
      payload: JSON.parse(payloadText),
      signature: parts[2] || '',
    }, null, 2)
  } catch (error) {
    return '错误：JWT 解析失败'
  }
}

export function base64UrlEncode(s) {
  try {
    const bytes = str2ab(s)
    let bin = ''
    for (let index = 0; index < bytes.length; index++) bin += String.fromCharCode(bytes[index])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (error) {
    return '错误：无法编码 — ' + error.message
  }
}

export function base64UrlDecode(s) {
  try {
    let normalized = s.replace(/-/g, '+').replace(/_/g, '/')
    while (normalized.length % 4) normalized += '='
    const bin = atob(normalized)
    const bytes = new Uint8Array(bin.length)
    for (let index = 0; index < bin.length; index++) bytes[index] = bin.charCodeAt(index)
    return ab2str(bytes)
  } catch (error) {
    return '错误：Base64 URL 安全格式无效 — ' + error.message
  }
}

export function base64ToHex(b64) {
  try {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let index = 0; index < bin.length; index++) bytes[index] = bin.charCodeAt(index)
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  } catch (error) {
    return '错误：Base64 无效'
  }
}

export function hexToBase64(hex) {
  try {
    const bytes = hexToBytesStrict(hex)
    let bin = ''
    for (let index = 0; index < bytes.length; index++) bin += String.fromCharCode(bytes[index])
    return btoa(bin)
  } catch (error) {
    return '错误：Hex 无效'
  }
}

export function base64ToBin(b64) {
  try {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let index = 0; index < bin.length; index++) bytes[index] = bin.charCodeAt(index)
    return bytesToBinary(bytes)
  } catch (error) {
    return '错误：Base64 无效'
  }
}

export function hexToBin(hex) {
  try { return bytesToBinary(hexToBytesStrict(hex)) } catch (error) { return '错误：Hex 无效' }
}

export function binToBase64(bin) {
  try {
    const bytes = binaryToBytesStrict(bin)
    let raw = ''
    for (let index = 0; index < bytes.length; index++) raw += String.fromCharCode(bytes[index])
    return btoa(raw)
  } catch (error) {
    return '错误：二进制无效'
  }
}

export function binToHex(bin) {
  try {
    const bytes = binaryToBytesStrict(bin)
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  } catch (error) {
    return '错误：二进制无效'
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function bytesToBase64(bytes) {
  let raw = ''
  for (let index = 0; index < bytes.length; index++) raw += String.fromCharCode(bytes[index])
  return btoa(raw)
}

function base64ToBytesStrict(value) {
  const clean = String(value || '').replace(/\s+/g, '')
  if (!clean) return new Uint8Array()
  if (/[^A-Za-z0-9+/=]/.test(clean)) throw new Error('Base64 仅支持 A-Z a-z 0-9 + / =')
  if (clean.length % 4 === 1) throw new Error('Base64 长度不合法')
  let normalized = clean
  while (normalized.length % 4 !== 0) normalized += '='
  const raw = atob(normalized)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index)
  return bytes
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytesStrict(value) {
  const clean = String(value || '').replace(/\s+/g, '')
  if (!clean) return new Uint8Array()
  if (/[^A-Za-z0-9\-_=]/.test(clean)) throw new Error('Base64URL 仅支持 A-Z a-z 0-9 - _ =')
  if (clean.length % 4 === 1) throw new Error('Base64URL 长度不合法')
  let normalized = clean.replace(/-/g, '+').replace(/_/g, '/')
  while (normalized.length % 4 !== 0) normalized += '='
  const raw = atob(normalized)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index)
  return bytes
}

function bytesToBase32(bytes) {
  let bits = 0
  let count = 0
  let result = ''
  for (const byte of bytes) {
    bits = (bits << 8) | byte
    count += 8
    while (count >= 5) {
      count -= 5
      result += B32[(bits >> count) & 31]
    }
  }
  if (count > 0) {
    bits <<= (5 - count)
    result += B32[bits & 31]
  }
  while (result.length % 8 !== 0) result += '='
  return result
}

function base32ToBytesStrict(value) {
  const clean = String(value || '').replace(/\s+/g, '').replace(/=+$/, '').toUpperCase()
  if (!clean) return new Uint8Array()
  if (/[^A-Z2-7]/.test(clean)) throw new Error('Base32 仅支持 A-Z 2-7')
  let bits = 0
  let count = 0
  const bytes = []
  for (const char of clean) {
    const index = B32.indexOf(char)
    if (index < 0) throw new Error('Base32 包含非法字符')
    bits = (bits << 5) | index
    count += 5
    if (count >= 8) {
      count -= 8
      bytes.push((bits >> count) & 255)
    }
  }
  return Uint8Array.from(bytes)
}

function bytesToBase58(bytes) {
  if (!bytes.length) return ''
  let value = 0n
  for (const byte of bytes) value = (value << 8n) + BigInt(byte)
  let result = ''
  while (value > 0n) {
    result = B58[Number(value % 58n)] + result
    value /= 58n
  }
  for (const byte of bytes) {
    if (byte === 0) result = '1' + result
    else break
  }
  return result
}

function base58ToBytesStrict(value) {
  const input = String(value || '').trim()
  if (!input) return new Uint8Array()
  let numberValue = 0n
  for (const char of input) {
    const index = B58.indexOf(char)
    if (index < 0) throw new Error('Base58 包含非法字符')
    numberValue = numberValue * 58n + BigInt(index)
  }
  const bytes = []
  while (numberValue > 0n) {
    bytes.unshift(Number(numberValue & 255n))
    numberValue >>= 8n
  }
  for (const char of input) {
    if (char === '1') bytes.unshift(0)
    else break
  }
  return Uint8Array.from(bytes)
}

function parseNumericTokens(input) {
  const raw = String(input || '').trim()
  if (!raw) return []
  return raw.split(/[\s,;|]+/).filter(Boolean)
}

function bytesFromTokenList(input, parser, label) {
  const tokens = parseNumericTokens(input)
  if (!tokens.length) return new Uint8Array()
  const bytes = new Uint8Array(tokens.length)
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    const parsed = parser(token)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
      throw new Error(`${label} 第 ${index + 1} 个值超出字节范围`) 
    }
    bytes[index] = parsed
  }
  return bytes
}

function decodeUnicodeEscapesStrict(text) {
  const source = String(text || '')
  if (/\\u(?![0-9a-fA-F]{4})/.test(source)) {
    throw new Error('Unicode 转义格式不正确，应为 \\uXXXX')
  }
  return source.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function encodeUnicodeEscapes(text) {
  let result = ''
  for (const char of String(text || '')) {
    const code = char.charCodeAt(0)
    result += code > 127 ? `\\u${code.toString(16).padStart(4, '0')}` : char
  }
  return result
}

function bytesToQuotedPrintable(bytes) {
  const safeChars = /[A-Za-z0-9!*+\-/\s]/
  let result = ''
  for (const byte of bytes) {
    const char = String.fromCharCode(byte)
    if ((byte >= 33 && byte <= 60) || (byte >= 62 && byte <= 126 && safeChars.test(char))) {
      result += char
      continue
    }
    result += `=${byte.toString(16).toUpperCase().padStart(2, '0')}`
  }
  return result
}

function quotedPrintableToBytesStrict(input) {
  const source = String(input || '')
  if (!source) return new Uint8Array()
  const compact = source.replace(/=\r?\n/g, '')
  const bytes = []
  for (let index = 0; index < compact.length; index++) {
    const char = compact[index]
    if (char === '=') {
      const hex = compact.slice(index + 1, index + 3)
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
        throw new Error('Quoted-Printable 包含非法转义，应为 =XX')
      }
      bytes.push(parseInt(hex, 16))
      index += 2
      continue
    }
    bytes.push(char.charCodeAt(0))
  }
  return Uint8Array.from(bytes)
}

function encodeJsonEscapedString(text) {
  return JSON.stringify(String(text || '')).slice(1, -1)
}

function decodeJsonEscapedStringStrict(input) {
  const rawSource = String(input || '')
  const source = rawSource.startsWith('"') && rawSource.endsWith('"')
    ? rawSource.slice(1, -1)
    : rawSource
  let result = ''

  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char !== '\\') {
      result += char
      continue
    }

    index += 1
    const next = source[index]
    if (!next) throw new Error('JSON 字符串转义格式无效')

    if (next === 'u') {
      const hex = source.slice(index + 1, index + 5)
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error('JSON 字符串转义格式无效')
      result += String.fromCharCode(parseInt(hex, 16))
      index += 4
      continue
    }

    const escapedChars = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    }

    if (!(next in escapedChars)) throw new Error('JSON 字符串转义格式无效')
    result += escapedChars[next]
  }

  return result
}

export function jsonStringEscape(input) {
  return encodeJsonEscapedString(input)
}

export function jsonStringUnescape(input) {
  try {
    return decodeJsonEscapedStringStrict(input)
  } catch (error) {
    return '错误：JSON 字符串转义无效'
  }
}

export const UNIVERSAL_ENCODING_FORMATS = [
  { id: 'utf8', label: 'UTF-8 文本', description: '普通文本' },
  { id: 'url', label: 'URL 编码', description: 'encodeURIComponent 格式' },
  { id: 'base64', label: 'Base64', description: '标准 Base64（+ / =）' },
  { id: 'base64url', label: 'Base64 URL', description: 'URL 安全 Base64（- _）' },
  { id: 'base32', label: 'Base32', description: 'RFC 4648 Base32' },
  { id: 'base58', label: 'Base58', description: 'Bitcoin Base58 字母表' },
  { id: 'hex', label: 'Hex', description: '十六进制字节串' },
  { id: 'quoted-printable', label: 'Quoted-Printable', description: 'MIME 可打印编码（=XX）' },
  { id: 'binary', label: '二进制', description: '每字节 8 位，可空格分隔' },
  { id: 'octal', label: '八进制', description: '每字节 3 位，可空格分隔' },
  { id: 'decimal', label: '十进制字节', description: '每字节 0-255，可空格分隔' },
  { id: 'ascii-codes', label: 'ASCII 码序列', description: '十进制 ASCII 码（0-127）' },
  { id: 'unicode-escape', label: 'Unicode 转义', description: '\\uXXXX 序列' },
  { id: 'html-entity', label: 'HTML 实体', description: 'HTML 字符实体编码' },
]

const universalEncoders = {
  utf8: (bytes) => ab2str(bytes),
  url: (bytes) => encodeURIComponent(ab2str(bytes)),
  base64: (bytes) => bytesToBase64(bytes),
  base64url: (bytes) => bytesToBase64Url(bytes),
  base32: (bytes) => bytesToBase32(bytes),
  base58: (bytes) => bytesToBase58(bytes),
  hex: (bytes) => bytesToHex(bytes),
  'quoted-printable': (bytes) => bytesToQuotedPrintable(bytes),
  binary: (bytes) => bytesToBinary(bytes),
  octal: (bytes) => Array.from(bytes).map((byte) => byte.toString(8).padStart(3, '0')).join(' '),
  decimal: (bytes) => Array.from(bytes).join(' '),
  'ascii-codes': (bytes) => Array.from(bytes).join(' '),
  'unicode-escape': (bytes) => encodeUnicodeEscapes(ab2str(bytes)),
  'html-entity': (bytes) => htmlEncode(ab2str(bytes)),
}

const universalDecoders = {
  utf8: (input) => str2ab(String(input || '')),
  url: (input) => str2ab(decodeURIComponent(String(input || ''))),
  base64: (input) => base64ToBytesStrict(input),
  base64url: (input) => base64UrlToBytesStrict(input),
  base32: (input) => base32ToBytesStrict(input),
  base58: (input) => base58ToBytesStrict(input),
  hex: (input) => hexToBytesStrict(input),
  'quoted-printable': (input) => quotedPrintableToBytesStrict(input),
  binary: (input) => binaryToBytesStrict(input),
  octal: (input) => bytesFromTokenList(input, (token) => {
    if (!/^[0-7]{1,3}$/.test(token)) throw new Error('八进制仅支持 0-7，且每组最多 3 位')
    return parseInt(token, 8)
  }, '八进制'),
  decimal: (input) => bytesFromTokenList(input, (token) => {
    if (!/^\d+$/.test(token)) throw new Error('十进制仅支持数字')
    return parseInt(token, 10)
  }, '十进制'),
  'ascii-codes': (input) => bytesFromTokenList(input, (token) => {
    if (!/^\d+$/.test(token)) throw new Error('ASCII 码仅支持数字')
    const parsed = parseInt(token, 10)
    if (parsed > 127) throw new Error('ASCII 码范围应在 0-127')
    return parsed
  }, 'ASCII'),
  'unicode-escape': (input) => str2ab(decodeUnicodeEscapesStrict(input)),
  'html-entity': (input) => str2ab(htmlDecode(String(input || ''))),
}

export function convertUniversalEncoding(input, fromFormat, toFormat) {
  try {
    const fromParser = universalDecoders[fromFormat]
    if (!fromParser) return { ok: false, error: `不支持的输入格式：${fromFormat}` }
    const toFormatter = universalEncoders[toFormat]
    if (!toFormatter) return { ok: false, error: `不支持的输出格式：${toFormat}` }
    const bytes = fromParser(input)
    const output = toFormatter(bytes)
    return { ok: true, output }
  } catch (error) {
    return { ok: false, error: error?.message || '转换失败' }
  }
}