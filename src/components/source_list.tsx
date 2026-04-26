import type { LocalSourceType } from '~/lib/types'

import Source from './source'

export function SourceList({ sources }: { sources: LocalSourceType[] }) {
  return (
    <div>
      <p>Sources: {sources.length}</p>
      <ul>
        {sources.map((source) => (
          <Source key={source.id} id={source.id} />
        ))}
      </ul>
    </div>
  )
}

export function SourceListEmpty() {
  return <p>No sources added yet!</p>
}
