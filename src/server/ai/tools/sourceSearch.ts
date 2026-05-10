import z from 'zod'
import { searchSources } from '~/server/actions/searchSources'

export const sourceSearchTool = {
  description:
    'Search for content in user uploaded sources. Search globally by default; optionally filter by sourceIds or collectionIds when the relevant scope is clear.',
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Search query. Implemented as a hybrid semantic and sparse vector search, so query accordingly.'
      ),
    sourceIds: z
      .array(z.uuid())
      .optional()
      .describe('Only search chunks from these source IDs. Leave unset to search all sources.'),
    collectionIds: z
      .array(z.uuid())
      .optional()
      .describe(
        'Only search chunks from sources in these collection IDs. Leave unset to search all collections.'
      ),
  }),
  execute: async ({
    query,
    sourceIds,
    collectionIds,
  }: {
    query: string
    sourceIds?: string[]
    collectionIds?: string[]
  }) => {
    const results = await searchSources(query, { sourceIds, collectionIds })
    return {
      results,
    }
  },
}
