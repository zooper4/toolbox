import { watch, onBeforeUnmount } from 'vue'

// sources: array of refs or getter functions
// clearFn: function to run when any source changes
export function useClearOnInput(sources, clearFn, options = {}) {
  if (!Array.isArray(sources)) sources = [sources]
  const stop = watch(sources, () => {
    try {
      clearFn()
    } catch (e) {
      // ignore
    }
  }, { deep: true })

  onBeforeUnmount(() => {
    try { stop() } catch (e) {}
  })

  return stop
}
