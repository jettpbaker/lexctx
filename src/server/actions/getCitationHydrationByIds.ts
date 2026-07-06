'use server'

import type { CitationLookup, HydratedCitation } from '~/lib/types/citations'

import { getCitationHydrationRowsByLookups } from '~/db/queries/rag-chunks'
import { citationId, parseCitationId } from '~/lib/chat/citationLinks'

type CitationLookupWithId = CitationLookup & {
  citationId: string
}

function parseCitationLookup(citationId: string): CitationLookupWithId | null {
  const parsedId = parseCitationId(citationId)
  if (!parsedId) return null

  return {
    citationId,
    sourceId: parsedId.sourceId,
    chunkIndex: parsedId.chunkIndex,
  }
}

function isCitationLookup(lookup: CitationLookupWithId | null): lookup is CitationLookupWithId {
  return lookup !== null
}

export async function getCitationHydrationByIds(
  citationIds: string[]
): Promise<HydratedCitation[]> {
  const lookups = citationIds.map(parseCitationLookup).filter(isCitationLookup)

  if (lookups.length === 0) return []

  const rows = await getCitationHydrationRowsByLookups(lookups)
  const rowsByCitationId = new Map(
    rows.map((row) => [citationId(row.sourceId, row.chunkIndex), row])
  )

  return lookups.map((lookup) => {
    const row = rowsByCitationId.get(lookup.citationId)
    if (row) {
      return {
        ...row,
        citationId: lookup.citationId,
      }
    }

    return {
      citationId: lookup.citationId,
      sourceId: lookup.sourceId,
      sourceName: 'Source deleted',
      collectionId: '',
      collectionName: '',
      chunkIndex: lookup.chunkIndex,
      muxPlaybackId: null,
      muxBlurDataUrl: null,
      muxBlurAspectRatio: null,
      videoStatus: 'deleted' as const,
      startSeconds: 0,
      endSeconds: 0,
    }
  })
}
