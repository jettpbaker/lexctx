import { useSourceStore } from '~/hooks/useStore'
import { setSourceHash } from '~/server/actions/sources'

import hashVideo from './media/hashVideo'

export default async function runHashingStage(id: string, onDone: () => void) {
  const markHashingStarted = useSourceStore.getState().markHashingStarted
  const markHashingCompleted = useSourceStore.getState().markHashingCompleted
  const markAudioPipelineFailed = useSourceStore.getState().markAudioPipelineFailed
  const updateHashingProgress = useSourceStore.getState().updateHashingProgress

  try {
    const video = useSourceStore.getState().files[id]?.video
    if (!video) {
      throw new Error(`Could not retrieve video file for id: ${id}`)
    }

    markHashingStarted(id)

    function onProgress(progress: number) {
      updateHashingProgress(id, progress)
    }

    const hash = await hashVideo(video, onProgress)
    const { duplicate } = await setSourceHash(id, hash, video.size)
    if (duplicate) throw new Error('Source already exists')

    markHashingCompleted(id)
  } catch (error) {
    markAudioPipelineFailed(
      id,
      error instanceof Error ? error.message : `Hashing failed with error ${error} for file: ${id}`
    )
  } finally {
    onDone()
  }
  return
}
