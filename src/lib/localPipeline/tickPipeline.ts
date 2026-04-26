import { useSourceStore } from '~/hooks/useStore'

import runAudioUploadStage from './runAudioUploadStage'
import runExtractionStage from './runExtractionStage'

export default function tickPipeline() {
  const state = useSourceStore.getState()

  if (state.extractQueue.length > 0 && !state.active.extracting) {
    const id = state.extractQueue[0]
    void runExtractionStage(id, tickPipeline)
  }

  if (state.audioUploadQueue.length > 0 && !state.active.audioUploading) {
    const id = state.audioUploadQueue[0]
    void runAudioUploadStage(id, tickPipeline)
  }
}
