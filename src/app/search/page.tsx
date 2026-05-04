'use client'

import type { SearchResultRow } from 'chromadb'

import { useState, type SubmitEvent } from 'react'
import { searchSources } from '~/server/actions/searchSources'

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResultRow[]>([])

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('query')
    if (!query || typeof query !== 'string') {
      return
    }

    e.currentTarget.reset()

    const results = await searchSources(query)
    setSearchResults(results)
  }

  return (
    <div className='flex h-full w-full flex-col items-center justify-center p-8'>
      <div>
        <h2>Search Result:</h2>
        <pre>{JSON.stringify(searchResults, null, 2)}</pre>
      </div>
      <form onSubmit={(e) => handleSubmit(e)} className='mt-auto'>
        <input type='text' name='query' placeholder='Search' />
        <button type='submit'>Search</button>
      </form>
    </div>
  )
}
