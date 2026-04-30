import { deleteSource } from './deleteSource'
import { deleteCollectionById, listSourcesForCollection } from './sources'

export async function deleteCollection(collectionId: string) {
  const sources = await listSourcesForCollection(collectionId)
  if (!sources) throw new Error(`Sources not found for collection: ${collectionId}`)

  await Promise.all(sources.map((source) => deleteSource(source.id)))

  await deleteCollectionById(collectionId)
}
