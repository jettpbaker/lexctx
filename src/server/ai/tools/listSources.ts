import z from 'zod'
import { listAllSources, listSourcesForCollection } from '~/server/actions/sources'

export const listSourcesTool = {
  description:
    'List sources. Call with an empty object {} to list all sources, or provide collectionId to list only sources in one collection.',
  inputSchema: z.object({
    collectionId: z
      .uuid()
      .optional()
      .describe('Optional collection ID. Omit this field to list all sources.'),
  }),
  execute: async ({ collectionId }: { collectionId?: string }) => {
    if (collectionId) {
      const sources = await listSourcesForCollection(collectionId)
      return {
        sources,
      }
    }

    const sources = await listAllSources()
    return {
      sources,
    }
  },
}
