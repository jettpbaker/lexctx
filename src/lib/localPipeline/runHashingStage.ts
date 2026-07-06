import { markSourceFailed, setSourceHash } from '~/server/actions/sources'
import { useSourceStore } from '~/hooks/useStore'

import hashVideo from './media/hashVideo'
import { isAbortError, registerStageAbort, unregisterStageAbort } from './stageCancellationRegistry'

export default async function runHashingStage(id: string, onDone: () => void) {
  const markHashingStarted = useSourceStore.getState().markHashingStarted
  const markHashingCompleted = useSourceStore.getState().markHashingCompleted
  const markAudioPipelineFailed = useSourceStore.getState().markAudioPipelineFailed
  const updateHashingProgress = useSourceStore.getState().updateHashingProgress
  const abortController = new AbortController()
  const abortableStage = { abort: () => abortController.abort() }

  try {
    const video = useSourceStore.getState().files[id]?.video
    if (!video) {
      throw new Error(`Could not retrieve video file for id: ${id}`)
    }

    markHashingStarted(id)
    registerStageAbort(id, abortableStage)

    function onProgress(progress: number) {
      updateHashingProgress(id, progress)
    }

    const hash = await hashVideo(video, onProgress, abortController.signal)
    const { duplicate } = await setSourceHash(id, hash, video.size)
    if (duplicate) throw new Error('Source already exists')

    markHashingCompleted(id)
  } catch (error) {
    if (isAbortError(error)) return

    const errorMessage =
      error instanceof Error ? error.message : `Hashing failed with error ${error} for file: ${id}`
    markAudioPipelineFailed(id, errorMessage)
    await markSourceFailed(id, errorMessage)
  } finally {
    unregisterStageAbort(id, abortableStage)
    onDone()
  }
  return
}
