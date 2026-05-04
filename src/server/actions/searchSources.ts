'use server'

import { hybridSearch } from '~/db/chroma'

export async function searchSources(query: string) {
  const results = await hybridSearch(query)
  return results
}
