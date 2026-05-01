'use client'

import type { SourceRowSource } from '~/components/sources/source_row'
import type { LocalSourceType } from '~/lib/types'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import {
  CollectionGroup,
  type CollectionGroupCollection,
} from '~/components/sources/collection_group'
import { useSourceStore } from '~/hooks/useStore'
import tickPipeline from '~/lib/localPipeline/tickPipeline'
import { queryClient } from '~/lib/query_client'
import { COLLECTIONS_WITH_SOURCES_KEY } from '~/lib/query_keys'
import {
  dbStatusToSourceUiStatus,
  isInFlight,
  localAudioStatusToSourceUiStatus,
  shouldUseLocalSourceStatus,
} from '~/lib/source_status'
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

  const query = useQuery({
    queryKey: [COLLECTIONS_WITH_SOURCES_KEY],
    queryFn: listCollectionsWithSources,
    initialData: initialCollections,
    refetchInterval: (query) => {
      const dbCollections = query.state.data ?? initialCollections
      const mergedCollections = mergeCollections(dbCollections, localSources)
      return shouldPollCollections(mergedCollections) ? 2000 : false
    },
  })

  const data = query.data
  const collections = mergeCollections(data, localSources)

  function removeSourceFromQuery(
    collections: CollectionsWithSources | undefined,
    sourceId: string
  ): CollectionsWithSources {
    return (collections ?? []).map((collection) => ({
      ...collection,
      sources: collection.sources.filter((source) => source.id !== sourceId),
    }))
  }

  const addSourcesMutation = useMutation({
    mutationFn: ({
      collection,
      files,
    }: {
      collection: CollectionGroupCollection
      files: File[]
    }) => {
      const names = files.map((file) => file.name)
      return createPendingSources(collection.id, names)
    },
    onSuccess: (data, variables) => {
      data.forEach((source, index) => {
        const file = variables.files[index]
        const localSource: LocalSourceType = {
          id: source.id,
          collectionId: variables.collection.id,
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

      queryClient.invalidateQueries({
        queryKey: [COLLECTIONS_WITH_SOURCES_KEY],
      })
    },
  })

  const onDeleteSourcesMutation = useMutation({
    mutationFn: (source: SourceRowSource) => {
      return deleteSource(source.id)
    },
    onMutate: async (source) => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      await queryClient.cancelQueries({ queryKey })

      const previousCollections = queryClient.getQueryData<CollectionsWithSources>(queryKey)

      removeSource(source.id)

      queryClient.setQueryData<CollectionsWithSources>(queryKey, (current) =>
        removeSourceFromQuery(current, source.id)
      )

      return { previousCollections }
    },
    onError: (error, source, context) => {
      // TODO: Toast
      console.error(`Error deleting source: ${source.id}`, error)

      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]

      queryClient.setQueryData<CollectionsWithSources>(queryKey, context?.previousCollections)
    },
    onSettled: () => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      queryClient.invalidateQueries({ queryKey })
    },
  })

  function onAddSources(collection: CollectionGroupCollection, files: File[]) {
    addSourcesMutation.mutate({ collection, files })
  }

  async function onDeleteSource(source: SourceRowSource) {
    onDeleteSourcesMutation.mutate(source)
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
