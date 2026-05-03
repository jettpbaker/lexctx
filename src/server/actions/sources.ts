'use server'

import { asc, and, desc, eq } from 'drizzle-orm'
import { unstable_noStore as noStore } from 'next/cache'
import db from '~/db'
import { chats, collections, GenerationStatusType, sources, transcriptSegments } from '~/db/schema'
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

export async function getSourceById(id: string) {
  return db.select().from(sources).where(eq(sources.id, id)).limit(1)
}

export async function deleteSourceById(id: string) {
  await db.delete(sources).where(eq(sources.id, id))
}

export async function deleteCollectionById(id: string) {
  await db.delete(collections).where(eq(collections.id, id))
}

export async function listSourcesForCollection(collectionId: string) {
  return db.select().from(sources).where(eq(sources.collectionId, collectionId))
}

export async function listCollectionsWithSources() {
  noStore()

  // TODO: Do this with a join for 1 query
  const [allCollections, allSources] = await Promise.all([
    db.select().from(collections).orderBy(desc(collections.createdAt), asc(collections.id)),
    db.select().from(sources).orderBy(desc(sources.createdAt), asc(sources.id)),
  ])

  const sourcesByCollection = new Map<string, typeof allSources>()

  for (const source of allSources) {
    const collectionSources = sourcesByCollection.get(source.collectionId)
    if (collectionSources) {
      collectionSources.push(source)
    } else {
      sourcesByCollection.set(source.collectionId, [source])
    }
  }

  return allCollections.map((collection) => ({
    ...collection,
    sources: sourcesByCollection.get(collection.id) ?? [],
  }))
}

export async function createCollection(name: string) {
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    throw new Error('Collection name is required')
  }

  const [collection] = await db.insert(collections).values({ name: trimmedName }).returning()
  return collection
}

export async function updateCollectionNameById(id: string, name: string) {
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    throw new Error('Collection name is required')
  }

  await db
    .update(collections)
    .set({ name: trimmedName })
    .where(eq(collections.id, id))
    .returning({ id: collections.id, name: collections.name })
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
  await db
    .update(sources)
    .set({ status: 'transcribing', audioUrl: url, audioKey: key })
    .where(eq(sources.id, id))
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

export async function upsertChat(
  chatId: string,
  messagesGzipBase64: string,
  messageCount: number,
  generationStatus: GenerationStatusType
) {
  await db
    .insert(chats)
    .values({ id: chatId, messagesGzipBase64, messageCount, generationStatus })
    .onConflictDoUpdate({
      target: chats.id,
      set: { messagesGzipBase64, messageCount, generationStatus },
    })
}

export async function getChatById(chatId: string) {
  return await db.select().from(chats).where(eq(chats.id, chatId)).limit(1)
}

export async function claimIdleChat(chatId: string) {
  return await db
    .update(chats)
    .set({ generationStatus: 'generating' })
    .where(and(eq(chats.id, chatId), eq(chats.generationStatus, 'idle')))
    .returning({ id: chats.id, generationStatus: chats.generationStatus })
}
export async function claimSubmittedChat(chatId: string) {
  return await db
    .update(chats)
    .set({ generationStatus: 'generating' })
    .where(and(eq(chats.id, chatId), eq(chats.generationStatus, 'submitted')))
    .returning({ id: chats.id, generationStatus: chats.generationStatus })
}
