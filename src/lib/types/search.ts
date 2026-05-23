export type SourceSearchFilters = {
  sourceIds?: string[]
  collectionIds?: string[]
}

export type LectureChunkSearchMetadata = {
  sourceId: string
  sourceName: string
  collectionId: string
  collectionName: string
  chunkIndex: number
  startSeconds: number
  endSeconds: number
}

export type LectureChunkSearchResult = {
  id: string
  citationId: string
  document: string
  metadata: LectureChunkSearchMetadata
  score: number
}
