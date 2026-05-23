import type { CollectionRow, SourceRow } from '~/lib/types/sources'

export type CollectionWithSources = CollectionRow & {
  sources: SourceRow[]
}

export type CollectionsWithSources = CollectionWithSources[]
