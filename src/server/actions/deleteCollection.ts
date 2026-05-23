'use server'

import { deleteCollectionById } from '~/db/queries/collections'
import { listSourcesForCollection } from '~/db/queries/sources'

import { deleteSource } from './deleteSource'

export async function deleteCollection(collectionId: string) {
  const sources = await listSourcesForCollection(collectionId)

  await Promise.all(sources.map((source) => deleteSource(source.id)))

  await deleteCollectionById(collectionId)
}
