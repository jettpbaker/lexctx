export default async function hashVideo(
  video: File,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'))
      return
    }

    const worker = new Worker(new URL('./hashVideo.worker.ts', import.meta.url), { type: 'module' })

    function abort() {
      worker.terminate()
      reject(new DOMException('aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', abort, { once: true })

    worker.onmessage = (e) => {
      const data = e.data

      if (data.type === 'progress') {
        onProgress(data.progress)
        return
      }

      if (data.type === 'done') {
        worker.terminate()
        signal?.removeEventListener('abort', abort)
        resolve(data.hash)
      }

      if (data.type === 'error') {
        worker.terminate()
        signal?.removeEventListener('abort', abort)
        reject(new Error(data.message))
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      signal?.removeEventListener('abort', abort)
      reject(new Error(err.message))
    }

    worker.postMessage({ type: 'hash', video })
  })
}
