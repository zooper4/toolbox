import { formatCode, minifyCode } from '../utils/code-tools-core.js'

const handlers = {
  format: ({ code, language }) => formatCode(code, language),
  minify: ({ code, language }) => minifyCode(code, language),
}

self.addEventListener('message', async (event) => {
  const { id, action, payload } = event.data || {}
  const handler = handlers[action]
  if (!handler) {
    self.postMessage({ id, error: `未知代码任务: ${action}` })
    return
  }
  try {
    const result = await handler(payload || {})
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) })
  }
})