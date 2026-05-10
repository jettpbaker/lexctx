'use server'

import { getCitationHydrationRowsByLookups, type CitationLookup } from '~/server/actions/sources'

type CitationLookupWithId = CitationLookup & {
  citationId: string
}

function parseCitationLookup(citationId: string): CitationLookupWithId | null {
  const match = citationId.match(/^(.+):chunk:(\d+)$/)
  if (!match) return null

  return {
    citationId,
    sourceId: match[1],
    chunkIndex: Number(match[2]),
  }
}

function isCitationLookup(lookup: CitationLookupWithId | null): lookup is CitationLookupWithId {
  return lookup !== null
}

export type HydratedCitation = {
  citationId: string
  sourceId: string
  sourceName: string
  collectionId: string
  collectionName: string
  chunkIndex: number
  muxPlaybackId: string | null
  muxBlurDataUrl: string | null
  muxBlurAspectRatio: number | null
  videoStatus: 'pending_upload' | 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted'
  startSeconds: number
  endSeconds: number
}

export async function getCitationHydrationByIds(
  citationIds: string[]
): Promise<HydratedCitation[]> {
  const lookups = citationIds.map(parseCitationLookup).filter(isCitationLookup)

  if (lookups.length === 0) return []

  const rows = await getCitationHydrationRowsByLookups(lookups)
  const rowsByCitationId = new Map(
    rows.map((row) => [`${row.sourceId}:chunk:${row.chunkIndex}`, row])
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
