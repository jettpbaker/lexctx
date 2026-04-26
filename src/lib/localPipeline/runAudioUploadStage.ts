import type { FileRouter } from '~/app/api/uploadthing/core'

import { genUploader } from 'uploadthing/client'
import { useSourceStore } from '~/hooks/useStore'

const { uploadFiles } = genUploader<FileRouter>()

export default async function runAudioUploadStage(id: string, onDone: () => void) {
  const updateUploadProgress = useSourceStore.getState().updateUploadProgress
  const markAudioUploadStarted = useSourceStore.getState().markAudioUploadStarted
  const markAudioUploadCompleted = useSourceStore.getState().markAudioUploadCompleted
  const markAudioPipelineFailed = useSourceStore.getState().markAudioPipelineFailed

  try {
    markAudioUploadStarted(id)

    const audio = useSourceStore.getState().files[id]?.audio
    if (!audio) {
      throw new Error(`Could not retrieve audio blob for id: ${id}`)
    }

    if (audio.size > 256 * 1024 * 1024) {
      throw new Error(`Extracted audio is too large: ${Math.round(audio.size / 1024 / 1024)}MB`)
    }

    await uploadFiles('audioUploader', {
      files: [audio],
      onUploadProgress: ({ progress }) => updateUploadProgress(id, progress),
    })

    markAudioUploadCompleted(id)
  } catch (error) {
    console.error(error)
    markAudioPipelineFailed(id, error instanceof Error ? error.message : 'Audio upload failed')
  } finally {
    onDone()
  }
}
