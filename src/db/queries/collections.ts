import { asc, desc, eq } from 'drizzle-orm'
import { unstable_noStore as noStore } from 'next/cache'
import db from '~/db'
import { collections, sources } from '~/db/schema'

export async function deleteCollectionById(id: string) {
  await db.delete(collections).where(eq(collections.id, id))
}

export async function listAllCollections() {
  return db.select().from(collections).orderBy(desc(collections.createdAt), asc(collections.id))
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
