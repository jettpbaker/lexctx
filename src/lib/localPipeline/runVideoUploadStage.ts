import * as UpChunk from '@mux/upchunk'
import { useSourceStore } from '~/hooks/useStore'
import { registerVideoUpload, unregisterVideoUpload } from '~/lib/localPipeline/videoUploadRegistry'
import { markSourceVideoFailed } from '~/server/actions/sources'

import { isAbortError, registerStageAbort, unregisterStageAbort } from './stageCancellationRegistry'

type CreateMuxUploadResponse = {
  uploadId: string
  url: string
}

export default async function runVideoUploadStage(id: string, onDone: () => void) {
  const markVideoUploadStarted = useSourceStore.getState().markVideoUploadStarted
  const markVideoUploadCompleted = useSourceStore.getState().markVideoUploadCompleted
  const markVideoPipelineFailed = useSourceStore.getState().markVideoPipelineFailed
  const updateVideoUploadProgress = useSourceStore.getState().updateVideoUploadProgress
  const abortController = new AbortController()
  const abortableStage = { abort: () => abortController.abort() }

  try {
    markVideoUploadStarted(id)
    registerStageAbort(id, abortableStage)

    const video = useSourceStore.getState().files[id]?.video
    if (!video) {
      throw new Error(`Could not retrieve video file for id: ${id}`)
    }

    const res = await fetch('/api/mux/upload', {
      method: 'POST',
      body: JSON.stringify({ sourceId: id }),
      signal: abortController.signal,
    })

    if (!res.ok) {
      throw new Error(`Failed to create Mux upload URL: ${res.status}`)
    }

    const { url } = (await res.json()) as CreateMuxUploadResponse

    await new Promise<void>((resolve, reject) => {
      const upload = UpChunk.createUpload({
        endpoint: url,
        file: video,
        chunkSize: 5120, // Uploads the file in ~5MB chunks.
      })
      registerVideoUpload(id, {
        abort: () => {
          upload.abort()
          abortController.abort()
          reject(new DOMException('aborted', 'AbortError'))
        },
      })

      upload.on('progress', (progress) => {
        updateVideoUploadProgress(id, progress.detail)
      })

      upload.on('error', (error) => {
        unregisterVideoUpload(id)
        console.error('[video upload error]', { sourceId: id, error: error.detail })
        reject(error.detail instanceof Error ? error.detail : new Error(String(error.detail)))
      })

      upload.on('success', () => {
        unregisterVideoUpload(id)
        resolve()
      })
    })

    markVideoUploadCompleted(id)
  } catch (error) {
    unregisterVideoUpload(id)
    if (isAbortError(error)) return
    if (!useSourceStore.getState().sources[id]) return

    const errorMessage = error instanceof Error ? error.message : 'Video upload failed'
    markVideoPipelineFailed(id, errorMessage)
    await markSourceVideoFailed(id, errorMessage)
  } finally {
    unregisterStageAbort(id, abortableStage)
    onDone()
  }
  return
}
