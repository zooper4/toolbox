import {
  ab2hex,
  base64ToBuf,
  bufToBase64,
  bytesToBinaryString,
  forge,
  formatPem,
  getRsaEncryptionSchemeOptions,
  getRsaKeyMaterial,
  getRsaMaxPlaintextBytes,
  getRsaSignatureSchemeOptions,
  getWebCryptoSubtle,
  hex2ab,
  isPemKey,
  normalizeHexInput,
  normalizeInputBytes,
  pemToBase64Body,
} from './crypto-common.js'

const ASN1_INTEGER = 2
const ASN1_OCTET_STRING = 4
const ASN1_OBJECT_IDENTIFIER = 6
const ASN1_SEQUENCE = 16
const RSA_ENCRYPTION_OID = '1.2.840.113549.1.1.1'

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

export async function rsaParsePrivateKey(keyText, options = {}) {
  try {
    return parseRsaPrivateKey(keyText, options.inputFormat)
  } catch (error) {
    return { error: `RSA 私钥解析错误: ${error.message}` }
  }
}

function hexToBytes(hex) {
  const clean = String(hex || '').replace(/\s+/g, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let index = 0; index < clean.length; index += 2) bytes[index / 2] = parseInt(clean.substr(index, 2), 16)
  return bytes
}

function parseRsaPrivateKey(keyText, inputFormat = 'pem') {
  const material = getRsaPrivateKeyParseMaterial(keyText, inputFormat)
  const asn1 = forge.asn1.fromDer(bytesToBinaryString(material.derBytes))
  const container = material.pemLabel ? describePemPrivateKeyLabel(material.pemLabel) : detectPrivateKeyContainer(asn1)

  if (container === 'PKCS#8 Encrypted') {
    return {
      summary: {
        inputFormat: material.inputFormatLabel,
        pemLabel: material.pemLabel,
        container,
        algorithm: '未知',
        encrypted: true,
        derLength: material.derBytes.length,
        derSha256: digestBytes(material.derBytes, 'sha256'),
        derSha1: digestBytes(material.derBytes, 'sha1'),
      },
      message: '检测到加密私钥。当前未提供口令，无法继续提取 RSA 参数。',
    }
  }

  const algorithmOid = getPrivateKeyAlgorithmOid(asn1, container)
  if (algorithmOid && algorithmOid !== RSA_ENCRYPTION_OID) {
    throw new Error(`当前私钥算法不是 RSA（OID: ${algorithmOid}）`)
  }

  const privateKey = forge.pki.privateKeyFromAsn1(asn1)
  if (!privateKey?.n || !privateKey?.e || !privateKey?.d) {
    throw new Error('未能提取 RSA 私钥核心参数')
  }

  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e)
  const publicKeyPem = forge.pki.publicKeyToPem(publicKey).trim()
  const publicKeyDerBytes = base64ToBuf(pemToBase64Body(publicKeyPem))
  const pkcs1Version = getAsn1IntegerValue(container === 'PKCS#8' ? getWrappedPkcs1Asn1(asn1) : asn1)

  return {
    summary: {
      inputFormat: material.inputFormatLabel,
      pemLabel: material.pemLabel,
      container,
      algorithm: 'RSA',
      encrypted: false,
      derLength: material.derBytes.length,
      derSha256: digestBytes(material.derBytes, 'sha256'),
      derSha1: digestBytes(material.derBytes, 'sha1'),
      pkcs1Version,
      multiPrime: pkcs1Version === 1,
    },
    key: {
      modulusBits: privateKey.n.bitLength(),
      modulusBytes: Math.ceil(privateKey.n.bitLength() / 8),
      publicExponent: privateKey.e.toString(10),
      publicExponentHex: toUpperEvenHex(privateKey.e.toString(16)),
      privateExponentBits: privateKey.d.bitLength(),
      prime1Bits: privateKey.p.bitLength(),
      prime2Bits: privateKey.q.bitLength(),
    },
    publicKey: {
      pem: publicKeyPem,
      sha256: digestBytes(publicKeyDerBytes, 'sha256'),
      sha1: digestBytes(publicKeyDerBytes, 'sha1'),
    },
    components: {
      n: getBigIntegerDetails(privateKey.n),
      d: getBigIntegerDetails(privateKey.d),
      p: getBigIntegerDetails(privateKey.p),
      q: getBigIntegerDetails(privateKey.q),
      dP: getBigIntegerDetails(privateKey.dP),
      dQ: getBigIntegerDetails(privateKey.dQ),
      qInv: getBigIntegerDetails(privateKey.qInv),
    },
  }
}

function getRsaPrivateKeyParseMaterial(keyText, inputFormat = 'pem') {
  const format = normalizePrivateKeyInputFormat(inputFormat)
  const raw = String(keyText || '').trim()
  if (!raw) throw new Error('请输入私钥数据')

  if (format === 'pem') {
    if (!isPemKey(raw)) throw new Error('所选格式是 PEM，但输入内容不是合法 PEM')
    const pemLabel = raw.match(/-----BEGIN ([A-Z0-9 ]+)-----/)?.[1] || null
    return {
      inputFormatLabel: 'PEM',
      pemLabel,
      derBytes: base64ToBuf(pemToBase64Body(raw)),
    }
  }

  if (format === 'hex') {
    const normalizedHex = normalizeHexInput(raw)
    if (!normalizedHex || normalizedHex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(normalizedHex)) {
      throw new Error('Hex DER 应为偶数位十六进制字符串')
    }
    return {
      inputFormatLabel: 'Hex DER',
      pemLabel: null,
      derBytes: hex2ab(normalizedHex),
    }
  }

  const normalizedBase64 = raw.replace(/\s+/g, '')
  if (!normalizedBase64 || normalizedBase64.length % 4 === 1 || /[^0-9a-zA-Z+/=]/.test(normalizedBase64)) {
    throw new Error('Base64 DER 输入不合法')
  }
  return {
    inputFormatLabel: 'Base64 DER',
    pemLabel: null,
    derBytes: base64ToBuf(normalizedBase64),
  }
}

function normalizePrivateKeyInputFormat(format) {
  switch (String(format || 'pem').toLowerCase()) {
    case 'base64':
      return 'base64'
    case 'hex':
      return 'hex'
    case 'pem':
    default:
      return 'pem'
  }
}

function describePemPrivateKeyLabel(label) {
  switch (String(label || '').toUpperCase()) {
    case 'RSA PRIVATE KEY':
      return 'PKCS#1'
    case 'PRIVATE KEY':
      return 'PKCS#8'
    case 'ENCRYPTED PRIVATE KEY':
      return 'PKCS#8 Encrypted'
    default:
      return label || '未知'
  }
}

function detectPrivateKeyContainer(asn1) {
  const nodes = Array.isArray(asn1?.value) ? asn1.value : []
  if (nodes.length >= 3 && nodes[0]?.type === ASN1_INTEGER && nodes[1]?.type === ASN1_INTEGER && nodes[2]?.type === ASN1_INTEGER) {
    return 'PKCS#1'
  }
  if (nodes.length >= 3 && nodes[0]?.type === ASN1_INTEGER && nodes[1]?.type === ASN1_SEQUENCE && nodes[2]?.type === ASN1_OCTET_STRING) {
    return 'PKCS#8'
  }
  if (nodes.length >= 2 && nodes[0]?.type === ASN1_SEQUENCE && nodes[1]?.type === ASN1_OCTET_STRING) {
    return 'PKCS#8 Encrypted'
  }
  return '未知'
}

function getPrivateKeyAlgorithmOid(asn1, container) {
  if (container !== 'PKCS#8') return null
  const oidNode = asn1?.value?.[1]?.value?.find((node) => node?.type === ASN1_OBJECT_IDENTIFIER)
  return oidNode ? getOidValue(oidNode) : null
}

function getWrappedPkcs1Asn1(asn1) {
  const octetString = asn1?.value?.[2]?.value
  if (typeof octetString !== 'string') return null
  try {
    return forge.asn1.fromDer(octetString)
  } catch {
    return null
  }
}

function getAsn1IntegerValue(asn1) {
  const value = asn1?.value?.[0]?.value
  if (typeof value !== 'string') return null
  const hex = forge.util.bytesToHex(value)
  return Number.parseInt(hex || '00', 16)
}

function getOidValue(node) {
  try {
    return forge.asn1.derToOid(node.value)
  } catch {
    return null
  }
}

function getBigIntegerDetails(value) {
  return {
    bits: value.bitLength(),
    bytes: Math.ceil(value.bitLength() / 8),
    hex: toUpperEvenHex(value.toString(16)),
  }
}

function toUpperEvenHex(value) {
  const normalized = String(value || '0').replace(/^0x/i, '') || '0'
  const even = normalized.length % 2 === 0 ? normalized : `0${normalized}`
  return even.toUpperCase()
}

function digestBytes(bytes, algorithm = 'sha256') {
  const md = algorithm === 'sha1' ? forge.md.sha1.create() : forge.md.sha256.create()
  md.update(bytesToBinaryString(bytes), 'raw')
  return md.digest().toHex().toUpperCase()
}