'use server'

import { deleteLectureChunks } from '~/db/chroma'
import { deleteSourceById, getSourceById } from '~/db/queries/sources'

import deleteSourceAudio from './deleteSourceAudio'
import { cancelMuxUpload, deleteSourceVideo } from './deleteVideo'

export async function deleteSource(sourceId: string) {
  const [source] = await getSourceById(sourceId)
  if (!source) throw new Error(`Source not found: ${sourceId}`)

  const cleanupResults = await Promise.allSettled([
    deleteLectureChunks(sourceId),
    source.audioKey ? deleteSourceAudio(sourceId, source.audioKey) : Promise.resolve(),
  ])

  for (const result of cleanupResults) {
    if (result.status === 'rejected') {
      console.error('Non-blocking source cleanup failed: ', { sourceId, reason: result.reason })
    }
  }

  if (source.muxAssetId) {
    await deleteSourceVideo(sourceId, source.muxAssetId)
  } else {
    await cancelMuxUpload(sourceId, source.muxUploadId)
  }

  await deleteSourceById(sourceId)
}
