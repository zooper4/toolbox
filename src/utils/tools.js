/**
 * 工具函数集合，覆盖编解码、转换、生成、分析等基础能力。
 */
import * as smCrypto from 'sm-crypto';
import QRCode from 'qrcode';
import { diffArrays, diffChars } from 'diff';
import { colord } from 'colord';
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { format as prettierFormat } from 'prettier/standalone';
import * as prettierHtml from 'prettier/plugins/html';
import * as prettierPostcss from 'prettier/plugins/postcss';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

// ===== 基础转换 =====
const enc = new TextEncoder();
const dec = new TextDecoder();
export function str2ab(s) { return enc.encode(s); }
export function ab2str(b) { return dec.decode(b); }
export function ab2hex(b) { return Array.from(new Uint8Array(b)).map(i => i.toString(16).padStart(2,'0')).join(''); }
export function hex2ab(h) { const b = new Uint8Array(h.length/2); for(let i=0;i<h.length;i+=2) b[i/2]=parseInt(h.substr(i,2),16); return b; }
export function b64ToBuf(b64) { return Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); }
export function bufToB64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }

// ===== 编码转换 (原 encoders.js 迁移至此) =====
export function base64Encode(s) {
  try {
    const bytes = str2ab(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch(e) { return '错误：无法编码 — ' + e.message; }
}
export function base64Decode(s) {
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return ab2str(bytes);
  } catch(e) { return '错误：Base64 无效 — ' + e.message; }
}
export function urlEncode(s) { return encodeURIComponent(s); }
export function urlDecode(s) { try { return decodeURIComponent(s); } catch(e) { return '错误：URL 编码无效'; } }
export function hexEncode(s) { return Array.from(str2ab(s)).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase(); }
export function hexDecode(h) {
  try { return ab2str(hex2ab(h.replace(/\s/g,''))); } catch(e) { return '错误：Hex 无效'; }
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(s) {
  const b = str2ab(s); let bits=0, cnt=0, r='';
  for(const byte of b) { bits=(bits<<8)|byte; cnt+=8; while(cnt>=5) { cnt-=5; r+=B32[(bits>>cnt)&31]; } }
  if(cnt>0) { bits<<=(5-cnt); r+=B32[bits&31]; }
  while(r.length%8!==0) r+='=';
  return r;
}
export function base32Decode(s) {
  try {
    s=s.replace(/=+$/,'').toUpperCase();
    let bits=0, cnt=0;
    const bytes = [];
    for(const c of s) { const i=B32.indexOf(c); if(i<0) throw Error(); bits=(bits<<5)|i; cnt+=5; if(cnt>=8) { cnt-=8; bytes.push((bits>>cnt)&255); } }
    return ab2str(Uint8Array.from(bytes));
  } catch(e) { return '错误：Base32 无效'; }
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58Encode(s) {
  const b = str2ab(s); let n=BigInt(0); for(const x of b) n=(n<<8n)+BigInt(x);
  let r=''; while(n>0) { r=B58[Number(n%58n)]+r; n/=58n; }
  for(const x of b) { if(x===0) r='1'+r; else break; }
  return r;
}
export function base58Decode(s) {
  try {
    let n=BigInt(0); for(const c of s) { const i=B58.indexOf(c); if(i<0) throw Error(); n=n*58n+BigInt(i); }
    let b=[]; while(n>0) { b.unshift(Number(n&255n)); n>>=8n; }
    for(const c of s) { if(c==='1') b.unshift(0); else break; }
    return ab2str(Uint8Array.from(b));
  } catch(e) { return '错误：Base58 无效'; }
}

export function htmlEncode(s) { return s.replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
export function htmlDecode(s) { const el=document.createElement('textarea'); el.innerHTML=s; return el.value; }
export function unicodeEncode(s) { let r=''; for(const c of s) { const code=c.charCodeAt(0); r+=code>127?'\\u'+code.toString(16).padStart(4,'0'):c; } return r; }
export function unicodeDecode(s) { try { return s.replace(/\\u[0-9a-fA-F]{4}/g,m=>String.fromCharCode(parseInt(m.slice(2),16))); } catch(e) { return '错误：Unicode 转义无效'; } }
export function asciiToBin(s) { return s.split('').map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '); }
export function binToAscii(b) {
  try {
    const clean = String(b || '').replace(/\s+/g, '');
    if (!clean || clean.length % 8 !== 0 || /[^01]/.test(clean)) {
      throw new Error('invalid binary');
    }
    const bytes = new Uint8Array(clean.length / 8);
    for (let i = 0; i < clean.length; i += 8) {
      bytes[i / 8] = parseInt(clean.slice(i, i + 8), 2);
    }
    return ab2str(bytes);
  } catch(e) {
    return '错误：二进制无效（仅支持 0/1，且位数应为 8 的倍数）';
  }
}
export function jwtDecode(t) {
  try { const p=t.split('.'); if(p.length!==3) return '错误：无效 JWT'; return JSON.stringify({header:JSON.parse(atob(p[0])),payload:JSON.parse(atob(p[1])),signature:p[2]+'...'},null,2); }
  catch(e) { return '错误：JWT 解析失败'; }
}

// ===== Lorem Ipsum =====
const LOREM_WORDS = [
  'lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt',
  'ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco',
  'laboris','nisi','ut','aliquip','ex','ea','commodo','consequat','duis','aute','irure','dolor','in','reprehenderit',
  'voluptate','velit','esse','cillum','dolore','eu','fugiat','nulla','pariatur','excepteur','sint','occaecat',
  'cupidatat','non','proident','sunt','in','culpa','qui','officia','deserunt','mollis','anim','id','est','laborum'
];

export function generateLoremIpsum(paragraphs, sentencesPerPara, wordsPerSentence) {
  const result = [];
  for (let p = 0; p < paragraphs; p++) {
    const sentences = [];
    for (let s = 0; s < sentencesPerPara; s++) {
      const words = [];
      const count = wordsPerSentence + Math.floor(Math.random() * 5) - 2;
      for (let w = 0; w < count; w++) {
        const word = LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
        words.push(w === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word);
      }
      sentences.push(words.join(' ') + (s < sentencesPerPara - 1 || count > 0 ? '.' : ''));
    }
    result.push(sentences.join(' '));
  }
  return result.join('\n\n');
}

// ===== 字符格式化 =====
export function timeInterval(date1, date2, unit) {
  const d1 = new Date(date1), d2 = new Date(date2);
  const ms = Math.abs(d2 - d1);
  const units = {
    ms: ms, seconds: ms/1000, minutes: ms/60000, hours: ms/3600000,
    days: ms/86400000, weeks: ms/604800000, months: ms/2629746000, years: ms/31556952000
  };
  if (unit) return units[unit]?.toFixed(2) || '未知单位';
  return {
    ms, seconds: ms/1000, minutes: ms/60000, hours: ms/3600000,
    days: ms/86400000, weeks: ms/604800000, months: ms/2629746000, years: ms/31556952000
  };
}

export function caseConvert(text, targetCase) {
  if (!text) return '';
  const words = text.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$|\d)|\d+/g) || [text];
  switch(targetCase) {
    case 'camel': return words.map((w,i) => i===0 ? w.toLowerCase() : w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join('');
    case 'pascal': return words.map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join('');
    case 'snake': return words.map(w => w.toLowerCase()).join('_');
    case 'kebab': return words.map(w => w.toLowerCase()).join('-');
    case 'upper': return words.map(w => w.toUpperCase()).join('_');
    case 'lower': return words.map(w => w.toLowerCase()).join(' ');
    case 'title': return words.map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    default: return text;
  }
}

// ===== 颜色转换 =====

// ===== 数据格式转换 =====
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  format: true,
  suppressEmptyNode: true,
});

export function dataFormatConvert(input, fromFormat, toFormat) {
  try {
    let data;
    switch(fromFormat) {
      case 'json': data = JSON.parse(input); break;
      case 'xml': {
        data = xmlToJson(input);
        break;
      }
      case 'csv': {
        data = csvToJson(input);
        break;
      }
      case 'yaml': {
        data = parseYaml(input);
        break;
      }
      default: return '不支持的源格式';
    }
    switch(toFormat) {
      case 'json': return JSON.stringify(data, null, 2);
      case 'xml': return jsonToXml(data);
      case 'csv': return jsonToCsv(data);
      case 'yaml': return stringifyYaml(data).trimEnd();
      default: return '不支持的目标格式';
    }
  } catch(e) { return `转换错误: ${e.message}`; }
}

function xmlToJson(xmlText) {
  const validation = XMLValidator.validate(xmlText);
  if (validation !== true) {
    throw new Error(`XML 无效: ${validation.err.msg}`);
  }

  const parsed = xmlParser.parse(xmlText);
  return unwrapXmlRoot(parsed);
}

function jsonToXml(data) {
  return xmlBuilder.build(wrapXmlRoot(data));
}

function csvToJson(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

function jsonToCsv(data) {
  const rows = Array.isArray(data) ? data : (isPlainObject(data) ? [data] : null);
  if (!rows) return '错误：对象数组或单个对象才能转 CSV';
  if (rows.length === 0) return '(空)';

  const headers = Array.from(rows.reduce((set, row) => {
    if (isPlainObject(row)) {
      Object.keys(row).forEach((key) => set.add(key));
    }
    return set;
  }, new Set()));

  if (headers.length === 0) return '(空)';

  return [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvField(row?.[header] ?? '')).join(',')),
  ].join('\n');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index++;
        continue;
      }
      if (char === '"') {
        quoted = false;
        continue;
      }
      current += char;
      continue;
    }

    if (char === ',') {
      values.push(current);
      current = '';
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function escapeCsvField(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function wrapXmlRoot(data) {
  if (isPlainObject(data) && Object.keys(data).length === 1) {
    return data;
  }
  return { root: data };
}

function unwrapXmlRoot(parsed) {
  if (!isPlainObject(parsed)) return parsed;
  const keys = Object.keys(parsed).filter((key) => key !== '?xml');
  if (keys.length === 1) {
    return parsed[keys[0]];
  }
  return parsed;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

// ===== 文本差异对比 =====
export function textDiff(text1, text2, options = {}) {
  const leftLines = buildDiffLines(text1, options);
  const rightLines = buildDiffLines(text2, options);
  const isSame = sameLines(leftLines, rightLines);
  const rows = [];

  if (isSame && leftLines.length === 0 && rightLines.length === 0) {
    return '<div class="diff-compare"><div class="diff-status">文本完全一致</div></div>';
  }

  if (isSame) {
    for (let index = 0; index < leftLines.length; index++) {
      rows.push(renderDiffRow({
        leftNumber: index + 1,
        rightNumber: index + 1,
        leftText: leftLines[index],
        rightText: rightLines[index],
      }));
    }
    return renderDiffCompare(rows, true);
  }

  const parts = diffArrays(leftLines, rightLines);
  let leftNumber = 1;
  let rightNumber = 1;

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (part.removed && parts[index + 1]?.added) {
      const removedLines = part.value;
      const addedLines = parts[index + 1].value;
      const pairCount = Math.max(removedLines.length, addedLines.length);
      for (let lineIndex = 0; lineIndex < pairCount; lineIndex++) {
        const removedLine = removedLines[lineIndex];
        const addedLine = addedLines[lineIndex];
        if (removedLine !== undefined && addedLine !== undefined) {
          rows.push(renderDiffRow({
            leftNumber: leftNumber++,
            rightNumber: rightNumber++,
            leftText: removedLine,
            rightText: addedLine,
            leftClass: 'diff-cell-rem',
            rightClass: 'diff-cell-add',
            leftContent: renderLineFragments('left', removedLine, addedLine),
            rightContent: renderLineFragments('right', removedLine, addedLine),
            rowClass: 'diff-row-changed',
          }));
        } else if (removedLine !== undefined) {
          rows.push(renderDiffRow({
            leftNumber: leftNumber++,
            rightNumber: '',
            leftText: removedLine,
            rightText: '',
            leftClass: 'diff-cell-rem',
            rightClass: 'diff-cell-empty',
            rightContent: renderMissingCell(),
            rowClass: 'diff-row-removed',
          }));
        } else if (addedLine !== undefined) {
          rows.push(renderDiffRow({
            leftNumber: '',
            rightNumber: rightNumber++,
            leftText: '',
            rightText: addedLine,
            leftClass: 'diff-cell-empty',
            rightClass: 'diff-cell-add',
            leftContent: renderMissingCell(),
            rowClass: 'diff-row-added',
          }));
        }
      }
      index++;
      continue;
    }

    for (const line of part.value) {
      if (part.added) {
        rows.push(renderDiffRow({
          leftNumber: '',
          rightNumber: rightNumber++,
          leftText: '',
          rightText: line,
          leftClass: 'diff-cell-empty',
          rightClass: 'diff-cell-add',
          leftContent: renderMissingCell(),
          rowClass: 'diff-row-added',
        }));
      } else if (part.removed) {
        rows.push(renderDiffRow({
          leftNumber: leftNumber++,
          rightNumber: '',
          leftText: line,
          rightText: '',
          leftClass: 'diff-cell-rem',
          rightClass: 'diff-cell-empty',
          rightContent: renderMissingCell(),
          rowClass: 'diff-row-removed',
        }));
      } else {
        rows.push(renderDiffRow({
          leftNumber: leftNumber++,
          rightNumber: rightNumber++,
          leftText: line,
          rightText: line,
        }));
      }
    }
  }

  return renderDiffCompare(rows, false);
}

function buildDiffLines(text, options = {}) {
  let normalized = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (options.trimText) {
    normalized = normalized.trim();
  }

  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }

  if (!normalized) {
    return [];
  }

  const lines = normalized.split('\n');
  if (options.ignoreNewline && normalized.endsWith('\n')) {
    lines.pop();
  }
  return lines;
}

function sameLines(leftLines, rightLines) {
  if (leftLines.length !== rightLines.length) {
    return false;
  }
  return leftLines.every((line, index) => line === rightLines[index]);
}

function renderDiffCompare(rows, isSame) {
  const status = isSame
    ? '<div class="diff-status">文本完全一致</div>'
    : '';
  return `<div class="diff-compare">${status}<div class="diff-head"><div class="diff-head-cell">原文</div><div class="diff-head-cell">新文</div></div><div class="diff-body">${rows.join('')}</div></div>`;
}

function renderDiffRow({
  leftNumber,
  rightNumber,
  leftText,
  rightText,
  leftClass = '',
  rightClass = '',
  leftContent,
  rightContent,
  rowClass = '',
}) {
  const leftHtml = leftContent ?? renderPlainLine(leftText);
  const rightHtml = rightContent ?? renderPlainLine(rightText);
  return `<div class="diff-row ${rowClass}">${renderDiffCell(leftNumber, leftHtml, `diff-cell diff-cell-left ${leftClass}`)}${renderDiffCell(rightNumber, rightHtml, `diff-cell diff-cell-right ${rightClass}`)}</div>`;
}

function renderDiffCell(number, content, className) {
  return `<div class="${className.trim()}"><span class="diff-cell-num">${number}</span><span class="diff-cell-content">${content}</span></div>`;
}

function renderLineFragments(side, leftText, rightText) {
  if (side === 'left' && leftText === '') {
    return '<span class="diff-empty">空行</span>';
  }
  if (side === 'right' && rightText === '') {
    return '<span class="diff-empty">空行</span>';
  }

  const parts = diffChars(leftText, rightText);
  let html = '';

  for (const part of parts) {
    if (!part.value) {
      continue;
    }
    const value = preserveVisibleWhitespace(escHtml(part.value));
    if (side === 'left' && part.removed) {
      html += `<span class="diff-inline-fragment diff-inline-rem">${value}</span>`;
    } else if (side === 'right' && part.added) {
      html += `<span class="diff-inline-fragment diff-inline-add">${value}</span>`;
    } else if (!part.added && !part.removed) {
      html += `<span class="diff-inline-fragment">${value}</span>`;
    }
  }

  return html || renderPlainLine(side === 'left' ? leftText : rightText);
}

function renderPlainLine(text) {
  if (text === '') {
    return '<span class="diff-empty">空行</span>';
  }
  return preserveVisibleWhitespace(escHtml(text));
}

function renderMissingCell() {
  return '<span class="diff-missing">—</span>';
}

function preserveVisibleWhitespace(text) {
  return text.replace(/ /g, '&nbsp;').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== SVG 优化 (基础版) =====

// ===== User-Agent 解析 (基础) =====
export function parseUserAgent(ua) {
  const u = ua || navigator.userAgent;
  const result = { raw: u };
  // Browser
  const browsers = [
    {re: /Edg\/([\d.]+)/, name: 'Edge', key: 'edge'},
    {re: /Chrome\/([\d.]+)/, name: 'Chrome', key: 'chrome'},
    {re: /Firefox\/([\d.]+)/, name: 'Firefox', key: 'firefox'},
    {re: /Safari\/([\d.]+)/, name: 'Safari', key: 'safari'},
    {re: /OPR\/([\d.]+)/, name: 'Opera', key: 'opera'},
  ];
  for (const b of browsers) {
    const m = u.match(b.re);
    if (m) { result.browser = b.name; result.browserVersion = m[1]; break; }
  }
  // OS
  if (/Windows NT 10/.test(u)) result.os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(u)) result.os = 'Windows 8.1';
  else if (/Windows NT 6\.2/.test(u)) result.os = 'Windows 8';
  else if (/Windows NT 6\.1/.test(u)) result.os = 'Windows 7';
  else if (/Mac OS X ([\d_]+)/.test(u)) result.os = `macOS ${u.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, '.')}`;
  else if (/Android ([\d.]+)/.test(u)) result.os = `Android ${u.match(/Android ([\d.]+)/)[1]}`;
  else if (/iPhone|iPad/.test(u)) result.os = 'iOS';
  else if (/Linux/.test(u)) result.os = 'Linux';
  else result.os = '未知';
  // Device
  if (/Mobile/.test(u)) result.device = '手机';
  else if (/Tablet|iPad/.test(u)) result.device = '平板';
  else result.device = '桌面';
  // Engine
  if (/WebKit/.test(u)) result.engine = 'WebKit';
  else if (/Gecko/.test(u)) result.engine = 'Gecko';
  else result.engine = '未知';
  return result;
}

// ===== 代码格式化 (基础) =====
export async function formatCode(code, language) {
  try {
    switch(language) {
      case 'json': return JSON.stringify(JSON.parse(code), null, 2);
      case 'html':
        return (await prettierFormat(code, {
          parser: 'html',
          plugins: [prettierHtml],
          tabWidth: 2,
          useTabs: false,
          htmlWhitespaceSensitivity: 'css',
        })).trim();
      case 'css':
        return (await prettierFormat(code, {
          parser: 'css',
          plugins: [prettierPostcss],
          tabWidth: 2,
          useTabs: false,
        })).trim();
      default: return '暂不支持的代码语言';
    }
  } catch(e) { return `格式化错误: ${e.message}`; }
}

// ===== 代码压缩 =====
export function minifyCode(code, language) {
  try {
    switch(language) {
      case 'json': return JSON.stringify(JSON.parse(code));
      case 'html': return code.replace(/<!--[\s\S]*?-->/g,'').replace(/>\s+</g,'><').replace(/\s+/g,' ').trim();
      case 'css': return code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{}:;,])\s*/g,'$1').replace(/;\}/g,'}').trim();
      case 'js': return code.replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();
      default: return '暂不支持的语言';
    }
  } catch(e) { return `压缩错误: ${e.message}`; }
}

// ===== QR Code =====
export async function generateQrCode(text, opts = {}) {
  try {
    const options = { width: opts.width || 256, margin: opts.margin || 2, color: { dark: opts.dark || '#000000', light: opts.light || '#ffffff' } };
    const url = await QRCode.toDataURL(text, options);
    return url;
  } catch(e) { return { error: `二维码生成失败: ${e.message}` }; }
}

// ===== Base64 URL Safe =====
export function base64UrlEncode(s) {
  try {
    const bytes = str2ab(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch(e) { return '错误：无法编码 — ' + e.message; }
}

export function base64UrlDecode(s) {
  try {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return ab2str(bytes);
  } catch(e) { return '错误：Base64 URL 安全格式无效 — ' + e.message; }
}

// ===== 颜色转换 =====
export function colorConvert(input, fromFormat, toFormat) {
  try {
    const c = colord(input);
    if (!c.isValid()) return '错误：无效的颜色值';
    switch (toFormat) {
      case 'hex': return c.toHex();
      case 'rgb': {
        const rgb = c.toRgb();
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      }
      case 'hsl': {
        const hsl = c.toHsl();
        return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
      }
      case 'cmyk': {
        const { r, g, b } = c.toRgb();
        const k = Math.min(1 - r / 255, 1 - g / 255, 1 - b / 255);
        if (k === 1) return 'cmyk(0%, 0%, 0%, 100%)';
        const cc = Math.round((1 - r / 255 - k) / (1 - k) * 100);
        const mc = Math.round((1 - g / 255 - k) / (1 - k) * 100);
        const yc = Math.round((1 - b / 255 - k) / (1 - k) * 100);
        return `cmyk(${cc}%, ${mc}%, ${yc}%, ${Math.round(k * 100)}%)`;
      }
      default: return c.toHex();
    }
  } catch(e) { return `错误：颜色转换失败 - ${e.message}`; }
}

// ===== SVG 优化 =====
export function svgOptimize(svg) {
  try {
    if (!svg || !svg.trim()) return { error: '请输入 SVG 内容' };
    // Remove XML comments
    let optimized = svg.replace(/<!--[\s\S]*?-->/g, '');
    // Remove unnecessary whitespace
    optimized = optimized.replace(/>\s+</g, '><');
    // Collapse multiple spaces
    optimized = optimized.replace(/\s{2,}/g, ' ');
    // Remove empty attributes
    optimized = optimized.replace(/\s+\w+=""/g, '');
    // Trim
    optimized = optimized.trim();
    const savings = svg.length - optimized.length;
    const percent = svg.length > 0 ? ((savings / svg.length) * 100).toFixed(1) : 0;
    return { optimized, savings, percent };
  } catch(e) { return { error: `SVG 优化失败: ${e.message}` }; }
}

// ===== Base64 / Hex 互转 =====
function hexToBytesStrict(hex) {
  const clean = String(hex).replace(/\s/g, '');
  if (!clean || clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error('invalid hex');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function binaryToBytesStrict(bin) {
  const clean = String(bin).replace(/\s+/g, '');
  if (!clean || clean.length % 8 !== 0 || /[^01]/.test(clean)) {
    throw new Error('invalid binary');
  }
  const bytes = new Uint8Array(clean.length / 8);
  for (let i = 0; i < clean.length; i += 8) {
    bytes[i / 8] = parseInt(clean.slice(i, i + 8), 2);
  }
  return bytes;
}

function bytesToBinary(bytes) {
  return Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' ');
}

export function base64ToHex(b64) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  } catch(e) { return '错误：Base64 无效'; }
}

export function hexToBase64(hex) {
  try {
    const bytes = hexToBytesStrict(hex);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch(e) { return '错误：Hex 无效'; }
}

// Convert Base64 to binary string (8 bits per byte)
export function base64ToBin(b64) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytesToBinary(bytes);
  } catch(e) { return '错误：Base64 无效'; }
}

// Convert Hex to binary string
export function hexToBin(hex) {
  try {
    return bytesToBinary(hexToBytesStrict(hex));
  } catch(e) { return '错误：Hex 无效'; }
}

// Convert binary string (8 bits per byte) to Base64
export function binToBase64(bin) {
  try {
    const bytes = binaryToBytesStrict(bin);
    let raw = '';
    for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
    return btoa(raw);
  } catch (e) {
    return '错误：二进制无效';
  }
}

// Convert binary string (8 bits per byte) to Hex
export function binToHex(bin) {
  try {
    const bytes = binaryToBytesStrict(bin);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  } catch (e) {
    return '错误：二进制无效';
  }
}
