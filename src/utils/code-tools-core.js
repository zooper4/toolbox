import { format as prettierFormat } from 'prettier/standalone'
import * as prettierHtml from 'prettier/plugins/html'
import * as prettierPostcss from 'prettier/plugins/postcss'

export async function formatCode(code, language) {
  try {
    switch (language) {
      case 'json': return JSON.stringify(JSON.parse(code), null, 2)
      case 'html':
        return (await prettierFormat(code, {
          parser: 'html',
          plugins: [prettierHtml],
          tabWidth: 2,
          useTabs: false,
          htmlWhitespaceSensitivity: 'css',
        })).trim()
      case 'css':
        return (await prettierFormat(code, {
          parser: 'css',
          plugins: [prettierPostcss],
          tabWidth: 2,
          useTabs: false,
        })).trim()
      default: return '暂不支持的代码语言'
    }
  } catch (error) {
    return `格式化错误: ${error.message}`
  }
}

export async function minifyCode(code, language) {
  try {
    switch (language) {
      case 'json': return JSON.stringify(JSON.parse(code))
      case 'html': return code.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
      case 'css': return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').replace(/;\}/g, '}').trim()
      case 'js': return code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()
      default: return '暂不支持的语言'
    }
  } catch (error) {
    return `压缩错误: ${error.message}`
  }
}