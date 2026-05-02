'use client'

import type { SourceRowSource } from '~/components/sources/source_row'
import type { LocalSourceType } from '~/lib/types'

import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  CollectionGroup,
  type CollectionGroupCollection,
} from '~/components/sources/collection_group'
import { Separator } from '~/components/ui/separator'
import { useSourceStore } from '~/hooks/useStore'
import tickPipeline from '~/lib/localPipeline/tickPipeline'
import { COLLECTIONS_WITH_SOURCES_KEY } from '~/lib/query_keys'
import {
  dbStatusToSourceUiStatus,
  isInFlight,
  labelForStatus,
  localAudioStatusToSourceUiStatus,
  shouldUseLocalSourceStatus,
} from '~/lib/source_status'
import { deleteCollection } from '~/server/actions/deleteCollection'
import { deleteSource } from '~/server/actions/deleteSource'
import {
  createPendingSources,
  listCollectionsWithSources,
  updateCollectionNameById,
  updateSourceNameById,
} from '~/server/actions/sources'

import { Button } from './ui/button'

export type CollectionsWithSources = Awaited<ReturnType<typeof listCollectionsWithSources>>
type DbCollection = CollectionsWithSources[number]
type DbSource = DbCollection['sources'][number]

type CollectionsSidebarClientProps = {
  initialCollections: CollectionsWithSources
}

export default function CollectionsSidebarClient({
  initialCollections,
}: CollectionsSidebarClientProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [addingSourcesCollectionId, setAddingSourcesCollectionId] = useState<string | null>(null)

  const localSources = useSourceStore(useShallow((state) => state.sources))
  const addSource = useSourceStore((state) => state.addSource)
  const removeSource = useSourceStore((state) => state.removeSource)
  const renameLocalSource = useSourceStore((state) => state.renameSource)

  const isSearching = searchQuery.trim().length > 0

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

  function filterCollections(
    query: string,
    collections: CollectionGroupCollection[]
  ): CollectionGroupCollection[] {
    const queriedCollections: CollectionGroupCollection[] = []

    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery.length === 0) {
      return collections
    }

    collections.forEach((collection) => {
      if (collection.name.toLowerCase().includes(normalizedQuery)) {
        queriedCollections.push(collection)
        return
      }

      const queriedCollection: CollectionGroupCollection = {
        ...collection,
        sources: [],
      }

      collection.sources.forEach((source) => {
        const statusLabel = labelForStatus(source.status).toLowerCase()
        if (
          source.name.toLowerCase().includes(normalizedQuery) ||
          (source.status.kind !== 'ready' && statusLabel.includes(normalizedQuery))
        )
          queriedCollection.sources.push(source)
      })
      if (queriedCollection.sources.length > 0) queriedCollections.push(queriedCollection)
    })

    return queriedCollections
  }

  const renderedCollections = filterCollections(searchQuery, collections)

  function removeSourceFromQuery(
    collections: CollectionsWithSources | undefined,
    sourceId: string
  ): CollectionsWithSources {
    return (collections ?? []).map((collection) => ({
      ...collection,
      sources: collection.sources.filter((source) => source.id !== sourceId),
    }))
  }

  function removeCollectionFromQuery(
    collections: CollectionsWithSources | undefined,
    collectionId: string
  ): CollectionsWithSources {
    return (collections ?? []).filter((collection) => collection.id !== collectionId)
  }

  function renameSourceInQuery(
    collections: CollectionsWithSources | undefined,
    sourceId: string,
    name: string
  ): CollectionsWithSources {
    return (collections ?? []).map((collection) => ({
      ...collection,
      sources: collection.sources.map((source) =>
        source.id === sourceId ? { ...source, name } : source
      ),
    }))
  }

  function renameCollectionInQuery(
    collections: CollectionsWithSources | undefined,
    collectionId: string,
    name: string
  ): CollectionsWithSources {
    return (collections ?? []).map((collection) =>
      collection.id === collectionId ? { ...collection, name } : collection
    )
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
    onMutate: ({ collection }) => {
      setAddingSourcesCollectionId(collection.id)
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
    onSettled: () => {
      setAddingSourcesCollectionId(null)
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

  const onDeleteCollectionMutation = useMutation({
    mutationFn: (collection: CollectionGroupCollection) => {
      return deleteCollection(collection.id)
    },
    onMutate: async (collection) => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      await queryClient.cancelQueries({ queryKey })

      const previousCollections = queryClient.getQueryData<CollectionsWithSources>(queryKey)

      collection.sources.forEach((source) => {
        removeSource(source.id)
      })

      queryClient.setQueryData<CollectionsWithSources>(queryKey, (current) =>
        removeCollectionFromQuery(current, collection.id)
      )

      return { previousCollections }
    },
    onError: (error, collection, context) => {
      // TODO: Toast
      console.error(`Error deleting collection: ${collection.id}`, error)

      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]

      queryClient.setQueryData<CollectionsWithSources>(queryKey, context?.previousCollections)
    },
    onSettled: () => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const onEditSourceMutation = useMutation({
    mutationFn: ({ source, name }: { source: SourceRowSource; name: string }) => {
      return updateSourceNameById(source.id, name)
    },
    onMutate: async ({ source, name }) => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      await queryClient.cancelQueries({ queryKey })

      const previousCollections = queryClient.getQueryData<CollectionsWithSources>(queryKey)
      const previousLocalSource = useSourceStore.getState().sources[source.id]

      renameLocalSource(source.id, name)

      queryClient.setQueryData<CollectionsWithSources>(queryKey, (current) =>
        renameSourceInQuery(current, source.id, name)
      )

      return { previousCollections, previousLocalSource }
    },
    onError: (error, variables, context) => {
      // TODO: Toast
      console.error(`Error renaming source: ${variables.source.id}`, error)

      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]

      queryClient.setQueryData<CollectionsWithSources>(queryKey, context?.previousCollections)

      if (context?.previousLocalSource) {
        renameLocalSource(variables.source.id, context.previousLocalSource.name)
      }
    },
    onSettled: () => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const onEditCollectionMutation = useMutation({
    mutationFn: ({ collection, name }: { collection: CollectionGroupCollection; name: string }) => {
      return updateCollectionNameById(collection.id, name)
    },
    onMutate: async ({ collection, name }) => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      await queryClient.cancelQueries({ queryKey })

      const previousCollections = queryClient.getQueryData<CollectionsWithSources>(queryKey)

      queryClient.setQueryData<CollectionsWithSources>(queryKey, (current) =>
        renameCollectionInQuery(current, collection.id, name)
      )

      return { previousCollections }
    },
    onError: (error, variables, context) => {
      // TODO: Toast
      console.error(`Error renaming collection: ${variables.collection.id}`, error)

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

  function onDeleteSource(source: SourceRowSource) {
    onDeleteSourcesMutation.mutate(source)
  }

  function onDeleteCollection(collection: CollectionGroupCollection) {
    onDeleteCollectionMutation.mutate(collection)
  }

  function onEditSource(source: SourceRowSource, name: string) {
    const trimmedName = name.trim()
    if (trimmedName.length === 0 || trimmedName === source.name) return

    onEditSourceMutation.mutate({ source, name: trimmedName })
  }

  function onEditCollection(collection: CollectionGroupCollection, name: string) {
    const trimmedName = name.trim()
    if (trimmedName.length === 0 || trimmedName === collection.name) return

    onEditCollectionMutation.mutate({ collection, name: trimmedName })
  }

  return (
    <>
      <Separator className='border-border p-0' />

      <div className='flex h-8 items-center gap-1.5 rounded-md bg-background px-2 text-muted-foreground'>
        <HugeiconsIcon icon={Search01Icon} className='size-3.5 text-muted-foreground' />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Search'
          className='min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none'
        />
        {isSearching && (
          <Button
            aria-label='Clear search'
            variant='link'
            size='icon-xs'
            onClick={() => {
              setSearchQuery('')
            }}
          >
            <HugeiconsIcon icon={Cancel01Icon} className='size-3.5 text-muted-foreground' />
          </Button>
        )}
      </div>

      <Separator className='border-border p-0' />

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='flex flex-col gap-2 px-2 pb-2 [&>*:first-child]:mt-2'>
          {renderedCollections.length > 0 ? (
            renderedCollections.map((collection) => (
              <CollectionGroup
                key={collection.id}
                collection={collection}
                onAddSources={onAddSources}
                onDeleteSource={onDeleteSource}
                onEditSource={onEditSource}
                onEditCollection={onEditCollection}
                onDeleteCollection={onDeleteCollection}
                isSearching={isSearching}
                isAddingSources={addingSourcesCollectionId === collection.id}
              />
            ))
          ) : (
            <div className='flex flex-col items-center justify-center gap-2'>
              <p className='text-xs text-muted-foreground'>No collections found</p>
            </div>
          )}
        </div>
      </div>
    </>
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
