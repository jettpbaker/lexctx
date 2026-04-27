import { useSourceStore } from '~/hooks/useStore'

import extractAudioFile from './media/extractAudioFile'

export default async function runExtractionStage(id: string, onDone: () => void) {
  const updateExtractionProgress = useSourceStore.getState().updateExtractionProgress
  const markExtractionStarted = useSourceStore.getState().markExtractionStarted
  const markExtractionCompleted = useSourceStore.getState().markExtractionCompleted
  const markAudioPipelineFailed = useSourceStore.getState().markAudioPipelineFailed

  try {
    const video = useSourceStore.getState().files[id]?.video
    if (!video) {
      throw new Error(`Could not retrieve video file for id: ${id}`)
    }

    markExtractionStarted(id)

    function onProgress(progress: number) {
      updateExtractionProgress(id, progress)
    }

    const file = await extractAudioFile(video, onProgress)

    markExtractionCompleted(id, file)
  } catch (error) {
    console.error(error)
    markAudioPipelineFailed(id, error instanceof Error ? error.message : 'Audio extraction failed')
  } finally {
    onDone()
  }
}
