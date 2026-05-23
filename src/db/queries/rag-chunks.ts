import { and, asc, eq, gte, lte, or } from 'drizzle-orm'
import db from '~/db'
import { collections, ragChunks, sources } from '~/db/schema'
import { RagChunk } from '~/lib/rag/chunkTranscriptSegments'

export async function upsertRagChunks(sourceId: string, chunks: RagChunk[]) {
  await db.delete(ragChunks).where(eq(ragChunks.sourceId, sourceId))
  await db.insert(ragChunks).values(
    chunks.map((chunk) => ({
      sourceId,
      chunkIndex: chunk.index,
      text: chunk.text,
      startSeconds: chunk.startSeconds,
      endSeconds: chunk.endSeconds,
      segmentStartIndex: chunk.segmentStartIndex,
      segmentEndIndex: chunk.segmentEndIndex,
    }))
  )
}

export async function getNearbyRagChunks(
  sourceId: string,
  chunkIndex: number,
  before: number,
  after: number
) {
  const lowerBound = Math.max(0, chunkIndex - before)
  const upperBound = chunkIndex + after

  return await db
    .select({
      document: ragChunks.text,
      chunkIndex: ragChunks.chunkIndex,
      sourceId: sources.id,
      sourceName: sources.name,
      collectionId: collections.id,
      collectionName: collections.name,
      startSeconds: ragChunks.startSeconds,
      endSeconds: ragChunks.endSeconds,
      segmentStartIndex: ragChunks.segmentStartIndex,
      segmentEndIndex: ragChunks.segmentEndIndex,
    })
    .from(ragChunks)
    .where(
      and(
        eq(ragChunks.sourceId, sourceId),
        gte(ragChunks.chunkIndex, lowerBound),
        lte(ragChunks.chunkIndex, upperBound)
      )
    )
    .innerJoin(sources, eq(ragChunks.sourceId, sources.id))
    .innerJoin(collections, eq(sources.collectionId, collections.id))
    .orderBy(asc(ragChunks.chunkIndex))
}

export type CitationLookup = {
  sourceId: string
  chunkIndex: number
}

export async function getCitationHydrationRowsByLookups(lookups: CitationLookup[]) {
  if (lookups.length === 0) return []

  const whereClause = or(
    ...lookups.map((lookup) =>
      and(eq(ragChunks.sourceId, lookup.sourceId), eq(ragChunks.chunkIndex, lookup.chunkIndex))
    )
  )

  if (!whereClause) return []

  return await db
    .select({
      sourceId: sources.id,
      sourceName: sources.name,
      collectionId: collections.id,
      collectionName: collections.name,
      chunkIndex: ragChunks.chunkIndex,
      startSeconds: ragChunks.startSeconds,
      endSeconds: ragChunks.endSeconds,
      muxPlaybackId: sources.muxPlaybackId,
      muxBlurDataUrl: sources.muxBlurDataUrl,
      muxBlurAspectRatio: sources.muxBlurAspectRatio,
      videoStatus: sources.videoStatus,
    })
    .from(ragChunks)
    .innerJoin(sources, eq(ragChunks.sourceId, sources.id))
    .innerJoin(collections, eq(sources.collectionId, collections.id))
    .where(whereClause)
}
