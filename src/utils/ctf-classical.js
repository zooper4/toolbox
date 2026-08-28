/**
 * CTF 古典密码算法集合
 * 全部为纯函数，无 DOM 依赖，可在 Node 中直接测试
 */

// ===== 英语频率评分（凯撒/XOR 爆破共用） =====
export const EN_FREQ = {
  a: 8.167, b: 1.492, c: 2.782, d: 4.253, e: 12.702, f: 2.228, g: 2.015,
  h: 6.094, i: 6.966, j: 0.153, k: 0.772, l: 4.025, m: 2.406, n: 6.749,
  o: 7.507, p: 1.929, q: 0.095, r: 5.987, s: 6.327, t: 9.056, u: 2.758,
  v: 0.978, w: 2.360, x: 0.150, y: 1.974, z: 0.074,
};

// 英语高频双字母组合（bigram）
const STRONG_WORDS = ['the', 'and', 'that', 'this', 'have', 'with', 'your', 'will', 'hello', 'world', 'flag', 'secret', 'attack', 'message', 'what', 'are', 'for', 'you', 'not', 'but'];

// 英语高频双字母组合（bigram）
const TOP_BIGRAMS = new Set(['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st', 'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou', 'io', 'le', 've', 'co', 'me', 'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea', 'ra', 'ce', 'li', 'ch', 'll', 'be', 'ma', 'si', 'om', 'ur']);

// 常见词子串合并正则（一次扫描计数；长词优先避免截断）
const COMMON_RE = /(this|that|hello|world|secret|attack|message|have|with|your|will|what|the|and|ing|ion|ent|for|you|are|hat|ith|her|all|thi|ere|one|not|but|can|flag|ctf)/g;

/**
 * 英文文本评分（chi-square 频率距离 + 常见词/bigram 奖励）
 * 分数越低越像英文
 */
export function englishScore(text) {
  const lower = text.toLowerCase();
  let letters = 0;
  const counts = {};
  for (const ch of lower) {
    if (/[a-z]/.test(ch)) {
      letters++;
      counts[ch] = (counts[ch] || 0) + 1;
    }
  }
  if (letters === 0) return Infinity;
  let score = 0;
  for (let i = 97; i <= 122; i++) {
    const c = String.fromCharCode(i);
    const observed = ((counts[c] || 0) / letters) * 100;
    const expected = EN_FREQ[c];
    const diff = observed - expected;
    score += (diff * diff) / expected;
  }
  // 常见词子串奖励：合并正则一次扫描计数（无空格文本也能命中）
  const commonHits = lower.match(COMMON_RE) || [];
  score -= 25 * commonHits.length;
  // 强单词独立词命中大额奖励
  for (const word of STRONG_WORDS) {
    const re = new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'g');
    if (re.test(lower)) score -= 40;
  }
  // bigram 奖励
  let bigramHits = 0;
  for (let i = 0; i < lower.length - 1; i++) {
    if (TOP_BIGRAMS.has(lower.slice(i, i + 2))) bigramHits++;
  }
  score -= bigramHits * 2;
  // 控制字符惩罚（爆破场景区分度）
  let controlCount = 0;
  for (const ch of lower) {
    const code = ch.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) controlCount++;
  }
  score += controlCount * 50;
  // 字母占比奖励
  score += Math.max(0, (1 - letters / Math.max(1, text.length)) * 200);
  return score;
}

// ===== 凯撒密码 =====
function caesarShiftChar(ch, shift, decrypt) {
  const isUpper = ch >= 'A' && ch <= 'Z';
  const isLower = ch >= 'a' && ch <= 'z';
  if (!isUpper && !isLower) return ch;
  const base = isUpper ? 65 : 97;
  const pos = ch.charCodeAt(0) - base;
  const k = decrypt ? (26 - shift) : shift;
  return String.fromCharCode(((pos + k) % 26 + 26) % 26 + base);
}

export function caesarEncrypt(text, shift) {
  const s = ((shift % 26) + 26) % 26;
  return text.split('').map((ch) => caesarShiftChar(ch, s, false)).join('');
}

export function caesarDecrypt(text, shift) {
  const s = ((shift % 26) + 26) % 26;
  return text.split('').map((ch) => caesarShiftChar(ch, s, true)).join('');
}

/** 全量爆破：返回按英文评分排序的 [{shift, text, score}] */
export function caesarBruteforce(text) {
  const results = [];
  for (let shift = 1; shift <= 25; shift++) {
    const plain = caesarDecrypt(text, shift);
    results.push({ shift, text: plain, score: englishScore(plain) });
  }
  results.sort((a, b) => a.score - b.score);
  return results;
}

// ===== ROT13 / ROT47 =====
export function rot13(text) {
  return caesarEncrypt(text, 13);
}

export function rot47(text) {
  return text.split('').map((ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 33 && code <= 126) {
      return String.fromCharCode(33 + ((code - 33 + 47) % 94));
    }
    return ch;
  }).join('');
}

// ===== 维吉尼亚密码 =====
function vigenereCore(text, key, decrypt) {
  let keyIndex = 0;
  let result = '';
  const keyLower = key.toLowerCase().replace(/[^a-z]/g, '');
  if (!keyLower) return '错误：密钥不能为空';
  for (const ch of text) {
    const isUpper = ch >= 'A' && ch <= 'Z';
    const isLower = ch >= 'a' && ch <= 'z';
    if (!isUpper && !isLower) {
      result += ch;
      continue;
    }
    const base = isUpper ? 65 : 97;
    const k = keyLower.charCodeAt(keyIndex % keyLower.length) - 97;
    const pos = ch.charCodeAt(0) - base;
    const shifted = decrypt ? (pos - k + 26) % 26 : (pos + k) % 26;
    result += String.fromCharCode(shifted + base);
    keyIndex++;
  }
  return result;
}

export function vigenereEncrypt(text, key) {
  return vigenereCore(text, key, false);
}

export function vigenereDecrypt(text, key) {
  return vigenereCore(text, key, true);
}

function chiSquareFreq(text) {
  let letters = 0;
  const counts = {};
  for (const ch of text.toLowerCase()) {
    if (/[a-z]/.test(ch)) {
      letters++;
      counts[ch] = (counts[ch] || 0) + 1;
    }
  }
  if (letters === 0) return Infinity;
  let score = 0;
  for (let i = 97; i <= 122; i++) {
    const c = String.fromCharCode(i);
    const observed = ((counts[c] || 0) / letters) * 100;
    const expected = EN_FREQ[c];
    const diff = observed - expected;
    score += (diff * diff) / expected;
  }
  return score;
}

/** 单表频率分析：找最佳位移 */
function findBestShift(columnText) {
  let best = { shift: 0, score: Infinity };
  for (let shift = 0; shift < 26; shift++) {
    const shifted = columnText.split('').map((ch) => {
      const isUpper = ch >= 'A' && ch <= 'Z';
      const isLower = ch >= 'a' && ch <= 'z';
      if (!isUpper && !isLower) return ch;
      const base = isUpper ? 65 : 97;
      return String.fromCharCode(((ch.charCodeAt(0) - base - shift) % 26 + 26) % 26 + base);
    }).join('');
    const score = chiSquareFreq(shifted);
    if (score < best.score) best = { shift, score };
  }
  return best;
}

/** 重合指数（Index of Coincidence），英文 ~0.065，随机 ~0.038 */
function indexOfCoincidence(text) {
  const clean = text.replace(/[^a-z]/g, '');
  const n = clean.length;
  if (n < 2) return 0;
  const counts = {};
  for (const ch of clean) counts[ch] = (counts[ch] || 0) + 1;
  let sum = 0;
  for (const v of Object.values(counts)) sum += v * (v - 1);
  return sum / (n * (n - 1));
}

/** Kasiski 检验：重复子串间距的因子计数 */
function kasiskiKeyLengths(cipher, maxLen = 20) {
  const clean = cipher.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (clean.length < 8) return [];
  const distances = [];
  for (let len = 3; len <= 8; len++) {
    for (let i = 0; i + len * 2 <= clean.length; i++) {
      const sub = clean.slice(i, i + len);
      let idx = clean.indexOf(sub, i + len);
      while (idx !== -1) {
        distances.push(idx - i);
        idx = clean.indexOf(sub, idx + 1);
      }
    }
  }
  const factors = {};
  for (const d of distances) {
    for (let f = 2; f <= Math.min(maxLen, d); f++) {
      if (d % f === 0) factors[f] = (factors[f] || 0) + 1;
    }
  }
  return Object.entries(factors)
    .sort((a, b) => b[1] - a[1])
    .map(([f]) => parseInt(f))
    .slice(0, 8);
}

/** 重合指数法估计密钥长度：IC 越接近 0.065 越可能是真实长度 */
function icKeyLengths(cipher, maxLen = 20) {
  const clean = cipher.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const results = [];
  for (let L = 1; L <= Math.min(maxLen, Math.floor(clean.length / 2)); L++) {
    const cols = Array.from({ length: L }, () => []);
    for (let i = 0; i < clean.length; i++) cols[i % L].push(clean[i]);
    const avgIC = cols.reduce((s, col) => s + indexOfCoincidence(col.join('')), 0) / L;
    results.push({ L, ic: avgIC });
  }
  return results.sort((a, b) => Math.abs(a.ic - 0.065) - Math.abs(b.ic - 0.065)).map((r) => r.L);
}

/** 密钥爬山优化（多随机重启避免局部最优）：逐位尝试 26 个字母，用明文英文评分择优 */
function refineKey(cipher, key, restarts = 6) {
  const keys = [key];
  for (let r = 0; r < restarts; r++) {
    const k2 = key.split('');
    const nMut = 1 + Math.floor(Math.random() * Math.min(3, key.length));
    for (let m = 0; m < nMut; m++) {
      const idx = Math.floor(Math.random() * k2.length);
      k2[idx] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    keys.push(k2.join(''));
  }
  let bestKey = key;
  let bestScore = englishScore(vigenereDecrypt(cipher, bestKey));
  for (const start of keys) {
    let bk = start;
    let bs = englishScore(vigenereDecrypt(cipher, bk));
    let improved = true;
    let guard = 0;
    while (improved && guard++ < 6) {
      improved = false;
      for (let i = 0; i < bk.length; i++) {
        for (let sh = 0; sh < 26; sh++) {
          const candidate = bk.slice(0, i) + String.fromCharCode(97 + sh) + bk.slice(i + 1);
          const sc = englishScore(vigenereDecrypt(cipher, candidate));
          if (sc < bs) {
            bs = sc;
            bk = candidate;
            improved = true;
          }
        }
      }
    }
    if (bs < bestScore) {
      bestScore = bs;
      bestKey = bk;
    }
  }
  return { key: bestKey, plain: vigenereDecrypt(cipher, bestKey), score: bestScore };
}

/** 模拟退火：随机扰动 + 概率接受差解，跳出局部最优 */
function annealKey(cipher, startKey, iters = 2500) {
  let cur = startKey;
  let curScore = englishScore(vigenereDecrypt(cipher, cur));
  let bestKey = cur;
  let bestScore = curScore;
  let temp = 10;
  for (let i = 0; i < iters; i++) {
    const idx = Math.floor(Math.random() * cur.length);
    const sh = Math.floor(Math.random() * 26);
    const cand = cur.slice(0, idx) + String.fromCharCode(97 + sh) + cur.slice(idx + 1);
    const sc = englishScore(vigenereDecrypt(cipher, cand));
    const delta = sc - curScore;
    if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
      cur = cand;
      curScore = sc;
      if (sc < bestScore) {
        bestScore = sc;
        bestKey = cand;
      }
    }
    temp *= 0.999;
  }
  return { key: bestKey, plain: vigenereDecrypt(cipher, bestKey), score: bestScore };
}

/** 折叠周期性密钥：secretsecret → secret */
function simplifyKey(key) {
  for (let d = 1; d <= Math.floor(key.length / 2); d++) {
    if (key.length % d === 0) {
      const pattern = key.slice(0, d);
      if (pattern.repeat(key.length / d) === key) return pattern;
    }
  }
  return key;
}

/** 每列 chi-square 排序取 top-k 位移 */
function topShiftCandidates(colText, k) {
  const results = [];
  for (let sh = 0; sh < 26; sh++) {
    const shifted = colText.split('').map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 97 - sh) % 26 + 26) % 26 + 97)).join('');
    results.push({ shift: sh, score: chiSquareFreq(shifted) });
  }
  results.sort((a, b) => a.score - b.score);
  return results.slice(0, k).map((r) => r.shift);
}

/** Beam search 破解：每列 top-k 位移组合 → 评分 → top 组合 refine */
function beamCrack(cipher, keyLen, beamWidth) {
  const clean = cipher.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const cols = Array.from({ length: keyLen }, () => []);
  for (let i = 0; i < clean.length; i++) cols[i % keyLen].push(clean[i]);
  const colCands = cols.map((col) => topShiftCandidates(col.join(''), beamWidth));
  let keys = [''];
  for (const cands of colCands) {
    const next = [];
    for (const k of keys) {
      for (const sh of cands) next.push(k + String.fromCharCode(97 + sh));
    }
    keys = next;
  }
  const scored = keys.map((key) => ({ key, score: englishScore(vigenereDecrypt(cipher, key)) }));
  scored.sort((a, b) => a.score - b.score);
  const top = scored.slice(0, 4);
  let best = null;
  for (const t of top) {
    const r = refineKey(cipher, t.key, 6);
    if (!best || r.score < best.score) best = r;
  }
  return best || { key: '', plain: '', score: Infinity };
}

/** 维吉尼亚自动破解：Kasiski + 重合指数 联合估计密钥长度，频率分析 + 爬山优化恢复密钥 */
export function vigenereCrack(cipher, maxKeyLen = 20) {
  const clean = cipher.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (clean.length < 8) return { key: '', plain: cipher, keyLength: 0, score: Infinity, error: '密文太短（至少 8 个字母），无法可靠破解' };

  const kasiski = kasiskiKeyLengths(cipher, maxKeyLen);
  const icCands = icKeyLengths(cipher, maxKeyLen);
  const candidates = [...new Set([...icCands, ...kasiski])].slice(0, 10);
  let best = { key: '', plain: '', keyLength: 0, score: Infinity };

  for (const keyLen of candidates) {
    if (keyLen < 1 || keyLen > maxKeyLen) continue;
    const columns = Array.from({ length: keyLen }, () => []);
    let idx = 0;
    for (const ch of clean) {
      columns[idx % keyLen].push(ch);
      idx++;
    }
    let key = '';
    let valid = true;
    for (let c = 0; c < keyLen; c++) {
      const colText = columns[c].join('');
      if (colText.length < 2) { valid = false; break; }
      const { shift } = findBestShift(colText);
      key += String.fromCharCode(97 + shift);
    }
    if (!valid) continue;
    // 方法1：普通 top-1 + 多起点爬山 refine
    const columns2 = Array.from({ length: keyLen }, () => []);
    let idx2 = 0;
    for (const ch of clean) {
      columns2[idx2 % keyLen].push(ch);
      idx2++;
    }
    let key2 = '';
    let valid2 = true;
    for (let c = 0; c < keyLen; c++) {
      const colText = columns2[c].join('');
      if (colText.length < 2) { valid2 = false; break; }
      const { shift } = findBestShift(colText);
      key2 += String.fromCharCode(97 + shift);
    }
    let refined = null;
    if (valid2) refined = refineKey(cipher, key2, 6);
    // 方法2：beam search（仅前 4 个候选，弥补多错误列场景）
    if (candidates.indexOf(keyLen) < 4 && keyLen <= 12) {
      const bw = keyLen <= 4 ? 4 : keyLen <= 7 ? 3 : 2;
      const beamResult = beamCrack(cipher, keyLen, bw);
      if (!refined || beamResult.score < refined.score) refined = beamResult;
    }
    // 方法3：模拟退火（仅前 3 个候选，3 链）
    if (refined && candidates.indexOf(keyLen) < 3) {
      for (let chain = 0; chain < 3; chain++) {
        const annealed = annealKey(cipher, refined.key, 4000);
        if (annealed.score < refined.score) refined = annealed;
      }
    }
    if (!refined) continue;
    // 折叠周期性密钥
    const finalKey = simplifyKey(refined.key);
    const finalPlain = vigenereDecrypt(cipher, finalKey);
    const finalScore = englishScore(finalPlain) + finalKey.length * 20;
    if (finalScore < best.score) {
      best = { key: finalKey, plain: finalPlain, keyLength: finalKey.length, score: finalScore };
    }
  }
  return best;
}

// ===== 栅栏密码（Rail Fence） =====
export function railFenceEncrypt(text, rails) {
  const n = Math.max(2, parseInt(rails) || 2);
  if (n >= text.length) return text;
  const fence = Array.from({ length: n }, () => []);
  let row = 0, direction = 1;
  for (const ch of text) {
    fence[row].push(ch);
    row += direction;
    if (row === n - 1 || row === 0) direction = -direction;
  }
  return fence.flat().join('');
}

export function railFenceDecrypt(text, rails) {
  const n = Math.max(2, parseInt(rails) || 2);
  if (n >= text.length) return text;
  const positions = Array.from({ length: n }, () => []);
  let row = 0, direction = 1;
  for (let i = 0; i < text.length; i++) {
    positions[row].push(i);
    row += direction;
    if (row === n - 1 || row === 0) direction = -direction;
  }
  const flat = positions.flat();
  const result = new Array(text.length);
  for (let i = 0; i < text.length; i++) {
    result[flat[i]] = text[i];
  }
  return result.join('');
}

/** 栅栏爆破：2~maxRails 全试，按英文评分排序 */
export function railFenceBruteforce(text, maxRails = 20) {
  const results = [];
  for (let rails = 2; rails <= maxRails; rails++) {
    if (rails >= text.length) break;
    const plain = railFenceDecrypt(text, rails);
    results.push({ rails, text: plain, score: englishScore(plain) });
  }
  results.sort((a, b) => a.score - b.score);
  return results;
}

// ===== 摩斯电码 =====
const MORSE_MAP = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
  6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};
const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

export function morseEncode(text) {
  return text.toUpperCase().split('').map((ch) => {
    if (ch === ' ') return '/';
    return MORSE_MAP[ch] || '';
  }).filter((seg, i, arr) => !(seg === '' && (i === 0 || arr[i - 1] === ''))).join(' ');
}

export function morseDecode(code) {
  return code.trim().split(/\s+/).map((sym) => {
    if (sym === '/') return ' ';
    return MORSE_REVERSE[sym] || '?';
  }).join('');
}

// ===== 仿射密码 =====
const AFFINE_VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

function modInverse(a, m) {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x;
  }
  return 1;
}

function affineCore(text, a, b, decrypt) {
  const aInv = modInverse(a, 26);
  return text.split('').map((ch) => {
    const isUpper = ch >= 'A' && ch <= 'Z';
    const isLower = ch >= 'a' && ch <= 'z';
    if (!isUpper && !isLower) return ch;
    const base = isUpper ? 65 : 97;
    const pos = ch.charCodeAt(0) - base;
    let out;
    if (decrypt) {
      out = (aInv * ((pos - b) % 26 + 26)) % 26;
    } else {
      out = (a * pos + b) % 26;
    }
    return String.fromCharCode(out + base);
  }).join('');
}

export function affineEncrypt(text, a, b) {
  return affineCore(text, parseInt(a) || 1, parseInt(b) || 0, false);
}

export function affineDecrypt(text, a, b) {
  return affineCore(text, parseInt(a) || 1, parseInt(b) || 0, true);
}

/** 仿射爆破：全部合法 (a,b) 组合，按英文评分排序 */
export function affineBruteforce(text) {
  const results = [];
  for (const a of AFFINE_VALID_A) {
    for (let b = 0; b < 26; b++) {
      const plain = affineDecrypt(text, a, b);
      results.push({ a, b, text: plain, score: englishScore(plain) });
    }
  }
  results.sort((x, y) => x.score - y.score);
  return results;
}

// ===== 培根密码 =====
// 标准 24 字母版（I/J 合并，U/V 合并）与 26 字母版
function baconAlphabet(variant) {
  const alpha = 'ABCDEFGHIKLMNOPQSTUWXYZ'; // 24 字母：无 J、V
  const alpha26 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letters = variant === '24' ? alpha : alpha26;
  return letters.split('');
}

export function baconEncode(text, variant = '24') {
  const letters = baconAlphabet(variant);
  return text.toUpperCase().split('').map((ch) => {
    if (ch === ' ') return '/';
    const idx = letters.indexOf(ch);
    if (idx === -1) return '';
    return idx.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B');
  }).join(' ');
}

export function baconDecode(code, variant = '24') {
  const letters = baconAlphabet(variant);
  return code.trim().split(/\s+/).map((seg) => {
    if (seg === '/') return ' ';
    const bin = seg.replace(/[ABab]/g, (c) => (c.toLowerCase() === 'a' ? '0' : '1'));
    if (!/^[01]{5}$/.test(bin)) return '?';
    return letters[parseInt(bin, 2)] || '?';
  }).join('');
}

// ===== Playfair =====
function playfairMatrix(key) {
  const cleaned = (key.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ');
  const seen = new Set();
  const matrix = [];
  for (const ch of cleaned) {
    if (!seen.has(ch)) {
      seen.add(ch);
      matrix.push(ch);
    }
  }
  return matrix; // 25 个字符
}

function playfairDigraphs(text) {
  const cleaned = text.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
  const digraphs = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    let a = cleaned[i];
    let b = cleaned[i + 1];
    if (!b) {
      digraphs.push([a, 'X']);
      break;
    }
    if (a === b) {
      digraphs.push([a, 'X']);
      i--;
    } else {
      digraphs.push([a, b]);
    }
  }
  return digraphs;
}

function playfairPos(matrix, ch) {
  const idx = matrix.indexOf(ch);
  return [Math.floor(idx / 5), idx % 5];
}

function playfairCore(text, key, decrypt) {
  const matrix = playfairMatrix(key);
  const digraphs = playfairDigraphs(text);
  const shift = decrypt ? 4 : 1;
  return digraphs.map(([a, b]) => {
    const [ar, ac] = playfairPos(matrix, a);
    const [br, bc] = playfairPos(matrix, b);
    let na, nb;
    if (ar === br) {
      na = matrix[ar * 5 + ((ac + shift) % 5)];
      nb = matrix[br * 5 + ((bc + shift) % 5)];
    } else if (ac === bc) {
      na = matrix[((ar + shift) % 5) * 5 + ac];
      nb = matrix[((br + shift) % 5) * 5 + bc];
    } else {
      na = matrix[ar * 5 + bc];
      nb = matrix[br * 5 + ac];
    }
    return na + nb;
  }).join('');
}

export function playfairEncrypt(text, key) {
  return playfairCore(text, key, false);
}

export function playfairDecrypt(text, key) {
  let result = playfairCore(text, key, true);
  // 去掉加密时补的尾部填充 X
  if (result.length > 1 && result.endsWith('X')) result = result.slice(0, -1);
  return result;
}

// ===== ADFGVX =====
const ADFGVX_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ADFGVX_CHARS = 'ADFGVX';

function adfgvxPolybius() {
  const map = {};
  for (let i = 0; i < ADFGVX_ALPHABET.length; i++) {
    const row = ADFGVX_CHARS[Math.floor(i / 6)];
    const col = ADFGVX_CHARS[i % 6];
    map[ADFGVX_ALPHABET[i]] = row + col;
  }
  return map;
}

function columnOrder(key) {
  const cleaned = key.replace(/\s/g, '');
  const chars = cleaned.split('');
  const order = chars.map((ch, i) => ({ ch, i }))
    .sort((a, b) => a.ch.localeCompare(b.ch) || a.i - b.i)
    .map((item) => item.i);
  return order;
}

export function adfgvxEncrypt(text, key) {
  const poly = adfgvxPolybius();
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!key) return '错误：需要列置换密钥';
  const order = columnOrder(key);
  const cols = order.length;
  const encoded = cleaned.split('').map((ch) => poly[ch] || '').join('');
  // 按列写入
  const rows = [];
  for (let i = 0; i < encoded.length; i += cols) {
    rows.push(encoded.slice(i, i + cols));
  }
  // 按密钥排序后的列读出
  let result = '';
  for (const colIdx of order) {
    for (const row of rows) {
      if (row[colIdx]) result += row[colIdx];
    }
  }
  return result;
}

export function adfgvxDecrypt(text, key) {
  const poly = adfgvxPolybius();
  const reverse = Object.fromEntries(Object.entries(poly).map(([k, v]) => [v, k]));
  if (!key) return '错误：需要列置换密钥';
  const order = columnOrder(key);
  const cols = order.length;
  const cleaned = text.toUpperCase().replace(/[^ADFGVX]/g, '');
  const rows = Math.ceil(cleaned.length / cols);
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(''));
  // 按列序填充
  let idx = 0;
  const colLengths = order.map((colIdx) => {
    // 该列在网格中的有效行数
    let count = 0;
    for (let r = 0; r < rows; r++) {
      const pos = r * cols + colIdx;
      if (pos < cleaned.length) count++;
    }
    return count;
  });
  const colStart = {};
  let offset = 0;
  for (let i = 0; i < cols; i++) {
    colStart[order[i]] = offset;
    offset += colLengths[i];
  }
  for (let c = 0; c < cols; c++) {
    let start = colStart[c];
    for (let r = 0; r < rows; r++) {
      const pos = r * cols + c;
      if (pos < cleaned.length) {
        grid[r][c] = cleaned[start++];
      }
    }
  }
  // 行优先读出，每两字符查表
  let result = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result += grid[r][c] || '';
    }
  }
  let plain = '';
  for (let i = 0; i + 1 < result.length; i += 2) {
    plain += reverse[result.slice(i, i + 2)] || '?';
  }
  return plain;
}

// ===== Brainfuck 解释器 =====
export function brainfuckRun(code, input = '') {
  const cells = new Uint8Array(30000);
  let ptr = 0, pc = 0, output = '';
  let inputIdx = 0;
  const stack = [];
  const steps = 0;
  const MAX_STEPS = 10000000;

  const jumpMap = {};
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '[') stack.push(i);
    else if (code[i] === ']') {
      if (stack.length === 0) return { error: `第 ${i} 个 ] 缺少匹配的 [` };
      const open = stack.pop();
      jumpMap[open] = i;
      jumpMap[i] = open;
    }
  }
  if (stack.length > 0) return { error: `第 ${stack[0]} 个 [ 缺少匹配的 ]` };

  while (pc < code.length) {
    const cmd = code[pc];
    switch (cmd) {
      case '>': ptr = (ptr + 1) % 30000; break;
      case '<': ptr = (ptr + 29999) % 30000; break;
      case '+': cells[ptr] = (cells[ptr] + 1) & 255; break;
      case '-': cells[ptr] = (cells[ptr] + 255) & 255; break;
      case '.': output += String.fromCharCode(cells[ptr]); break;
      case ',': cells[ptr] = inputIdx < input.length ? input.charCodeAt(inputIdx++) : 0; break;
      case '[': if (cells[ptr] === 0) pc = jumpMap[pc]; break;
      case ']': if (cells[ptr] !== 0) pc = jumpMap[pc]; break;
    }
    pc++;
    if (pc % 1000 === 0 && pc > MAX_STEPS) return { error: '执行步数超限，可能死循环', output };
  }
  return { output, cells: Array.from(cells.slice(0, 64)) };
}

// Ook! 与 Brainfuck 互转
const OOK_MAP = {
  'Ook. Ook.': '+', 'Ook! Ook!': '-', 'Ook. Ook!': '>', 'Ook! Ook.': '<',
  'Ook. Ook?': '[', 'Ook? Ook.': ']', 'Ook! Ook?': '.', 'Ook? Ook!': ',',
};
const OOK_REVERSE = Object.fromEntries(Object.entries(OOK_MAP).map(([k, v]) => [v, k]));

export function ookToBrainfuck(ook) {
  const tokens = ook.match(/Ook[.!?] Ook[.!?]/g) || [];
  return tokens.map((t) => OOK_MAP[t] || '').join('');
}

export function brainfuckToOok(bf) {
  return bf.split('').filter((c) => '+-<>[].,'.includes(c)).map((c) => OOK_REVERSE[c]).join(' ');
}

// ===== 词频分析 =====
export function frequencyAnalysis(text) {
  const counts = {};
  let total = 0;
  for (const ch of text.toLowerCase()) {
    if (/[a-z]/.test(ch)) {
      counts[ch] = (counts[ch] || 0) + 1;
      total++;
    }
  }
  if (total === 0) return { counts: {}, total: 0, sorted: [], words: [] };
  const sorted = Object.entries(counts)
    .map(([letter, count]) => ({ letter, count, pct: (count / total) * 100, enFreq: EN_FREQ[letter] }))
    .sort((a, b) => b.count - a.count);
  // 单词频率
  const wordCounts = {};
  const words = text.toLowerCase().match(/[a-z]{2,}/g) || [];
  for (const w of words) wordCounts[w] = (wordCounts[w] || 0) + 1;
  const topWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
  return { counts, total, sorted, words: topWords };
}

// ===== 猪圈密码（Pigpen） =====
// 9 个基础格子形状：A-I 无标记，J-R 带点，S-Z 带叉
const PIGPEN_SHAPES = [
  'r,d', 'l,r,d', 'l,d', 'u,r,d', 'u,l,r,d', 'u,l,d', 'u,r', 'u,l,r', 'u,l',
];
const PIGPEN_SIZE = 40;
const PIGPEN_PAD = 5;

function pigpenSymbolSvg(shapeIdx, mark) {
  const size = PIGPEN_SIZE, pad = PIGPEN_PAD;
  const dirs = PIGPEN_SHAPES[shapeIdx].split(',');
  const paths = [];
  if (dirs.includes('u')) paths.push(`M${pad} ${pad} L${size - pad} ${pad}`);
  if (dirs.includes('d')) paths.push(`M${pad} ${size - pad} L${size - pad} ${size - pad}`);
  if (dirs.includes('l')) paths.push(`M${pad} ${pad} L${pad} ${size - pad}`);
  if (dirs.includes('r')) paths.push(`M${size - pad} ${pad} L${size - pad} ${size - pad}`);
  let extra = '';
  if (mark === 'dot') extra = `<circle cx="${size / 2}" cy="${size / 2}" r="4.5" fill="currentColor"/>`;
  if (mark === 'cross') extra = `<path d="M${size / 2 - 7} ${size / 2 - 7} L${size / 2 + 7} ${size / 2 + 7} M${size / 2 + 7} ${size / 2 - 7} L${size / 2 - 7} ${size / 2 + 7}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:inline-block;vertical-align:middle">${paths.map((d) => `<path d="${d}" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}${extra}</svg>`;
}

/** 猪圈编码：文本 → SVG 符号序列 */
export function pigpenSvg(text) {
  const upper = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (!upper) return '';
  let svg = '';
  for (const ch of upper) {
    const code = ch.charCodeAt(0) - 65;
    let shapeIdx, mark;
    if (code <= 8) { shapeIdx = code; mark = null; }
    else if (code <= 17) { shapeIdx = code - 9; mark = 'dot'; }
    else { shapeIdx = code - 18; mark = 'cross'; }
    svg += pigpenSymbolSvg(shapeIdx, mark);
  }
  return svg;
}

/** 猪圈对照表 HTML：A-I / J-R / S-Z 三组 */
export function pigpenTableHtml() {
  const groups = [
    { label: 'A - I（无标记）', mark: null },
    { label: 'J - R（带点）', mark: 'dot' },
    { label: 'S - Z（带叉）', mark: 'cross' },
  ];
  return groups.map((g) => {
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const idx = g.mark === null ? i : g.mark === 'dot' ? 9 + i : 18 + i;
      if (idx >= 26) break;
      const ch = String.fromCharCode(65 + idx);
      cells.push(`<div class="pigpen-cell"><span class="pigpen-letter">${ch}</span>${pigpenSymbolSvg(i, g.mark)}</div>`);
    }
    return `<div class="pigpen-group"><div class="pigpen-group-label">${g.label}</div><div class="pigpen-row">${cells.join('')}</div></div>`;
  }).join('');
}
