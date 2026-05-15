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
  try { return ab2str(hex2ab(h)) } catch (error) { return '错误：Hex 无效' }
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
    const code = char.charCodeAt(0)
    result += code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : char
  }
  return result
}
export function unicodeDecode(s) {
  try { return s.replace(/\\u[0-9a-fA-F]{4}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16))) } catch (error) { return '错误：Unicode 转义无效' }
}
export function asciiToBin(s) { return s.split('').map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ') }
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