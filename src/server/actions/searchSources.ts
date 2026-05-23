'use server'

import type {
  LectureChunkSearchMetadata,
  LectureChunkSearchResult,
  SourceSearchFilters,
} from '~/lib/types/search'

import { hybridSearch } from '~/db/chroma'

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
