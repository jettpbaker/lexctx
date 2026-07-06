import type { FileRouter } from '~/app/api/uploadthing/core'

import { genUploader } from 'uploadthing/client'
import { useSourceStore } from '~/hooks/useStore'
import { getQueryClient } from '~/lib/query_client'
import { COLLECTIONS_WITH_SOURCES_KEY } from '~/lib/query_keys'
import { markSourceFailed } from '~/server/actions/sources'

import { isAbortError, registerStageAbort, unregisterStageAbort } from './stageCancellationRegistry'

const { uploadFiles } = genUploader<FileRouter>()

export default async function runAudioUploadStage(id: string, onDone: () => void) {
  const updateAudioUploadProgress = useSourceStore.getState().updateAudioUploadProgress
  const markAudioUploadStarted = useSourceStore.getState().markAudioUploadStarted
  const markAudioUploadCompleted = useSourceStore.getState().markAudioUploadCompleted
  const markAudioPipelineFailed = useSourceStore.getState().markAudioPipelineFailed
  const abortController = new AbortController()
  const abortableStage = { abort: () => abortController.abort() }

  try {
    markAudioUploadStarted(id)
    registerStageAbort(id, abortableStage)

    const audio = useSourceStore.getState().files[id]?.audio
    if (!audio) {
      throw new Error(`Could not retrieve audio blob for id: ${id}`)
    }

    if (audio.size > 256 * 1024 * 1024) {
      throw new Error(`Extracted audio is too large: ${Math.round(audio.size / 1024 / 1024)}MB`)
    }

    await uploadFiles('audioUploader', {
      files: [audio],
      input: { sourceId: id },
      signal: abortController.signal,
      onUploadProgress: ({ progress }) => updateAudioUploadProgress(id, progress),
    })

    await getQueryClient().invalidateQueries({ queryKey: [COLLECTIONS_WITH_SOURCES_KEY] })

    markAudioUploadCompleted(id)
  } catch (error) {
    if (isAbortError(error)) return

    console.error(error)
    const errorMessage = error instanceof Error ? error.message : 'Audio upload failed'
    markAudioPipelineFailed(id, errorMessage)
    await markSourceFailed(id, errorMessage)
  } finally {
    unregisterStageAbort(id, abortableStage)
    onDone()
  }
}
