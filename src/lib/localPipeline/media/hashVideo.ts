export default async function hashVideo(
  video: File,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./hashVideo.worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e) => {
      const data = e.data

      if (data.type === 'progress') {
        onProgress(data.progress)
        return
      }

      if (data.type === 'done') {
        worker.terminate()
        resolve(data.hash)
      }

      if (data.type === 'error') {
        worker.terminate()
        reject(new Error(data.message))
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(new Error(err.message))
    }

    worker.postMessage({ type: 'hash', video })
  })
}
