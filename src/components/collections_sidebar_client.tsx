'use client'

import type { SourceRowSource } from '~/components/sources/source_row'
import type { LocalSourceType } from '~/lib/types'

import { useEffect } from 'react'
import useSWR from 'swr'
import { useShallow } from 'zustand/react/shallow'
import {
  CollectionGroup,
  type CollectionGroupCollection,
} from '~/components/sources/collection_group'
import { useSourceStore } from '~/hooks/useStore'
import tickPipeline from '~/lib/localPipeline/tickPipeline'
import {
  dbStatusToSourceUiStatus,
  isInFlight,
  localAudioStatusToSourceUiStatus,
  shouldUseLocalSourceStatus,
} from '~/lib/source_status'
import { COLLECTIONS_WITH_SOURCES_KEY } from '~/lib/swr_keys'
import { deleteSource } from '~/server/actions/deleteSource'
import { createPendingSources, listCollectionsWithSources } from '~/server/actions/sources'

type CollectionsWithSources = Awaited<ReturnType<typeof listCollectionsWithSources>>
type DbCollection = CollectionsWithSources[number]
type DbSource = DbCollection['sources'][number]

type CollectionsSidebarClientProps = {
  initialCollections: CollectionsWithSources
}

export default function CollectionsSidebarClient({
  initialCollections,
}: CollectionsSidebarClientProps) {
  const localSources = useSourceStore(useShallow((state) => state.sources))
  const addSource = useSourceStore((state) => state.addSource)
  const removeSource = useSourceStore((state) => state.removeSource)

  const { data = initialCollections, mutate } = useSWR<CollectionsWithSources>(
    COLLECTIONS_WITH_SOURCES_KEY,
    listCollectionsWithSources,
    {
      fallbackData: initialCollections,
      refreshInterval: (collections) =>
        shouldPollCollections(mergeCollections(collections ?? [], localSources)) ? 2000 : 0,
    }
  )

  const collections = mergeCollections(data, localSources)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    console.debug(
      '[collections-sidebar] DB source statuses',
      data.flatMap((collection) =>
        collection.sources.map((source) => ({
          collection: collection.name,
          source: source.name,
          status: source.status,
        }))
      )
    )
  }, [data])

  function removeSourceFromSWRCollections(
    collections: CollectionsWithSources | undefined,
    sourceId: string
  ): CollectionsWithSources {
    return (collections ?? []).map((collection) => ({
      ...collection,
      sources: collection.sources.filter((source) => source.id !== sourceId),
    }))
  }

  async function onAddSources(collection: CollectionGroupCollection, files: File[]) {
    const names = files.map((file) => file.name)

    const sources = await createPendingSources(collection.id, names)

    sources.forEach((source, index) => {
      const file = files[index]
      const localSource: LocalSourceType = {
        id: source.id,
        collectionId: source.collectionId,
        name: source.name,
        audioStatus: { stage: 'hashing-queued' },
        videoStatus: { stage: 'pending' },
        createdAt: source.createdAt,
      }

      addSource(localSource, file)
    })

    requestAnimationFrame(() => {
      tickPipeline()
    })

    void mutate()
  }

  async function onDeleteSource(source: SourceRowSource) {
    removeSource(source.id)

    try {
      await mutate(
        async (current) => {
          await deleteSource(source.id)
          return removeSourceFromSWRCollections(current, source.id)
        },
        {
          optimisticData: (current) => removeSourceFromSWRCollections(current, source.id),
          rollbackOnError: true,
          revalidate: true,
        }
      )
    } catch (error) {
      // TODO: Toast
      console.error('Error deleting source: ', error)
    }
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto'>
      <div className='flex flex-col gap-2 px-2 pb-2 [&>*:first-child]:mt-2'>
        {collections.map((collection) => (
          <CollectionGroup
            key={collection.id}
            collection={collection}
            onAddSources={onAddSources}
            onDeleteSource={onDeleteSource}
          />
        ))}
      </div>
    </div>
  )
}

function mergeCollections(
  collections: CollectionsWithSources,
  localSources: Record<string, LocalSourceType>
): CollectionGroupCollection[] {
  const merged = collections.map((collection) => {
    const sources = collection.sources.map((source) => {
      return sourceRowFromDbSource(source, localSources[source.id])
    })

    for (const source of Object.values(localSources)) {
      if (source.collectionId !== collection.id) continue
      if (collection.sources.some((dbSource) => dbSource.id === source.id)) continue
      sources.push(sourceRowFromLocalSource(source))
    }

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt,
      sources,
    }
  })

  return merged
}

function sourceRowFromDbSource(source: DbSource, localSource?: LocalSourceType): SourceRowSource {
  const dbStatus = dbStatusToSourceUiStatus(source)
  const localStatus =
    localSource && shouldUseLocalSourceStatus(localSource)
      ? localAudioStatusToSourceUiStatus(localSource)
      : null

  return {
    id: source.id,
    name: source.name,
    fileSize: source.fileSize,
    createdAt: source.createdAt,
    status: localStatus ?? dbStatus,
  }
}

function sourceRowFromLocalSource(source: LocalSourceType): SourceRowSource {
  return {
    id: source.id,
    name: source.name,
    fileSize: null,
    createdAt: source.createdAt,
    status: localAudioStatusToSourceUiStatus(source),
  }
}

function shouldPollCollections(collections: CollectionGroupCollection[]): boolean {
  return collections.some((collection) =>
    collection.sources.some((source) => isInFlight(source.status))
  )
}
