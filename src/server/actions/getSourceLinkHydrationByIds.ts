'use server'

import type { HydratedSourceLink } from '~/lib/types/citations'

import { z } from 'zod'
import { getSourceLinkHydrationByIds as getSourceLinkHydrationRows } from '~/db/queries/sources'

const uuidSchema = z.uuid()

export async function getSourceLinkHydrationByIds(
  sourceIds: string[]
): Promise<HydratedSourceLink[]> {
  const uniqueIds = [...new Set(sourceIds)]
  if (uniqueIds.length === 0) return []

  // Drop non-uuid ids before querying — inArray on a uuid column throws a
  // Postgres cast error on a single malformed value, which would reject every
  // source link in the message. Invalid ids fall through to the "Source
  // deleted" fallback below.
  const validIds = uniqueIds.filter((id) => uuidSchema.safeParse(id).success)
  const rows = validIds.length > 0 ? await getSourceLinkHydrationRows(validIds) : []
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
