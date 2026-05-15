export * from './crypto-common.js'
export * from './crypto-aes-des.js'
export * from './crypto-sm.js'
export * from './crypto-rsa.js'
export * from './crypto-chacha.js'

import { hmac as hmacIntlImpl } from './crypto-rsa.js'
import { hmac as hmacSmImpl } from './crypto-sm.js'

// Stable named exports to avoid `export *` name conflicts.
export { hmac as hmacIntl } from './crypto-rsa.js'
export { hmac as hmacSm } from './crypto-sm.js'

export async function hmacAuto(algorithm, key, text) {
	const algo = String(algorithm || '').toLowerCase()
	if (algo === 'sm3') {
		return hmacSmImpl(algo, key, text)
	}
	return hmacIntlImpl(algo, key, text)
}

// Backward-compatible default HMAC entry.
export const hmac = hmacAuto
