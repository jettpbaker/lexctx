'use server'

import { deleteLectureChunks } from '~/db/chroma'
import { deleteSourceById, getSourceById } from '~/db/queries/sources'

import deleteSourceAudio from './deleteSourceAudio'
import { cancelMuxUpload, deleteSourceVideo } from './deleteVideo'

type SourceCleanupRow = {
  id: string
  audioKey: string | null
  muxAssetId: string | null
  muxUploadId: string | null
}

export async function deleteSource(sourceId: string) {
  const [source] = await getSourceById(sourceId)
  if (!source) throw new Error(`Source not found: ${sourceId}`)

  await cleanupSourceAssets(source)
  await deleteSourceById(sourceId)
}

export async function cleanupSourceAssets(source: SourceCleanupRow) {
  await cleanupSourceAssetsWithOptions(source, { deleteChunks: true })
}

export async function cleanupSourceFilesAndVideo(source: SourceCleanupRow) {
  await cleanupSourceAssetsWithOptions(source, { deleteChunks: false })
}

async function cleanupSourceAssetsWithOptions(
  source: SourceCleanupRow,
  { deleteChunks }: { deleteChunks: boolean }
) {
  const cleanupTasks = [
    source.audioKey ? deleteSourceAudio(source.id, source.audioKey) : Promise.resolve(),
  ]

  if (deleteChunks) {
    cleanupTasks.push(deleteLectureChunks(source.id))
  }

  const cleanupResults = await Promise.allSettled(cleanupTasks)

  for (const result of cleanupResults) {
    if (result.status === 'rejected') {
      console.error('Non-blocking source cleanup failed: ', {
        sourceId: source.id,
        reason: result.reason,
      })
    }
  }

  if (source.muxAssetId) {
    await deleteSourceVideo(source.id, source.muxAssetId)
  } else {
    await cancelMuxUpload(source.id, source.muxUploadId)
  }
}
