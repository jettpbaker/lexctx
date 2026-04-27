'use client'

import { ArrowDown01Icon, MoreHorizontalIcon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import {
  SourceRow,
  type SourceRowAction,
  type SourceRowSource,
} from '~/components/sources/source_row'
import { Button } from '~/components/ui/button'
import { type CollectionStatusSummary, summarizeStatuses } from '~/lib/source_status'
import { cn } from '~/lib/utils'

import { Shimmer } from '../ai-elements/shimmer'

export type CollectionGroupCollection = {
  id: string
  name: string
  description: string | null
  createdAt: Date
  sources: SourceRowSource[]
}

type CollectionGroupProps = {
  collection: CollectionGroupCollection
  defaultOpen?: boolean
  onEditSource?: SourceRowAction
  onDeleteSource?: SourceRowAction
}

export function CollectionGroup({
  collection,
  defaultOpen = true,
  onEditSource,
  onDeleteSource,
}: CollectionGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const summary = summarizeStatuses(collection.sources.map((s) => s.status))

  return (
    <section className='flex flex-col overflow-clip rounded-lg border border-border bg-background'>
      <header
        className={cn(
          'flex h-[30px] items-stretch border-border bg-background text-xs',
          open ? 'sticky top-0 z-10 rounded-t-lg border-b' : 'rounded-lg'
        )}
      >
        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          className='flex flex-1 items-center gap-1.5 rounded-tl-lg px-2 text-left'
          aria-expanded={open}
          aria-label={open ? 'Collapse collection' : 'Expand collection'}
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              'size-3 shrink-0 text-muted-foreground transition-transform duration-150 ease-in-out motion-reduce:transition-none',
              !open && '-rotate-90'
            )}
          />
          <h2 className='min-w-0 flex-1 truncate text-xs font-semibold tracking-tight'>
            {collection.name}
          </h2>
          <RatioBadge summary={summary} />
        </button>
        <div className='flex shrink-0 items-center gap-0.5 pr-1.5 pl-1 text-muted-foreground'>
          <Button variant='ghost' size='icon-xs' aria-label='Add sources'>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          </Button>
          <Button variant='ghost' size='icon-xs' aria-label='Collection actions'>
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
          </Button>
        </div>
      </header>

      {open && (
        <div className='flex flex-col overflow-hidden rounded-b-lg'>
          {collection.sources.length === 0 ? (
            <EmptyCollection />
          ) : (
            collection.sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onEdit={onEditSource}
                onDelete={onDeleteSource}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}

function RatioBadge({ summary }: { summary: CollectionStatusSummary }) {
  const hasFailed = summary.failed > 0

  const total = summary.total.toString()
  const ready = summary.ready.toString()

  const ratio = `${ready}/${total}`

  if (summary.total === 0) {
    return null
  }

  if (hasFailed) {
    return (
      <span className='font-mono text-[11px] text-warn tabular-nums'>
        {summary.ready}/{summary.total}
      </span>
    )
  }

  const allReady = summary.ready === summary.total

  if (!allReady) {
    return (
      <Shimmer
        duration={1.5}
        spread={3}
        as='span'
        textColorVar='var(--color-foreground)'
        className='font-mono text-[11px] tabular-nums'
      >
        {ratio}
      </Shimmer>
    )
  }

  return <span className='font-mono text-[11px] text-foreground tabular-nums'>{ratio}</span>
}

function EmptyCollection() {
  return (
    <div className='px-4 py-6 text-center text-xs text-muted-foreground transition-colors hover:cursor-pointer hover:text-foreground/80'>
      <p>Drop videos to add</p>
      <p className='mt-1 text-[11px]'>or click + to upload</p>
    </div>
  )
}
