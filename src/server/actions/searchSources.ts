'use server'

import type {
  LectureChunkSearchMetadata,
  LectureChunkSearchResult,
  SourceSearchFilters,
} from '~/lib/types/search'

import { hybridSearch } from '~/db/chroma'
import { getSourceIndexMetadataByIds } from '~/db/queries/sources'
import { citationId } from '~/lib/chat/citationLinks'

export async function searchSources(
  query: string,
  filters?: SourceSearchFilters
): Promise<LectureChunkSearchResult[]> {
  const results = await hybridSearch(query, filters)
  const resultMetadata = results.map((result) => result.metadata as LectureChunkSearchMetadata)
  const sourceMetadata = await getSourceIndexMetadataByIds([
    ...new Set(resultMetadata.map((metadata) => metadata.sourceId).filter(Boolean)),
  ])
  const metadataBySourceId = new Map(sourceMetadata.map((metadata) => [metadata.sourceId, metadata]))

  const typedResults = results.map((result, index) => {
    const metadata = result.metadata as LectureChunkSearchMetadata

    return {
      id: result.id,
      document: result.document ?? '',
      score: result.score ?? 0,
      citationId: citationId(metadata.sourceId, metadata.chunkIndex),
      citationLabel: `S${index + 1}`,
      metadata: {
        ...metadata,
        ...metadataBySourceId.get(metadata.sourceId),
      },
    }
  })

  return typedResults
}
