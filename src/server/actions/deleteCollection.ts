'use server'

import { deleteLectureChunksForCollection } from '~/db/chroma'
import { deleteCollectionById } from '~/db/queries/collections'
import { listSourceCleanupRowsForCollection } from '~/db/queries/sources'

import { cleanupSourceFilesAndVideo } from './deleteSource'

export async function deleteCollection(collectionId: string) {
  const sources = await listSourceCleanupRowsForCollection(collectionId)

  const deleteChunksPromise = deleteLectureChunksForCollection(collectionId).catch((error) => {
    console.error('Non-blocking collection cleanup failed: ', {
      collectionId,
      reason: error,
    })
  })

  await Promise.all(sources.map((source) => cleanupSourceFilesAndVideo(source)))
  await deleteChunksPromise

  await deleteCollectionById(collectionId)
}
