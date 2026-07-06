import { markSourceFailed } from '~/server/actions/sources'
import { useSourceStore } from '~/hooks/useStore'

import extractAudioFile from './media/extractAudioFile'
import { isAbortError, registerStageAbort, unregisterStageAbort } from './stageCancellationRegistry'

export default async function runExtractionStage(id: string, onDone: () => void) {
  const updateExtractionProgress = useSourceStore.getState().updateExtractionProgress
  const markExtractionStarted = useSourceStore.getState().markExtractionStarted
  const markExtractionCompleted = useSourceStore.getState().markExtractionCompleted
  const markAudioPipelineFailed = useSourceStore.getState().markAudioPipelineFailed
  const abortController = new AbortController()
  const abortableStage = { abort: () => abortController.abort() }

  try {
    const video = useSourceStore.getState().files[id]?.video
    if (!video) {
      throw new Error(`Could not retrieve video file for id: ${id}`)
    }

    markExtractionStarted(id)
    registerStageAbort(id, abortableStage)

    function onProgress(progress: number) {
      updateExtractionProgress(id, progress)
    }

    const file = await extractAudioFile(video, onProgress, abortController.signal)

    markExtractionCompleted(id, file)
  } catch (error) {
    if (isAbortError(error)) return

    console.error(error)
    const errorMessage = error instanceof Error ? error.message : 'Audio extraction failed'
    markAudioPipelineFailed(id, errorMessage)
    await markSourceFailed(id, errorMessage)
  } finally {
    unregisterStageAbort(id, abortableStage)
    onDone()
  }
}
