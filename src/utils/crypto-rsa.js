import {
  ab2hex,
  base64ToBuf,
  bufToBase64,
  bytesToBinaryString,
  forge,
  formatPem,
  getForgeMessageDigest,
  getRsaEncryptionSchemeOptions,
  getRsaKeyMaterial,
  getRsaMaxPlaintextBytes,
  getRsaSignatureSchemeOptions,
  getWebCryptoSubtle,
  normalizeInputBytes,
} from './crypto-common.js'

export async function rsaGenerateKey(bits = 2048) {
  const subtle = getWebCryptoSubtle()
  if (subtle) {
    try {
      const keyPair = await subtle.generateKey(
        { name: 'RSA-OAEP', modulusLength: parseInt(bits) || 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true,
        ['encrypt', 'decrypt'],
      )
      const pubKey = await subtle.exportKey('spki', keyPair.publicKey)
      const privKey = await subtle.exportKey('pkcs8', keyPair.privateKey)
      return {
        publicKey: formatPem('PUBLIC KEY', bufToBase64(pubKey)),
        privateKey: formatPem('PRIVATE KEY', bufToBase64(privKey)),
      }
    } catch (error) {
      return { error: `RSA 密钥生成错误: ${error.message}` }
    }
  }
  try {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: parseInt(bits) || 2048, workers: -1 })
    return {
      publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
      privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
    }
  } catch (error) {
    return { error: `RSA 密钥生成错误: ${error.message}` }
  }
}

export async function rsaEncrypt(text, publicKeyB64, options = {}) {
  const plainEncoding = options.plainEncoding === 'hex' ? 'hex' : 'utf8'
  const schemeId = options.encryptScheme || 'oaep-sha256'
  const scheme = getRsaEncryptionSchemeOptions(options.encryptScheme)
  const inputBytes = normalizeInputBytes(text, plainEncoding)
  const keyMaterial = getRsaKeyMaterial(publicKeyB64, 'public')
  const maxPlaintextBytes = getRsaMaxPlaintextBytes(publicKeyB64, 'public', schemeId)

  if (!maxPlaintextBytes) {
    return 'RSA 加密失败：无法解析公钥或计算密钥长度'
  }
  if (inputBytes.length > maxPlaintextBytes) {
    return `RSA 加密失败：当前方案最多支持 ${maxPlaintextBytes} 字节明文，你输入了 ${inputBytes.length} 字节。请缩短内容、改用更长密钥（如 4096-bit）或使用混合加密。`
  }
  const subtle = getWebCryptoSubtle()

  if (subtle && scheme.webcrypto) {
    try {
      const pubKey = await subtle.importKey('spki', keyMaterial.derBytes, scheme.webcrypto, false, ['encrypt'])
      const enc = await subtle.encrypt({ name: scheme.webcrypto.name }, pubKey, inputBytes)
      return bufToBase64(enc)
    } catch (error) {
      return `RSA 加密错误: ${error.message}`
    }
  }
  try {
    const pubKey = forge.pki.publicKeyFromPem(keyMaterial.pem)
    const enc = pubKey.encrypt(bytesToBinaryString(inputBytes), scheme.forgeScheme, scheme.forgeOptions)
    return forge.util.encode64(enc)
  } catch (error) {
    return `RSA 加密错误: ${error.message}`
  }
}

export async function rsaDecrypt(cipherB64, privateKeyB64, options = {}) {
  const scheme = getRsaEncryptionSchemeOptions(options.encryptScheme)
  const keyMaterial = getRsaKeyMaterial(privateKeyB64, 'private')
  const subtle = getWebCryptoSubtle()

  if (subtle && scheme.webcrypto) {
    try {
      const privKey = await subtle.importKey('pkcs8', keyMaterial.derBytes, scheme.webcrypto, false, ['decrypt'])
      const dec = await subtle.decrypt({ name: scheme.webcrypto.name }, privKey, base64ToBuf(cipherB64))
      return ab2hex(dec).toUpperCase()
    } catch (error) {
      return `RSA 解密错误: ${error.message}`
    }
  }
  try {
    const privKey = forge.pki.privateKeyFromPem(keyMaterial.pem)
    const dec = privKey.decrypt(forge.util.decode64(cipherB64), scheme.forgeScheme, scheme.forgeOptions)
    return forge.util.bytesToHex(dec).toUpperCase()
  } catch (error) {
    return `RSA 解密错误: ${error.message}`
  }
}

export async function rsaSign(text, privateKeyB64, options = {}) {
  try {
    const inputEncoding = options.inputEncoding === 'hex' ? 'hex' : 'utf8'
    const scheme = getRsaSignatureSchemeOptions(options.signScheme)
    const inputBytes = normalizeInputBytes(text, inputEncoding)
    const keyMaterial = getRsaKeyMaterial(privateKeyB64, 'private')
    const subtle = getWebCryptoSubtle()
    if (subtle && scheme.webcrypto) {
      const importParams = { name: scheme.webcrypto.name, hash: scheme.webcrypto.hash }
      const privKey = await subtle.importKey('pkcs8', keyMaterial.derBytes, importParams, false, ['sign'])
      const signParams = scheme.webcrypto.name === 'RSA-PSS'
        ? { name: 'RSA-PSS', saltLength: scheme.webcrypto.saltLength }
        : { name: 'RSASSA-PKCS1-v1_5' }
      const sig = await subtle.sign(signParams, privKey, inputBytes)
      return ab2hex(sig)
    }
    const privKey = forge.pki.privateKeyFromPem(keyMaterial.pem)
    const md = scheme.md
    md.update(bytesToBinaryString(inputBytes), 'raw')
    const sigBytes = scheme.forgeScheme === 'RSA-PSS' ? privKey.sign(md, scheme.pss) : privKey.sign(md, scheme.forgeScheme)
    return forge.util.bytesToHex(sigBytes)
  } catch (error) {
    return `RSA 签名错误: ${error.message}`
  }
}

export async function rsaVerify(text, signatureHex, publicKeyB64, options = {}) {
  try {
    const inputEncoding = options.inputEncoding === 'hex' ? 'hex' : 'utf8'
    const scheme = getRsaSignatureSchemeOptions(options.signScheme)
    const inputBytes = normalizeInputBytes(text, inputEncoding)
    const keyMaterial = getRsaKeyMaterial(publicKeyB64, 'public')
    const subtle = getWebCryptoSubtle()
    if (subtle && scheme.webcrypto) {
      const importParams = { name: scheme.webcrypto.name, hash: scheme.webcrypto.hash }
      const pubKey = await subtle.importKey('spki', keyMaterial.derBytes, importParams, false, ['verify'])
      const verifyParams = scheme.webcrypto.name === 'RSA-PSS'
        ? { name: 'RSA-PSS', saltLength: scheme.webcrypto.saltLength }
        : { name: 'RSASSA-PKCS1-v1_5' }
      const result = await subtle.verify(verifyParams, pubKey, hexToBytes(signatureHex), inputBytes)
      return result ? '✅ 签名验证通过' : '❌ 签名验证失败'
    }
    const pubKey = forge.pki.publicKeyFromPem(keyMaterial.pem)
    const md = scheme.md
    md.update(bytesToBinaryString(inputBytes), 'raw')
    const result = scheme.forgeScheme === 'RSA-PSS'
      ? pubKey.verify(md.digest().getBytes(), forge.util.hexToBytes(signatureHex), scheme.pss)
      : pubKey.verify(md.digest().getBytes(), forge.util.hexToBytes(signatureHex), scheme.forgeScheme)
    return result ? '✅ 签名验证通过' : '❌ 签名验证失败'
  } catch (error) {
    return `RSA 验签错误: ${error.message}`
  }
}

function hexToBytes(hex) {
  const clean = String(hex || '').replace(/\s+/g, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let index = 0; index < clean.length; index += 2) bytes[index / 2] = parseInt(clean.substr(index, 2), 16)
  return bytes
}

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

export async function hmac(algorithm, key, text) {
  const algoLower = algorithm.toLowerCase()
  if (algoLower === 'md5') return hmacMd5(key, text)
  const algoMap = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512', sha1: 'SHA-1' }
  const name = algoMap[algoLower]
  if (!name) return null
  const subtle = getWebCryptoSubtle()
  if (subtle) {
    const keyData = normalizeInputBytes(key)
    const algo = { name: 'HMAC', hash: name }
    const cryptoKey = await subtle.importKey('raw', keyData, algo, false, ['sign'])
    const sig = await subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(text))
    return ab2hex(sig)
  }
  try {
    const hmac = forge.hmac.create()
    hmac.start(algorithm.toLowerCase(), bytesToBinaryString(normalizeInputBytes(key)))
    hmac.update(text, 'utf8')
    return hmac.digest().toHex()
  } catch (error) {
    return '错误：' + error.message
  }
}

function md5(s) {
  const digest = forge.md.md5.create()
  digest.update(s, 'utf8')
  return digest.digest().toHex()
}

function hmacMd5(key, text) {
  const hmac = forge.hmac.create()
  hmac.start('md5', bytesToBinaryString(normalizeInputBytes(key)))
  hmac.update(text, 'utf8')
  return hmac.digest().toHex()
}