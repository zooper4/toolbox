export function timeInterval(date1, date2, unit) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const ms = Math.abs(d2 - d1)
  const units = {
    ms,
    seconds: ms / 1000,
    minutes: ms / 60000,
    hours: ms / 3600000,
    days: ms / 86400000,
    weeks: ms / 604800000,
    months: ms / 2629746000,
    years: ms / 31556952000,
  }
  if (unit) return units[unit]?.toFixed(2) || '未知单位'
  return units
}

export function caseConvert(text, targetCase) {
  if (!text) return ''
  const words = text.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$|\d)|\d+/g) || [text]
  switch (targetCase) {
    case 'camel': return words.map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join('')
    case 'pascal': return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
    case 'snake': return words.map((w) => w.toLowerCase()).join('_')
    case 'kebab': return words.map((w) => w.toLowerCase()).join('-')
    case 'upper': return words.map((w) => w.toUpperCase()).join('_')
    case 'lower': return words.map((w) => w.toLowerCase()).join(' ')
    case 'title': return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    default: return text
  }
}