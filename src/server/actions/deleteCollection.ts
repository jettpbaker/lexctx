'use server'

import { deleteSource } from './deleteSource'
import { deleteCollectionById } from '~/db/queries/collections'
import { listSourcesForCollection } from '~/db/queries/sources'

export async function deleteCollection(collectionId: string) {
  const sources = await listSourcesForCollection(collectionId)

  await Promise.all(sources.map((source) => deleteSource(source.id)))

  await deleteCollectionById(collectionId)
}
