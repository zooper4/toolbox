import QRCode from 'qrcode'

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt',
  'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco',
  'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat',
  'cupidatat', 'non', 'proident', 'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollis', 'anim', 'id', 'est', 'laborum',
]

export function generateLoremIpsum(paragraphs, sentencesPerPara, wordsPerSentence) {
  const result = []
  for (let paragraphIndex = 0; paragraphIndex < paragraphs; paragraphIndex++) {
    const sentences = []
    for (let sentenceIndex = 0; sentenceIndex < sentencesPerPara; sentenceIndex++) {
      const words = []
      const count = wordsPerSentence + Math.floor(Math.random() * 5) - 2
      for (let wordIndex = 0; wordIndex < count; wordIndex++) {
        const word = LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]
        words.push(wordIndex === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
      }
      sentences.push(words.join(' ') + (sentenceIndex < sentencesPerPara - 1 || count > 0 ? '.' : ''))
    }
    result.push(sentences.join(' '))
  }
  return result.join('\n\n')
}

export async function generateQrCode(text, opts = {}) {
  try {
    const options = {
      width: opts.width || 256,
      margin: opts.margin || 2,
      color: {
        dark: opts.dark || '#000000',
        light: opts.light || '#ffffff',
      },
    }
    return await QRCode.toDataURL(text, options)
  } catch (error) {
    return { error: `二维码生成失败: ${error.message}` }
  }
}