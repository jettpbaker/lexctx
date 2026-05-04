'use server'

import { search } from '~/db/chroma'

export async function searchSources(query: string) {
  const results = await search(query)
  return results
}
