import z from 'zod'
import { searchSources } from '~/server/actions/searchSources'

export const sourceSearchTool = {
  description: 'Search for content in user uploaded sources.',
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Search query. Implemented as a hybrid semantic and sparse vector search, so query accordingly.'
      ),
  }),
  execute: async ({ query }: { query: string }) => {
    const results = await searchSources(query)
    return {
      results,
    }
  },
}
