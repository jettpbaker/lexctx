import { asc, desc, eq } from 'drizzle-orm'
import { unstable_noStore as noStore } from 'next/cache'
import db from '~/db'
import { collections, sources } from '~/db/schema'
import type { CollectionSourceRow, CollectionsWithSources } from '~/lib/types/collections'

export async function deleteCollectionById(id: string) {
  await db.delete(collections).where(eq(collections.id, id))
}

export async function listAllCollections() {
  return db.select().from(collections).orderBy(desc(collections.createdAt), asc(collections.id))
}

export async function listCollectionsWithSources() {
  noStore()

  const rows = await db
    .select({
      collection: collections,
      source: {
        id: sources.id,
        collectionId: sources.collectionId,
        name: sources.name,
        fileSize: sources.fileSize,
        status: sources.status,
        videoStatus: sources.videoStatus,
        error: sources.error,
        createdAt: sources.createdAt,
      },
    })
    .from(collections)
    .leftJoin(sources, eq(sources.collectionId, collections.id))
    .orderBy(
      desc(collections.createdAt),
      asc(collections.id),
      desc(sources.createdAt),
      asc(sources.id)
    )

  const collectionsById = new Map<string, CollectionsWithSources[number]>()

  for (const row of rows) {
    let collection = collectionsById.get(row.collection.id)
    if (!collection) {
      collection = { ...row.collection, sources: [] }
      collectionsById.set(row.collection.id, collection)
    }

    if (row.source) {
      collection.sources.push(row.source as CollectionSourceRow)
    }
  }

  return Array.from(collectionsById.values())
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
}
