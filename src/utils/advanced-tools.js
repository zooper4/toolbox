import { diffArrays, diffChars } from 'diff'
import { colord } from 'colord'
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
})

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  format: true,
  suppressEmptyNode: true,
})

export function dataFormatConvert(input, fromFormat, toFormat) {
  try {
    let data
    switch (fromFormat) {
      case 'json':
        data = JSON.parse(input)
        break
      case 'xml':
        data = xmlToJson(input)
        break
      case 'csv':
        data = csvToJson(input)
        break
      case 'yaml':
        data = parseYaml(input)
        break
      default:
        return '不支持的源格式'
    }

    switch (toFormat) {
      case 'json': return JSON.stringify(data, null, 2)
      case 'xml': return jsonToXml(data)
      case 'csv': return jsonToCsv(data)
      case 'yaml': return stringifyYaml(data).trimEnd()
      default: return '不支持的目标格式'
    }
  } catch (error) {
    return `转换错误: ${error.message}`
  }
}

function xmlToJson(xmlText) {
  const validation = XMLValidator.validate(xmlText)
  if (validation !== true) {
    throw new Error(`XML 无效: ${validation.err.msg}`)
  }
  const parsed = xmlParser.parse(xmlText)
  return unwrapXmlRoot(parsed)
}

function jsonToXml(data) {
  return xmlBuilder.build(wrapXmlRoot(data))
}

function csvToJson(input) {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
}

function jsonToCsv(data) {
  const rows = Array.isArray(data) ? data : (isPlainObject(data) ? [data] : null)
  if (!rows) return '错误：对象数组或单个对象才能转 CSV'
  if (rows.length === 0) return '(空)'

  const headers = Array.from(rows.reduce((set, row) => {
    if (isPlainObject(row)) Object.keys(row).forEach((key) => set.add(key))
    return set
  }, new Set()))

  if (headers.length === 0) return '(空)'

  return [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvField(row?.[header] ?? '')).join(',')),
  ].join('\n')
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"'
        index++
        continue
      }
      if (char === '"') {
        quoted = false
        continue
      }
      current += char
      continue
    }
    if (char === ',') {
      values.push(current)
      current = ''
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    current += char
  }

  values.push(current)
  return values
}

function escapeCsvField(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function wrapXmlRoot(data) {
  if (isPlainObject(data) && Object.keys(data).length === 1) return data
  return { root: data }
}

function unwrapXmlRoot(parsed) {
  if (!isPlainObject(parsed)) return parsed
  const keys = Object.keys(parsed).filter((key) => key !== '?xml')
  if (keys.length === 1) return parsed[keys[0]]
  return parsed
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function textDiff(text1, text2, options = {}) {
  const leftLines = buildDiffLines(text1, options)
  const rightLines = buildDiffLines(text2, options)
  const isSame = sameLines(leftLines, rightLines)
  const rows = []

  if (isSame && leftLines.length === 0 && rightLines.length === 0) {
    return '<div class="diff-compare"><div class="diff-status">文本完全一致</div></div>'
  }

  if (isSame) {
    for (let index = 0; index < leftLines.length; index++) {
      rows.push(renderDiffRow({
        leftNumber: index + 1,
        rightNumber: index + 1,
        leftText: leftLines[index],
        rightText: rightLines[index],
      }))
    }
    return renderDiffCompare(rows, true)
  }

  const parts = diffArrays(leftLines, rightLines)
  let leftNumber = 1
  let rightNumber = 1

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]
    if (part.removed && parts[index + 1]?.added) {
      const removedLines = part.value
      const addedLines = parts[index + 1].value
      const pairCount = Math.max(removedLines.length, addedLines.length)
      for (let lineIndex = 0; lineIndex < pairCount; lineIndex++) {
        const removedLine = removedLines[lineIndex]
        const addedLine = addedLines[lineIndex]
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
          }))
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
          }))
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
          }))
        }
      }
      index++
      continue
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
        }))
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
        }))
      } else {
        rows.push(renderDiffRow({
          leftNumber: leftNumber++,
          rightNumber: rightNumber++,
          leftText: line,
          rightText: line,
        }))
      }
    }
  }

  return renderDiffCompare(rows, false)
}

function buildDiffLines(text, options = {}) {
  let normalized = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (options.trimText) normalized = normalized.trim()
  if (options.ignoreCase) normalized = normalized.toLowerCase()
  if (!normalized) return []
  const lines = normalized.split('\n')
  if (options.ignoreNewline && normalized.endsWith('\n')) lines.pop()
  return lines
}

function sameLines(leftLines, rightLines) {
  if (leftLines.length !== rightLines.length) return false
  return leftLines.every((line, index) => line === rightLines[index])
}

function renderDiffCompare(rows, isSame) {
  const status = isSame ? '<div class="diff-status">文本完全一致</div>' : ''
  return `<div class="diff-compare">${status}<div class="diff-head"><div class="diff-head-cell">原文</div><div class="diff-head-cell">新文</div></div><div class="diff-body">${rows.join('')}</div></div>`
}

function renderDiffRow({ leftNumber, rightNumber, leftText, rightText, leftClass = '', rightClass = '', leftContent, rightContent, rowClass = '' }) {
  const leftHtml = leftContent ?? renderPlainLine(leftText)
  const rightHtml = rightContent ?? renderPlainLine(rightText)
  return `<div class="diff-row ${rowClass}">${renderDiffCell(leftNumber, leftHtml, `diff-cell diff-cell-left ${leftClass}`)}${renderDiffCell(rightNumber, rightHtml, `diff-cell diff-cell-right ${rightClass}`)}</div>`
}

function renderDiffCell(number, content, className) {
  return `<div class="${className.trim()}"><span class="diff-cell-num">${number}</span><span class="diff-cell-content">${content}</span></div>`
}

function renderLineFragments(side, leftText, rightText) {
  if (side === 'left' && leftText === '') return '<span class="diff-empty">空行</span>'
  if (side === 'right' && rightText === '') return '<span class="diff-empty">空行</span>'

  const parts = diffChars(leftText, rightText)
  let html = ''

  for (const part of parts) {
    if (!part.value) continue
    const value = preserveVisibleWhitespace(escHtml(part.value))
    if (side === 'left' && part.removed) html += `<span class="diff-inline-fragment diff-inline-rem">${value}</span>`
    else if (side === 'right' && part.added) html += `<span class="diff-inline-fragment diff-inline-add">${value}</span>`
    else if (!part.added && !part.removed) html += `<span class="diff-inline-fragment">${value}</span>`
  }

  return html || renderPlainLine(side === 'left' ? leftText : rightText)
}

function renderPlainLine(text) {
  if (text === '') return '<span class="diff-empty">空行</span>'
  return preserveVisibleWhitespace(escHtml(text))
}

function renderMissingCell() { return '<span class="diff-missing">—</span>' }
function preserveVisibleWhitespace(text) { return text.replace(/ /g, '&nbsp;').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export function parseUserAgent(ua) {
  const u = ua || globalThis.navigator?.userAgent || ''
  const result = { raw: u }
  const browsers = [
    { re: /Edg\/([\d.]+)/, name: 'Edge' },
    { re: /Chrome\/([\d.]+)/, name: 'Chrome' },
    { re: /Firefox\/([\d.]+)/, name: 'Firefox' },
    { re: /Safari\/([\d.]+)/, name: 'Safari' },
    { re: /OPR\/([\d.]+)/, name: 'Opera' },
  ]
  for (const browser of browsers) {
    const match = u.match(browser.re)
    if (match) {
      result.browser = browser.name
      result.browserVersion = match[1]
      break
    }
  }
  if (/Windows NT 10/.test(u)) result.os = 'Windows 10/11'
  else if (/Windows NT 6\.3/.test(u)) result.os = 'Windows 8.1'
  else if (/Windows NT 6\.2/.test(u)) result.os = 'Windows 8'
  else if (/Windows NT 6\.1/.test(u)) result.os = 'Windows 7'
  else if (/Mac OS X ([\d_]+)/.test(u)) result.os = `macOS ${u.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, '.')}`
  else if (/Android ([\d.]+)/.test(u)) result.os = `Android ${u.match(/Android ([\d.]+)/)[1]}`
  else if (/iPhone|iPad/.test(u)) result.os = 'iOS'
  else if (/Linux/.test(u)) result.os = 'Linux'
  else result.os = '未知'

  if (/Mobile/.test(u)) result.device = '手机'
  else if (/Tablet|iPad/.test(u)) result.device = '平板'
  else result.device = '桌面'

  if (/WebKit/.test(u)) result.engine = 'WebKit'
  else if (/Gecko/.test(u)) result.engine = 'Gecko'
  else result.engine = '未知'
  return result
}

export function colorConvert(input, fromFormat, toFormat) {
  try {
    const c = colord(input)
    if (!c.isValid()) return '错误：无效的颜色值'
    switch (toFormat) {
      case 'hex': return c.toHex()
      case 'rgb': {
        const rgb = c.toRgb()
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
      }
      case 'hsl': {
        const hsl = c.toHsl()
        return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`
      }
      case 'cmyk': {
        const { r, g, b } = c.toRgb()
        const k = Math.min(1 - r / 255, 1 - g / 255, 1 - b / 255)
        if (k === 1) return 'cmyk(0%, 0%, 0%, 100%)'
        const cc = Math.round((1 - r / 255 - k) / (1 - k) * 100)
        const mc = Math.round((1 - g / 255 - k) / (1 - k) * 100)
        const yc = Math.round((1 - b / 255 - k) / (1 - k) * 100)
        return `cmyk(${cc}%, ${mc}%, ${yc}%, ${Math.round(k * 100)}%)`
      }
      default: return c.toHex()
    }
  } catch (error) {
    return `错误：颜色转换失败 - ${error.message}`
  }
}

export function svgOptimize(svg) {
  try {
    if (!svg || !svg.trim()) return { error: '请输入 SVG 内容' }
    let optimized = svg.replace(/<!--[\s\S]*?-->/g, '')
    optimized = optimized.replace(/>\s+</g, '><')
    optimized = optimized.replace(/\s{2,}/g, ' ')
    optimized = optimized.replace(/\s+\w+=""/g, '')
    optimized = optimized.trim()
    const savings = svg.length - optimized.length
    const percent = svg.length > 0 ? ((savings / svg.length) * 100).toFixed(1) : 0
    return { optimized, savings, percent }
  } catch (error) {
    return { error: `SVG 优化失败: ${error.message}` }
  }
}