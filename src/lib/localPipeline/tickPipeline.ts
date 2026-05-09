import { useSourceStore } from '~/hooks/useStore'

import runAudioUploadStage from './runAudioUploadStage'
import runExtractionStage from './runExtractionStage'
import runHashingStage from './runHashingStage'
import runVideoUploadStage from './runVideoUploadStage'

export default function tickPipeline() {
  const state = useSourceStore.getState()

  if (state.hashQueue.length > 0 && !state.active.hashing) {
    const id = state.hashQueue[0]
    void runHashingStage(id, tickPipeline)
  }

  if (state.extractQueue.length > 0 && !state.active.extracting) {
    const id = state.extractQueue[0]
    void runExtractionStage(id, tickPipeline)
  }

  if (state.audioUploadQueue.length > 0 && !state.active.audioUploading) {
    const id = state.audioUploadQueue[0]
    void runAudioUploadStage(id, tickPipeline)
  }

  if (
    state.videoUploadQueue.length > 0 &&
    state.audioUploadQueue.length === 0 &&
    !state.active.audioUploading &&
    !state.active.videoUploading
  ) {
    const id = state.videoUploadQueue[0]
    void runVideoUploadStage(id, tickPipeline)
  }
}
