'use server'

import { hybridSearch } from '~/db/chroma'

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

export type SourceSearchFilters = {
  sourceIds?: string[]
  collectionIds?: string[]
}

export async function searchSources(
  query: string,
  filters?: SourceSearchFilters
): Promise<LectureChunkSearchResult[]> {
  const results = await hybridSearch(query, filters)

  const typedResults = results.map((result, index) => ({
    id: result.id,
    document: result.document ?? '',
    score: result.score ?? 0,
    citationId: `${result.metadata?.sourceId}:chunk:${result.metadata?.chunkIndex}`,
    citationLabel: `S${index + 1}`,
    metadata: result.metadata as LectureChunkSearchMetadata,
  }))

  return typedResults
}
