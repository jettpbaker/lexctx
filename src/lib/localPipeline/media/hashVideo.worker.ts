import { createXXHash64 } from 'hash-wasm'

type HashWorkerMessage = { type: 'hash'; video: File }

type HashWorkerResponse =
  | { type: 'progress'; progress: number }
  | { type: 'done'; hash: string }
  | { type: 'error'; message: string }

self.onmessage = async (e: MessageEvent<HashWorkerMessage>) => {
  try {
    const data = e.data

    if (data.type !== 'hash') {
      return
    }

    const { video } = data
    const hasher = await createXXHash64()
    hasher.init()

    const reader = video.stream().getReader()
    let processed = 0
    let lastProgress = -1

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      hasher.update(value)
      processed += value.length

      const progress = Math.round((processed / video.size) * 100)

      if (progress !== lastProgress) {
        lastProgress = progress
        const response: HashWorkerResponse = {
          type: 'progress',
          progress,
        }
        self.postMessage(response)
      }
    }

    const hash = hasher.digest()

    const response: HashWorkerResponse = {
      type: 'done',
      hash,
    }
    self.postMessage(response)
  } catch (error) {
    const response: HashWorkerResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Hashing failed',
    }

    self.postMessage(response)
  }
}

export {}
