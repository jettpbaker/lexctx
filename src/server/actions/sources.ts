'use server'

import {
  createPendingSources as createPendingSourcesQuery,
  updateSourceNameById as updateSourceNameByIdQuery,
} from '~/db/queries/sources'

export async function createPendingSources(collectionId: string, names: string[]) {
  return createPendingSourcesQuery(collectionId, names)
}

export async function updateSourceNameById(id: string, name: string) {
  return updateSourceNameByIdQuery(id, name)
}
