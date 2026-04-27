'use server'

import { asc, eq } from 'drizzle-orm'
import db from '~/db'
import { collections, sources, transcriptSegments } from '~/db/schema'
import { MAX_FILES_PER_UPLOAD } from '~/lib/constants'
import { CONTENT_HASH_TYPE } from '~/lib/constants'

type TranscriptSegmentInput = {
  index: number
  startSeconds: number
  endSeconds: number
  text: string
}

function isUniqueViolation(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  if ('code' in error && error.code === '23505') {
    return true
  }

  if ('cause' in error) {
    return isUniqueViolation(error.cause)
  }

  return false
}

export async function listCollections() {
  return db.select().from(collections).orderBy(asc(collections.createdAt))
}

export async function createCollection(name: string) {
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    throw new Error('Collection name is required')
  }

  const [collection] = await db.insert(collections).values({ name: trimmedName }).returning()
  return collection
}

export async function createPendingSources(collectionId: string, names: string[]) {
  if (names.length === 0) return []
  if (names.length > MAX_FILES_PER_UPLOAD)
    throw new Error('You can upload up to 13 sources at once')

  const createdSources = await db
    .insert(sources)
    .values(names.map((name) => ({ collectionId, name, status: 'pending_upload' as const })))
    .returning()
  return createdSources
}

export async function setSourceHash(id: string, hash: string, fileSize: number) {
  try {
    await db
      .update(sources)
      .set({ contentHash: hash, contentHashType: CONTENT_HASH_TYPE, fileSize })
      .where(eq(sources.id, id))

    return { duplicate: false }
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error
    }

    await db.delete(sources).where(eq(sources.id, id))

    return { duplicate: true }
  }
}

export async function markSourceAudioUploaded(id: string, url: string) {
  await db.update(sources).set({ status: 'transcribing', audioUrl: url }).where(eq(sources.id, id))
}

export async function markSourceFailed(id: string, error: string) {
  await db.update(sources).set({ status: 'failed', error }).where(eq(sources.id, id))
}

export async function markSourceReady(id: string) {
  await db.update(sources).set({ status: 'ready' }).where(eq(sources.id, id))
}

export async function saveFalRequestId(sourceId: string, requestId: string) {
  await db.update(sources).set({ falRequestId: requestId }).where(eq(sources.id, sourceId))
}

export async function getSourceIndexMetadata(sourceId: string) {
  const [metadata] = await db
    .select({
      sourceId: sources.id,
      sourceName: sources.name,
      collectionId: collections.id,
      collectionName: collections.name,
    })
    .from(sources)
    .innerJoin(collections, eq(sources.collectionId, collections.id))
    .where(eq(sources.id, sourceId))

  if (!metadata) {
    throw new Error(`Could not find source metadata for ${sourceId}`)
  }

  return metadata
}

export async function saveSourceTranscript(
  sourceId: string,
  transcriptText: string,
  segments: TranscriptSegmentInput[]
) {
  await db.delete(transcriptSegments).where(eq(transcriptSegments.sourceId, sourceId))

  if (segments.length > 0) {
    await db.insert(transcriptSegments).values(
      segments.map((segment) => ({
        sourceId,
        index: segment.index,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
      }))
    )
  }

  await db
    .update(sources)
    .set({ status: 'indexing', transcriptText, error: null })
    .where(eq(sources.id, sourceId))
}
