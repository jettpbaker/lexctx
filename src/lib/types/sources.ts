import type { collections, sources } from '~/db/schema'

export type SourceRow = typeof sources.$inferSelect
export type CollectionRow = typeof collections.$inferSelect

export type SourceStatus = SourceRow['status']
export type VideoStatus = SourceRow['videoStatus']

export type SourceListItem = {
  id: string
  name: string
  collectionId: string
  collectionName: string
  status: SourceStatus
  summary: string | null
  createdAt: Date
  updatedAt: Date
}

export type SourceIndexMetadata = {
  sourceId: string
  sourceName: string
  collectionId: string
  collectionName: string
}
