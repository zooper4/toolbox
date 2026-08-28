/**
 * CTF XOR 分析工具
 * 单字节爆破 / 重复密钥破解 / 加解密
 * 纯函数，无 DOM 依赖
 */
import { englishScore } from './ctf-classical.js';

// ===== 基础转换 =====
export function hexToBytes(hex) {
  const clean = String(hex).replace(/\s+/g, '');
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function bytesToText(bytes) {
  // 单字节映射（latin-1），避免 UTF-8 解码破坏字节流
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function strToBytes(str) {
  return new TextEncoder().encode(str);
}

/** 自动识别输入：hex 字符串（含空白）→ 字节数组；否则按文本处理 */
export function detectBytes(input) {
  const trimmed = String(input).trim();
  const clean = trimmed.replace(/\s+/g, '');
  if (clean.length > 0 && /^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0) {
    return { bytes: hexToBytes(clean), type: 'hex' };
  }
  return { bytes: strToBytes(trimmed), type: 'text' };
}

// ===== 汉明距离 =====
export function hammingDistance(a, b) {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    let x = a[i] ^ b[i];
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

// ===== XOR 加解密 =====
/**
 * 密钥循环异或。inputBytes: Uint8Array, key: string 或 Uint8Array
 * 返回 Uint8Array
 */
export function xorBytes(inputBytes, key) {
  const keyBytes = typeof key === 'string' ? strToBytes(key) : key;
  if (keyBytes.length === 0) return new Uint8Array(inputBytes);
  const out = new Uint8Array(inputBytes.length);
  for (let i = 0; i < inputBytes.length; i++) {
    out[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

/**
 * XOR 加解密（通用）。input 自动识别 hex/文本，key 为字符串
 * output: 'hex' | 'text'
 */
export function xorCipher(input, key, output = 'hex') {
  if (!key) return { error: '密钥不能为空' };
  const { bytes } = detectBytes(input);
  const out = xorBytes(bytes, key);
  if (output === 'text') return { text: bytesToText(out) };
  return { hex: bytesToHex(out) };
}

// ===== 单字节 XOR 爆破 =====
/**
 * 输入 hex（或文本），尝试全部 256 个单字节密钥
 * 返回按英文评分排序的结果 [{key, char, text, score, hex}]
 */
export function xorSingleByteBruteforce(input) {
  const { bytes, type } = detectBytes(input);
  if (bytes.length === 0) return { error: '输入为空' };
  const results = [];
  for (let k = 0; k < 256; k++) {
    const decrypted = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) decrypted[i] = bytes[i] ^ k;
    const text = bytesToText(decrypted);
    results.push({
      key: k,
      char: k >= 32 && k < 127 ? String.fromCharCode(k) : `\\x${k.toString(16).padStart(2, '0')}`,
      text,
      score: englishScore(text),
      hex: bytesToHex(decrypted),
    });
  }
  results.sort((a, b) => a.score - b.score);
  return { results, inputType: type };
}

// ===== 重复密钥 XOR 破解 =====
/** 归一化汉明距离：取前 n 块相邻块平均 */
function normalizedHammingDistance(bytes, keyLen) {
  const blockCount = 4;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i + keyLen * 2 <= bytes.length && i < keyLen * blockCount; i += keyLen) {
    total += hammingDistance(bytes.subarray(i, i + keyLen), bytes.subarray(i + keyLen, i + keyLen * 2));
    pairs++;
  }
  if (pairs === 0) return Infinity;
  return total / pairs / keyLen;
}

/** 列爆破评分：etaoin 高频字母占比 + 空格奖励 + 可打印性惩罚（对置换鲁棒） */
function columnEnglishScore(text) {
  let letters = 0;
  let topFreq = 0;
  let spaces = 0;
  let ctrl = 0;
  let hi = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code === 32) spaces++;
    else if (code < 32 && code !== 9 && code !== 10 && code !== 13) ctrl++;
    else if (code > 126) hi++;
  }
  for (const ch of text.toLowerCase()) {
    if (/[a-z]/.test(ch)) {
      letters++;
      if ('etaoinshrdlu'.includes(ch)) topFreq++;
    }
  }
  if (letters < 6) return 1000;
  let score = 100 - (topFreq / letters) * 100;
  score += Math.max(0, (1 - letters / text.length) * 150);
  score -= Math.min(spaces * 3, 30);
  score += ctrl * 250;
  score += hi * 150;
  return score;
}

/** 每列单字节爆破 top-k：返回最可能的 k 个密钥字节 */
function crackColumnTopK(colBytes, k) {
  const results = [];
  for (let key = 0; key < 256; key++) {
    const decrypted = new Uint8Array(colBytes.length);
    for (let i = 0; i < colBytes.length; i++) decrypted[i] = colBytes[i] ^ key;
    const text = bytesToText(decrypted);
    results.push({ key, score: columnEnglishScore(text) });
  }
  results.sort((a, b) => a.score - b.score);
  return results.slice(0, k);
}

/**
 * 重复密钥 XOR 破解
 * 1. 汉明距离估计密钥长度（2~maxKeyLen）
 * 2. 对候选长度分列，每列单字节爆破
 * 3. 组合密钥解密全文，按总评分取最优
 */
export function xorRepeatCrack(input, maxKeyLen = 40) {
  const { bytes } = detectBytes(input);
  if (bytes.length < 16) return { error: '数据太短（至少 16 字节），无法可靠分析' };

  // 1. 密钥长度候选：归一化汉明距离最小的 5 个
  const lengths = [];
  for (let len = 2; len <= Math.min(maxKeyLen, Math.floor(bytes.length / 4)); len++) {
    lengths.push({ len, dist: normalizedHammingDistance(bytes, len) });
  }
  lengths.sort((a, b) => a.dist - b.dist);
  const candidates = lengths.slice(0, 8).map((l) => l.len);
  // 补一个最接近平均的？不需要，5 个足够

  let best = { key: '', keyLength: 0, text: '', score: Infinity, keyHex: '' };

  for (const keyLen of candidates) {
    // 2. 分列
    const columns = Array.from({ length: keyLen }, () => []);
    for (let i = 0; i < bytes.length; i++) columns[i % keyLen].push(bytes[i]);
    if (columns.some((col) => col.length < 6)) continue;

    let bestForKeyLen = null;

    if (keyLen <= 12) {
      // 3. 每列 top-3 密钥字节，组合后全文评分（beam 搜索）
      const colTop = columns.map((col) => crackColumnTopK(new Uint8Array(col), 3));
      let keys = [''];
      for (const top of colTop) {
        const next = [];
        for (const k of keys) {
          for (const t of top) next.push(k + String.fromCharCode(t.key));
        }
        keys = next;
      }
      let bestCombo = null;
      for (const keyStr of keys) {
        const decrypted = xorBytes(bytes, keyStr);
        const text = bytesToText(decrypted);
        const score = englishScore(text);
        if (!bestCombo || score < bestCombo.score) {
          bestCombo = { key: keyStr, keyLength: keyLen, keyHex: bytesToHex(strToBytes(keyStr)), text, score };
        }
      }
      bestForKeyLen = bestCombo;
    } else {
      // 长密钥：每列 top-1 直接组合
      let keyBytes = new Uint8Array(keyLen);
      for (let c = 0; c < keyLen; c++) {
        keyBytes[c] = crackColumnTopK(new Uint8Array(columns[c]), 1)[0]?.key ?? 0;
      }
      const decrypted = xorBytes(bytes, keyBytes);
      const text = bytesToText(decrypted);
      bestForKeyLen = {
        key: bytesToText(keyBytes),
        keyLength: keyLen,
        keyHex: bytesToHex(keyBytes),
        text,
        score: englishScore(text),
      };
    }

    if (bestForKeyLen && bestForKeyLen.score < best.score) {
      best = bestForKeyLen;
    }
  }

  if (best.keyLength === 0) return { error: '未能找到有效密钥长度' };
  return best;
}
