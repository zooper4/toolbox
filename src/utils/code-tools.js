let workerInstance = null
let requestId = 0
const pending = new Map()

function resetWorker(error) {
  for (const { reject } of pending.values()) reject(error)
  pending.clear()
  workerInstance?.terminate()
  workerInstance = null
}

function getWorker() {
  if (workerInstance) return workerInstance
  workerInstance = new Worker(new URL('../workers/code-tools.worker.js', import.meta.url), { type: 'module' })
  workerInstance.addEventListener('message', (event) => {
    const { id, result, error } = event.data || {}
    const task = pending.get(id)
    if (!task) return
    pending.delete(id)
    if (error) task.reject(new Error(error))
    else task.resolve(result)
  })
  workerInstance.addEventListener('error', (event) => {
    resetWorker(event.error || new Error('代码工具 Worker 执行失败'))
  })
  return workerInstance
}

async function runFallback(action, payload) {
  const core = await import('./code-tools-core.js')
  if (action === 'format') return core.formatCode(payload.code, payload.language)
  return core.minifyCode(payload.code, payload.language)
}

async function runCodeTask(action, payload) {
  if (typeof Worker === 'undefined') {
    return runFallback(action, payload)
  }
  const worker = getWorker()
  const id = ++requestId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, action, payload })
  })
}

export function formatCode(code, language) {
  return runCodeTask('format', { code, language })
}

export function minifyCode(code, language) {
  return runCodeTask('minify', { code, language })
}