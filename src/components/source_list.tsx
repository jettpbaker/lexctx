type SourceListProps = {
  sources: unknown[]
}

export function SourceList({ sources: _sources }: SourceListProps) {
  return (
    <div>
      <div>source.</div>
    </div>
  )
}

export function SourceListEmpty() {
  return <p>No sources added yet!</p>
}
