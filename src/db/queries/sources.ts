import { asc, desc, eq, inArray } from 'drizzle-orm'
import db from '~/db'
import { isUniqueViolation } from '~/db/queries/utils'
import { collections, sources, transcriptSegments } from '~/db/schema'
import { MAX_FILES_PER_UPLOAD } from '~/lib/constants'
import { CONTENT_HASH_TYPE } from '~/lib/constants'

type TranscriptSegmentInput = {
  index: number
  startSeconds: number
  endSeconds: number
  text: string
}

const sourceListSelect = {
  id: sources.id,
  name: sources.name,
  collectionId: sources.collectionId,
  collectionName: collections.name,
  status: sources.status,
  summary: sources.summary,
  createdAt: sources.createdAt,
  updatedAt: sources.updatedAt,
}

export async function getSourceById(id: string) {
  return db.select().from(sources).where(eq(sources.id, id)).limit(1)
}

export async function deleteSourceById(id: string) {
  await db.delete(sources).where(eq(sources.id, id))
}

const sourceCleanupSelect = {
  id: sources.id,
  audioKey: sources.audioKey,
  muxAssetId: sources.muxAssetId,
  muxUploadId: sources.muxUploadId,
}

export async function listSourceCleanupRowsForCollection(collectionId: string) {
  return db
    .select(sourceCleanupSelect)
    .from(sources)
    .where(eq(sources.collectionId, collectionId))
    .orderBy(desc(sources.createdAt), asc(sources.id))
}

export async function listSourcesForCollection(collectionId: string) {
  return db
    .select(sourceListSelect)
    .from(sources)
    .innerJoin(collections, eq(sources.collectionId, collections.id))
    .where(eq(sources.collectionId, collectionId))
    .orderBy(desc(sources.createdAt), asc(sources.id))
}

export async function listAllSources() {
  return db
    .select(sourceListSelect)
    .from(sources)
    .orderBy(desc(sources.createdAt), asc(sources.id))
    .innerJoin(collections, eq(sources.collectionId, collections.id))
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

export async function updateSourceNameById(id: string, name: string) {
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    throw new Error('Source name is required')
  }

  await db
    .update(sources)
    .set({ name: trimmedName })
    .where(eq(sources.id, id))
    .returning({ id: sources.id, name: sources.name })
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

export async function markSourceAudioUploaded(id: string, url: string, key: string) {
  return await db
    .update(sources)
    .set({ status: 'transcribing', audioUrl: url, audioKey: key })
    .where(eq(sources.id, id))
    .returning({ id: sources.id })
}

export async function removeSourceAudioMetadata(id: string) {
  await db.update(sources).set({ audioUrl: null, audioKey: null }).where(eq(sources.id, id))
}

export async function markSourceFailed(id: string, error: string) {
  await db.update(sources).set({ status: 'failed', error }).where(eq(sources.id, id))
}

export async function markSourceReady(id: string) {
  await db.update(sources).set({ status: 'ready' }).where(eq(sources.id, id))
}

export async function saveMuxUploadId(sourceId: string, uploadId: string) {
  await db
    .update(sources)
    .set({ videoStatus: 'processing', muxUploadId: uploadId })
    .where(eq(sources.id, sourceId))
}

export async function saveMuxAssetId(sourceId: string, assetId: string) {
  await db.update(sources).set({ muxAssetId: assetId }).where(eq(sources.id, sourceId))
}

export async function markSourceVideoReady(sourceId: string, assetId: string, playbackId: string) {
  await db
    .update(sources)
    .set({
      videoStatus: 'ready',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
    })
    .where(eq(sources.id, sourceId))
}

export async function saveMuxBlurUpPlaceholder(
  sourceId: string,
  blurDataUrl: string,
  aspectRatio: number
) {
  await db
    .update(sources)
    .set({
      muxBlurDataUrl: blurDataUrl,
      muxBlurAspectRatio: aspectRatio,
    })
    .where(eq(sources.id, sourceId))
}

export async function markSourceVideoFailed(sourceId: string, error: string) {
  await db
    .update(sources)
    .set({
      videoStatus: 'failed',
      error,
    })
    .where(eq(sources.id, sourceId))
}

export async function saveFalRequestId(sourceId: string, requestId: string) {
  await db.update(sources).set({ falRequestId: requestId }).where(eq(sources.id, sourceId))
}

export async function saveSourceSummary(sourceId: string, summary: string) {
  await db.update(sources).set({ summary }).where(eq(sources.id, sourceId))
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

export async function getSourceLinkHydrationByIds(sourceIds: string[]) {
  if (sourceIds.length === 0) return []

  return db
    .select({
      sourceId: sources.id,
      sourceName: sources.name,
      muxPlaybackId: sources.muxPlaybackId,
      muxBlurDataUrl: sources.muxBlurDataUrl,
      muxBlurAspectRatio: sources.muxBlurAspectRatio,
      videoStatus: sources.videoStatus,
    })
    .from(sources)
    .where(inArray(sources.id, sourceIds))
}

export async function getSourceVideoDataByIds(sourceIds: string[]) {
  return await db
    .select({
      sourceId: sources.id,
      muxPlaybackId: sources.muxPlaybackId,
      videoStatus: sources.videoStatus,
    })
    .from(sources)
    .where(inArray(sources.id, sourceIds))
}
