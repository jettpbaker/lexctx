'use server'

import type { SearchResultRow } from 'chromadb'

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

export type LectureChunkSearchResult = SearchResultRow & {
  citationId: string
  document: string
  metadata: LectureChunkSearchMetadata
  score: number
}

export async function searchSources(query: string): Promise<LectureChunkSearchResult[]> {
  const results = await hybridSearch(query)

  return results.map((result, index) => {
    return {
      citationId: `S${index + 1}`,
      id: result.id,
      document: result.document ?? '',
      metadata: result.metadata as LectureChunkSearchMetadata,
      score: result.score ?? 0,
    }
  })
}
