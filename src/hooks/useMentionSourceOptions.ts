'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  collectionsHaveInFlightSources,
  mentionOptionsFromCollections,
} from '~/lib/chat/sourceMentions'
import { COLLECTIONS_WITH_SOURCES_KEY } from '~/lib/query_keys'
import { listCollectionsWithSources } from '~/server/actions/collections'

export function useMentionSourceOptions(mentionMenuOpen: boolean) {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [COLLECTIONS_WITH_SOURCES_KEY],
    queryFn: listCollectionsWithSources,
    refetchInterval: (currentQuery) =>
      collectionsHaveInFlightSources(currentQuery.state.data) ? 2000 : false,
  })

  useEffect(() => {
    if (!mentionMenuOpen) return
    void refetch()
  }, [mentionMenuOpen, refetch])

  return {
    options: mentionOptionsFromCollections(data),
    isLoading: isLoading || isFetching,
  }
}
