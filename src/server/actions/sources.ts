'use server'

import {
  createPendingSources as createPendingSourcesQuery,
  markSourceFailed as markSourceFailedQuery,
  markSourceVideoFailed as markSourceVideoFailedQuery,
  setSourceHash as setSourceHashQuery,
  updateSourceNameById as updateSourceNameByIdQuery,
} from '~/db/queries/sources'

export async function createPendingSources(collectionId: string, names: string[]) {
  return createPendingSourcesQuery(collectionId, names)
}

export async function updateSourceNameById(id: string, name: string) {
  return updateSourceNameByIdQuery(id, name)
}

export async function setSourceHash(id: string, hash: string, fileSize: number) {
  return setSourceHashQuery(id, hash, fileSize)
}

export async function markSourceFailed(id: string, error: string) {
  return markSourceFailedQuery(id, error)
}

export async function markSourceVideoFailed(id: string, error: string) {
  return markSourceVideoFailedQuery(id, error)
}
