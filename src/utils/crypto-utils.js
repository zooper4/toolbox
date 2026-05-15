export * from './crypto-common.js'
export * from './crypto-aes-des.js'
export * from './crypto-digest.js'
export * from './crypto-sm.js'
export * from './crypto-rsa.js'
export * from './crypto-chacha.js'

import { aesCmac as aesCmacImpl } from './crypto-aes-des.js'
import { hmac as hmacIntlImpl } from './crypto-digest.js'
import { hmac as hmacSmImpl } from './crypto-sm.js'

// Stable named exports to avoid `export *` name conflicts.
export { hmac as hmacIntl } from './crypto-digest.js'
export { hmac as hmacSm } from './crypto-sm.js'

export async function hmacAuto(algorithm, key, text, options = {}) {
	const algo = String(algorithm || '').toLowerCase()
	if (algo === 'sm3') {
		return hmacSmImpl(algo, key, text, options)
	}
	return hmacIntlImpl(algo, key, text, options)
}

export async function macAuto(algorithm, key, text, options = {}) {
	const algo = String(algorithm || '').toLowerCase()
	if (algo === 'aes-cmac') {
		return aesCmacImpl(key, text, options)
	}
	const normalizedHmacAlgorithm = algo.startsWith('hmac-') ? algo.slice(5) : algo
	return hmacAuto(normalizedHmacAlgorithm, key, text, options)
}

export async function macVerifyAuto(algorithm, key, text, expectedTag, options = {}) {
	const actualTag = await macAuto(algorithm, key, text, options)
	if (typeof actualTag !== 'string' || actualTag.startsWith('错误：')) return actualTag
	const normalizedExpected = String(expectedTag || '').replace(/\s+/g, '').toUpperCase()
	if (!normalizedExpected) return '错误：请输入待校验的 MAC 值'
	if (!/^[0-9A-F]+$/.test(normalizedExpected) || normalizedExpected.length % 2 !== 0) {
		return '错误：待校验 MAC 必须是偶数位 Hex 字符串'
	}
	return actualTag.toUpperCase() === normalizedExpected ? '✅ MAC 校验通过' : `❌ MAC 校验失败\n期望：${normalizedExpected}\n实际：${actualTag.toUpperCase()}`
}

// Backward-compatible default HMAC entry.
export const hmac = hmacAuto
