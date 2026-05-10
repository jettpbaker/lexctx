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

export async function searchSources(query: string): Promise<LectureChunkSearchResult[]> {
  const results = await hybridSearch(query)

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
