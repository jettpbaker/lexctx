import z from 'zod'
import { listAllSources, listSourcesForCollection } from '~/server/actions/sources'

export const listSourcesTool = {
  description:
    'List all uploaded sources across all collections, including source summaries when available. Call with an empty object {}.',
  inputSchema: z.object({}),
  execute: async () => {
    const sources = await listAllSources()
    return {
      sources,
    }
  },
}

export const listSourcesForCollectionTool = {
  description:
    'List uploaded sources in one specific collection, including source summaries when available. Only use this when you have a real collection ID.',
  inputSchema: z.object({
    collectionId: z.uuid().describe('The collection ID to list sources for.'),
  }),
  execute: async ({ collectionId }: { collectionId: string }) => {
    const sources = await listSourcesForCollection(collectionId)
    return {
      sources,
    }
  },
}
