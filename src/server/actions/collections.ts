'use server'

import {
  createCollection as createCollectionQuery,
  listCollectionsWithSources as listCollectionsWithSourcesQuery,
  updateCollectionNameById as updateCollectionNameByIdQuery,
} from '~/db/queries/collections'

export async function createCollection(name: string) {
  return createCollectionQuery(name)
}

export async function listCollectionsWithSources() {
  return listCollectionsWithSourcesQuery()
}

export async function updateCollectionNameById(id: string, name: string) {
  return updateCollectionNameByIdQuery(id, name)
}
