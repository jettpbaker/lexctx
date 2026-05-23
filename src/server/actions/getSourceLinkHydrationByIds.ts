'use server'

import type { HydratedSourceLink } from '~/lib/types/citations'

import { getSourceLinkHydrationByIds as getSourceLinkHydrationRows } from '~/db/queries/sources'

export async function getSourceLinkHydrationByIds(
  sourceIds: string[]
): Promise<HydratedSourceLink[]> {
  const uniqueIds = [...new Set(sourceIds)]
  if (uniqueIds.length === 0) return []

  const rows = await getSourceLinkHydrationRows(uniqueIds)
  const rowsById = new Map(rows.map((row) => [row.sourceId, row]))

  return uniqueIds.map((sourceId) => {
    const row = rowsById.get(sourceId)
    if (row) return row

    return {
      sourceId,
      sourceName: 'Source deleted',
      muxPlaybackId: null,
      muxBlurDataUrl: null,
      muxBlurAspectRatio: null,
      videoStatus: 'deleted' as const,
    }
  })
}
