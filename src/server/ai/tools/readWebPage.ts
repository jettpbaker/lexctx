import z from 'zod'

import { getExaClient } from './exa'

const MAX_PAGE_CHARACTERS = 15000

export const readWebPageTool = {
  description:
    'Fetch readable text content from a specific webpage URL when webSearch highlights are insufficient. Use after identifying a relevant page.',
  inputSchema: z.object({
    url: z.url().describe('The exact webpage URL to fetch.'),
  }),
  execute: async ({ url }: { url: string }) => {
    const contents = await getExaClient().getContents(url, {
      text: {
        maxCharacters: MAX_PAGE_CHARACTERS,
      },
    })

    return {
      results: contents.results,
    }
  },
}
