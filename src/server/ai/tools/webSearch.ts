import z from 'zod'

import { getExaClient } from './exa'

export const webSearchTool = {
  description:
    'Search the web for current or external information. Returns relevant pages with concise highlights; use readWebPage for full page content when a result looks important and you want more detail.',
  inputSchema: z.object({
    query: z.string().describe('Natural language web search query.'),
  }),
  execute: async ({ query }: { query: string }) => {
    const search = await getExaClient().search(query, {
      type: 'auto',
      numResults: 5,
      contents: {
        highlights: true,
      },
    })

    return {
      results: search.results,
    }
  },
}
