import {
  ab2hex,
  bytesToBinaryString,
  forge,
  getForgeHmacAlgorithm,
  getForgeMessageDigest,
  getWebCryptoSubtle,
  normalizeInputBytes,
} from './crypto-common.js'

export async function hash(algorithm, text) {
  const algoLower = algorithm.toLowerCase()
  if (algoLower === 'md5') return md5(text)
  const algoMap = { sha1: 'SHA-1', sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' }
  const name = algoMap[algoLower]
  if (!name) return '错误：不支持的哈希算法'
  const subtle = getWebCryptoSubtle()
  if (subtle) {
    const buf = await subtle.digest(name, new TextEncoder().encode(text))
    return ab2hex(buf)
  }
  try {
    const digest = getForgeMessageDigest(algoLower)
    digest.update(text, 'utf8')
    return digest.digest().toHex()
  } catch (error) {
    return '错误：' + error.message
  }
}

export async function hmac(algorithm, key, text, options = {}) {
  const algoLower = algorithm.toLowerCase()
  const keyEncoding = options.keyEncoding === 'utf8' ? 'utf8' : 'hex'
  const inputEncoding = options.inputEncoding === 'hex' ? 'hex' : 'utf8'
  if (algoLower === 'md5') return hmacMd5(key, text, { keyEncoding, inputEncoding })
  const algoMap = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512', sha1: 'SHA-1' }
  const name = algoMap[algoLower]
  if (!name) return null
  const subtle = getWebCryptoSubtle()
  const keyData = normalizeInputBytes(key, keyEncoding)
  const inputBytes = normalizeInputBytes(text, inputEncoding)
  if (subtle) {
    const cryptoKey = await subtle.importKey('raw', keyData, { name: 'HMAC', hash: name }, false, ['sign'])
    const sig = await subtle.sign('HMAC', cryptoKey, inputBytes)
    return ab2hex(sig)
  }
  try {
    const hmac = forge.hmac.create()
    hmac.start(getForgeHmacAlgorithm(algoLower), bytesToBinaryString(keyData))
    hmac.update(bytesToBinaryString(inputBytes), 'raw')
    return hmac.digest().toHex()
  } catch (error) {
    return '错误：' + error.message
  }
}

function md5(text) {
  const digest = forge.md.md5.create()
  digest.update(text, 'utf8')
  return digest.digest().toHex()
}

function hmacMd5(key, text, options = {}) {
  const keyEncoding = options.keyEncoding === 'utf8' ? 'utf8' : 'hex'
  const inputEncoding = options.inputEncoding === 'hex' ? 'hex' : 'utf8'
  const hmac = forge.hmac.create()
  hmac.start('md5', bytesToBinaryString(normalizeInputBytes(key, keyEncoding)))
  hmac.update(bytesToBinaryString(normalizeInputBytes(text, inputEncoding)), 'raw')
  return hmac.digest().toHex()
}
