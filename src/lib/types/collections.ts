import type { CollectionRow, SourceStatus, VideoStatus } from '~/lib/types/sources'

export type CollectionSourceRow = {
  id: string
  collectionId: string
  name: string
  fileSize: number | null
  status: SourceStatus
  videoStatus: VideoStatus
  error: string | null
  createdAt: Date
}

export type CollectionWithSources = CollectionRow & {
  sources: CollectionSourceRow[]
}

export type CollectionsWithSources = CollectionWithSources[]
