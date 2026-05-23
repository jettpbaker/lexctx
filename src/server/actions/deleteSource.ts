'use server'

import { deleteLectureChunks } from '~/db/chroma'
import { deleteSourceById, getSourceById } from '~/db/queries/sources'

import deleteSourceAudio from './deleteSourceAudio'
import { cancelMuxUpload, deleteSourceVideo } from './deleteVideo'

export async function deleteSource(sourceId: string) {
  const [source] = await getSourceById(sourceId)
  if (!source) throw new Error(`Source not found: ${sourceId}`)

  await Promise.all([
    deleteLectureChunks(sourceId),
    source.audioKey ? deleteSourceAudio(sourceId, source.audioKey) : Promise.resolve(),
    source.muxAssetId
      ? deleteSourceVideo(sourceId, source.muxAssetId)
      : cancelMuxUpload(sourceId, source.muxUploadId),
  ])

  await deleteSourceById(sourceId)
}
