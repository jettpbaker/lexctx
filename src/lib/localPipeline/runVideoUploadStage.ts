import * as UpChunk from '@mux/upchunk'
import { useSourceStore } from '~/hooks/useStore'
import {
  registerVideoUpload,
  unregisterVideoUpload,
} from '~/lib/localPipeline/videoUploadRegistry'

type CreateMuxUploadResponse = {
  uploadId: string
  url: string
}

export default async function runVideoUploadStage(id: string, onDone: () => void) {
  const markVideoUploadStarted = useSourceStore.getState().markVideoUploadStarted
  const markVideoUploadCompleted = useSourceStore.getState().markVideoUploadCompleted
  const markVideoPipelineFailed = useSourceStore.getState().markVideoPipelineFailed
  const updateVideoUploadProgress = useSourceStore.getState().updateVideoUploadProgress

  try {
    markVideoUploadStarted(id)

    const video = useSourceStore.getState().files[id]?.video
    if (!video) {
      throw new Error(`Could not retrieve video file for id: ${id}`)
    }

    const res = await fetch('/api/mux/upload', {
      method: 'POST',
      body: JSON.stringify({ sourceId: id }),
    })

    if (!res.ok) {
      throw new Error(`Failed to create Mux upload URL: ${res.status}`)
    }

    const { url } = (await res.json()) as CreateMuxUploadResponse

    await new Promise<void>((resolve, reject) => {
      let lastLoggedProgress = 0

      const upload = UpChunk.createUpload({
        endpoint: url,
        file: video,
        chunkSize: 5120, // Uploads the file in ~5MB chunks.
      })
      registerVideoUpload(id, upload)

      upload.on('progress', (progress) => {
        updateVideoUploadProgress(id, progress.detail)

        if (progress.detail - lastLoggedProgress >= 1 || progress.detail === 100) {
          lastLoggedProgress = progress.detail
          console.log('[video upload progress]', { sourceId: id, progress: progress.detail })
        }
      })

      upload.on('error', (error) => {
        unregisterVideoUpload(id)
        console.error('[video upload error]', { sourceId: id, error: error.detail })
        reject(error.detail instanceof Error ? error.detail : new Error(String(error.detail)))
      })

      upload.on('success', () => {
        unregisterVideoUpload(id)
        console.log('[video upload success]', { sourceId: id })
        resolve()
      })
    })

    markVideoUploadCompleted(id)

    const monitorRes = await fetch('/api/mux/monitor', {
      method: 'POST',
      body: JSON.stringify({ sourceId: id }),
    })

    if (!monitorRes.ok) {
      throw new Error(`Failed to start Mux processing monitor: ${monitorRes.status}`)
    }
  } catch (error) {
    markVideoPipelineFailed(id, error instanceof Error ? error.message : 'Video upload failed')
  } finally {
    onDone()
  }
  return
}
