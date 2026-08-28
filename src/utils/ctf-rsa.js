/**
 * CTF RSA 攻击工具集
 * 基础解密 / 质因数分解 / 共模攻击 / 低指数广播 / Wiener 攻击 / 已知 d
 * 纯函数，BigInt 实现，无 DOM 依赖
 */

// ===== BigInt 数学基础 =====
export function parseBigInt(input) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  if (/^0[xX][0-9a-fA-F]+$/.test(s)) return BigInt(s);
  if (/^[0-9]+$/.test(s)) return BigInt(s);
  // 尝试纯 hex（无 0x 前缀，仅当全是 hex 字符且第一个字符不是数字开头？保守：不自动猜）
  return null;
}

export function bigintToDec(b) { return b.toString(); }
export function bigintToHex(b) { return '0x' + b.toString(16); }

/** 大整数 → 尝试解码为文本（hex 或 utf-8），失败返回 hex 字符串 */
export function bigintToText(b) {
  let hex = b.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  let text = '';
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  // 全部可打印才返回
  if (text.length > 0 && /^[\x20-\x7e\n\r\t]*$/.test(text)) return text;
  return '0x' + hex;
}

export function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  if (base < 0n) base += mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

export function egcd(a, b) {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}

export function modInverse(a, m) {
  const [g, x] = egcd(((a % m) + m) % m, m);
  if (g !== 1n) return null;
  return ((x % m) + m) % m;
}

export function gcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

/** 整数平方根 */
export function isqrt(n) {
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

/** 整数立方根（二分） */
export function icbrt(n) {
  if (n < 0n) return null;
  let lo = 0n;
  let hi = 1n;
  while (hi * hi * hi <= n) hi <<= 1n;
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if (mid * mid * mid <= n) lo = mid;
    else hi = mid - 1n;
  }
  return lo;
}

/** Miller-Rabin 概率素性测试 */
export function isProbablePrime(n, k = 12) {
  if (n < 2n) return false;
  const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];
  for (const p of smallPrimes) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n;
  let r = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    r++;
  }
  for (let i = 0; i < k; i++) {
    const a = 2n + (BigInt(Math.floor(Math.random() * 0x7fffffff)) % (n - 3n));
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let j = 0n; j < r - 1n; j++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }
    if (composite) return false;
  }
  return true;
}

// ===== 质因数分解 =====

function pollardRhoOnce(n, seed) {
  let x = seed;
  let y = seed;
  let d = 1n;
  const c = 1n;
  while (d === 1n) {
    x = (x * x + c) % n;
    y = (y * y + c) % n;
    y = (y * y + c) % n;
    d = gcd(x > y ? x - y : y - x, n);
  }
  return d === n ? null : d;
}

function pollardRho(n) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const seed = 2n + BigInt(attempt);
    const factor = pollardRhoOnce(n, seed);
    if (factor && factor !== n) return factor;
  }
  return null;
}

/** Fermat 分解：p、q 接近时有效 */
function fermatFactor(n) {
  let a = isqrt(n);
  if (a * a < n) a += 1n;
  for (let i = 0; i < 200000; i++) {
    const b2 = a * a - n;
    const b = isqrt(b2);
    if (b * b === b2) {
      const p = a - b;
      const q = a + b;
      if (p > 1n && q > 1n && p * q === n) return [p, q];
    }
    a += 1n;
  }
  return null;
}

/** 试除小因子 */
function trialDivide(n, limit = 200000) {
  for (let d = 2n; d * d <= n && d < BigInt(limit); d += d === 2n ? 1n : 2n) {
    if (n % d === 0n) return d;
  }
  return null;
}

/**
 * RSA n 分解。返回 { p, q, method } 或 { error }
 * maxBits: 超过该位数直接提示不可行
 */
export function rsaFactorize(n, maxBits = 512) {
  if (n <= 1n) return { error: 'n 必须大于 1' };
  if (isProbablePrime(n)) return { error: 'n 本身是素数，不是两个质数之积' };
  const bits = n.toString(2).length;
  if (bits > maxBits) {
    return { error: `n 为 ${bits} 位，超过 ${maxBits} 位限制，浏览器内无法分解（请确认题目是否给了 p/q/d）` };
  }
  // 1. 试除
  const small = trialDivide(n);
  if (small) {
    const q = n / small;
    if (small * q === n && small > 1n && q > 1n) {
      return { p: small, q, method: '试除法' };
    }
  }
  // 2. Fermat
  const fermat = fermatFactor(n);
  if (fermat) return { p: fermat[0], q: fermat[1], method: 'Fermat 分解（p、q 接近）' };
  // 3. Pollard rho
  const rho = pollardRho(n);
  if (rho) {
    const q = n / rho;
    if (rho * q === n) return { p: rho, q, method: 'Pollard rho' };
  }
  return { error: '分解失败：常见方法（试除/Fermat/Pollard rho）均未找到因子。n 可能过大或 p/q 差距悬殊' };
}

// ===== 中国剩余定理 =====
export function crt(remainders, moduli) {
  let M = 1n;
  for (const m of moduli) M *= m;
  let result = 0n;
  for (let i = 0; i < moduli.length; i++) {
    const Mi = M / moduli[i];
    const inv = modInverse(Mi, moduli[i]);
    if (inv === null) return null;
    result = (result + remainders[i] * Mi * inv) % M;
  }
  return result;
}

// ===== RSA 基础解密 =====
/**
 * 已知 n/e/c 解密。
 * 可选提供 p、q（或 d）：有 p/q 则计算 d；有 d 直接用
 * 都没有则尝试分解 n
 */
export function rsaBasicDecrypt(n, e, c, { p = null, q = null, d = null } = {}) {
  if (!n || !e || !c) return { error: '需要 n、e、c' };
  let dFinal = d;
  let detail = [];

  if (!dFinal && p && q) {
    const phi = (p - 1n) * (q - 1n);
    dFinal = modInverse(e, phi);
    if (dFinal === null) return { error: 'e 与 φ(n) 不互质，无法求逆' };
    detail.push(`由 p、q 计算 d = ${dFinal}`);
  }

  if (!dFinal) {
    detail.push('未提供 p/q/d，尝试分解 n...');
    const factor = rsaFactorize(n);
    if (factor.error) return { error: factor.error };
    const phi = (factor.p - 1n) * (factor.q - 1n);
    dFinal = modInverse(e, phi);
    if (dFinal === null) return { error: 'e 与 φ(n) 不互质' };
    detail.push(`分解成功：p = ${factor.p}, q = ${factor.q}，d = ${dFinal}`);
  }

  const m = modPow(c, dFinal, n);
  return {
    m,
    hex: bigintToHex(m),
    text: bigintToText(m),
    d: dFinal,
    detail: detail.join('\n'),
  };
}

// ===== 已知 d 解密 =====
export function rsaKnownDDecrypt(n, d, c) {
  if (!n || !d || !c) return { error: '需要 n、d、c' };
  const m = modPow(c, d, n);
  return { m, hex: bigintToHex(m), text: bigintToText(m) };
}

// ===== 共模攻击 =====
export function rsaCommonModulusAttack(n, e1, c1, e2, c2) {
  if (!n || !e1 || !c1 || !e2 || !c2) return { error: '需要 n、e1、c1、e2、c2' };
  const [g, s1, s2] = egcd(e1, e2);
  if (g !== 1n) return { error: `gcd(e1, e2) = ${g} ≠ 1，无法共模攻击（请检查两个指数是否互质）` };
  let m;
  if (s1 < 0n) {
    const inv = modInverse(c1, n);
    if (inv === null) return { error: 'c1 与 n 不互质，无法求逆' };
    m = (modPow(inv, -s1, n) * modPow(c2, s2, n)) % n;
  } else if (s2 < 0n) {
    const inv = modInverse(c2, n);
    if (inv === null) return { error: 'c2 与 n 不互质，无法求逆' };
    m = (modPow(c1, s1, n) * modPow(inv, -s2, n)) % n;
  } else {
    m = (modPow(c1, s1, n) * modPow(c2, s2, n)) % n;
  }
  return {
    m,
    hex: bigintToHex(m),
    text: bigintToText(m),
    detail: `s1 = ${s1}, s2 = ${s2}（s1·e1 + s2·e2 = 1）`,
  };
}

// ===== 低指数广播攻击 =====
export function rsaBroadcastAttack(ciphers, moduli, e = 3n) {
  if (!Array.isArray(ciphers) || !Array.isArray(moduli) || ciphers.length !== moduli.length) {
    return { error: '密文与模数数量不一致' };
  }
  if (ciphers.length < 2) return { error: '至少需要 2 组 (n, c)' };
  const eBig = typeof e === 'bigint' ? e : BigInt(e);
  // 检查模数两两互质
  for (let i = 0; i < moduli.length; i++) {
    for (let j = i + 1; j < moduli.length; j++) {
      if (gcd(moduli[i], moduli[j]) !== 1n) {
        return { error: `n${i + 1} 与 n${j + 1} 不互质，CRT 无法使用` };
      }
    }
  }
  const M = crt(ciphers, moduli);
  if (M === null) return { error: 'CRT 计算失败' };
  const m = icbrt(M);
  if (m * m * m !== M && m * m * m < M) {
    // 尝试 m+1
    if ((m + 1n) * (m + 1n) * (m + 1n) === M) {
      return { m: m + 1n, hex: bigintToHex(m + 1n), text: bigintToText(m + 1n), detail: `CRT 结果 = ${M}` };
    }
    return { error: '开立方后不是完全立方数：可能 e ≠ 3，或分组数量不足（需要 e 组）' };
  }
  return { m, hex: bigintToHex(m), text: bigintToText(m), detail: `CRT 结果 = ${M}` };
}

// ===== Wiener 攻击 =====
function continuedFraction(num, den) {
  const terms = [];
  while (den !== 0n) {
    terms.push(num / den);
    [num, den] = [den, num % den];
  }
  return terms;
}

function convergents(terms) {
  const convs = [];
  let h0 = 0n, h1 = 1n;
  let k0 = 1n, k1 = 0n;
  for (const t of terms) {
    const h = t * h1 + h0;
    const k = t * k1 + k0;
    convs.push({ k: h, d: k });
    h0 = h1; h1 = h;
    k0 = k1; k1 = k;
  }
  return convs;
}

/** 判别式是否完全平方，返回 sqrt */
function perfectSquare(n) {
  const s = isqrt(n);
  return s * s === n ? s : null;
}

/**
 * Wiener 攻击：e 很大且 d 较小时（d < n^0.25/3）
 * 连分数展开 e/n，测试收敛子恢复 d 与 p、q
 */
export function rsaWienerAttack(n, e) {
  if (!n || !e) return { error: '需要 n、e' };
  const terms = continuedFraction(e, n);
  const convs = convergents(terms);
  for (const { k, d } of convs) {
    if (k === 0n) continue;
    if ((e * d - 1n) % k !== 0n) continue;
    const phi = (e * d - 1n) / k;
    // 解 x² - (n - φ + 1)x + n = 0
    const s = n - phi + 1n;
    const disc = s * s - 4n * n;
    if (disc < 0n) continue;
    const sqrtDisc = perfectSquare(disc);
    if (sqrtDisc === null) continue;
    const p = (s + sqrtDisc) / 2n;
    const q = (s - sqrtDisc) / 2n;
    if (p > 1n && q > 1n && p * q === n) {
      return { p, q, d, phi, method: 'Wiener 攻击（连分数）' };
    }
  }
  return { error: 'Wiener 攻击失败：d 可能不够小（需要 d < n^0.25/3），或数据有误' };
}

/** 统一入口：根据输入自动路由到合适的攻击方法 */
export function rsaAttackAuto(n, e, c, extra = {}) {
  // 1. 有 p/q/d 直接解密
  if (extra.p && extra.q && !extra.d) {
    return { type: 'basic', ...rsaBasicDecrypt(n, e, c, { p: extra.p, q: extra.q }) };
  }
  if (extra.d) {
    return { type: 'known-d', ...rsaKnownDDecrypt(n, extra.d, c) };
  }
  // 2. 尝试 Wiener（e 通常很大）
  if (e.toString(2).length > n.toString(2).length / 2) {
    const wiener = rsaWienerAttack(n, e);
    if (!wiener.error) {
      const result = rsaBasicDecrypt(n, e, c, { p: wiener.p, q: wiener.q });
      return { type: 'wiener', ...result, ...wiener };
    }
  }
  // 3. 尝试分解
  const factor = rsaFactorize(n);
  if (!factor.error) {
    const result = rsaBasicDecrypt(n, e, c, { p: factor.p, q: factor.q });
    return { type: 'factor', ...result, method: factor.method };
  }
  return { error: '自动攻击失败：Wiener 与分解均未成功。请尝试共模/广播攻击或确认题目数据' };
}
