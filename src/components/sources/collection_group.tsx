'use client'

import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'

import {
  ArrowDown01Icon,
  Delete02Icon,
  Edit03Icon,
  MoreHorizontalIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useRef, useState } from 'react'
import {
  SourceRow,
  type SourceRowAction,
  type SourceRowSource,
} from '~/components/sources/source_row'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Spinner } from '~/components/ui/spinner'
import { MAX_FILES_PER_UPLOAD } from '~/lib/constants'
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
  isSearching?: boolean
  isAddingSources?: boolean
  onAddSources?: (collection: CollectionGroupCollection, files: File[]) => void
  onEditSource?: (source: SourceRowSource, name: string) => void
  onEditCollection?: (collection: CollectionGroupCollection, name: string) => void
  onDeleteSource?: SourceRowAction
  onDeleteCollection?: (collection: CollectionGroupCollection) => void
}

export function CollectionGroup({
  collection,
  defaultOpen = true,
  isSearching = false,
  isAddingSources = false,
  onAddSources,
  onEditSource,
  onEditCollection,
  onDeleteSource,
  onDeleteCollection,
}: CollectionGroupProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [open, setOpen] = useState(defaultOpen)
  const [isEditingName, setIsEditingName] = useState(false)
  const [collectionName, setCollectionName] = useState(collection.name)
  const summary = summarizeStatuses(collection.sources.map((s) => s.status))

  const inputRef = useRef<HTMLInputElement | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const cancelEditRef = useRef(false)

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const files = Array.from(input.files ?? [])
    input.value = ''

    handleAddFiles(files)
  }

  function handleAddFiles(files: File[]) {
    if (files.length === 0) return

    if (files.length > MAX_FILES_PER_UPLOAD) {
      // TODO: Toast
      console.error(`You can only upload ${MAX_FILES_PER_UPLOAD} files at a time`)
      return
    }

    onAddSources?.(collection, files)
  }

  function startEditingName() {
    cancelEditRef.current = false
    setIsEditingName(true)
  }

  function commitNameEdit() {
    if (cancelEditRef.current) {
      cancelEditRef.current = false
      return
    }

    const trimmedName = collectionName.trim()
    setIsEditingName(false)

    if (trimmedName.length === 0) {
      setCollectionName(collection.name)
      return
    }

    setCollectionName(trimmedName)

    if (trimmedName !== collection.name) {
      onEditCollection?.(collection, trimmedName)
    }
  }

  function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelEditRef.current = true
      setIsEditingName(false)
      setCollectionName(collection.name)
      e.currentTarget.blur()
    }
  }

  useEffect(() => {
    setCollectionName(collection.name)
  }, [collection.name])

  useEffect(() => {
    if (isSearching) {
      setOpen(true)
    }
  }, [isSearching])

  useEffect(() => {
    if (isEditingName && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [isEditingName])

  return (
    <section className='flex flex-col overflow-clip rounded-lg border border-border bg-background'>
      <header
        className={cn(
          'box-border flex h-[30px] items-stretch border-b bg-background text-xs',
          open ? 'sticky top-0 z-10 rounded-t-lg border-border' : 'rounded-lg border-transparent'
        )}
      >
        <div className='flex min-w-0 flex-1 items-center gap-1.5 rounded-tl-lg px-2'>
          {isEditingName ? (
            <>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2}
                className={cn(
                  'size-3 shrink-0 text-muted-foreground transition-transform duration-150 ease-in-out motion-reduce:transition-none',
                  !open && '-rotate-90'
                )}
              />
              <input
                ref={editInputRef}
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={commitNameEdit}
                className='min-w-0 flex-1 truncate text-xs font-semibold tracking-tight focus:ring-0 focus:outline-none'
              />
            </>
          ) : (
            <button
              type='button'
              onClick={() => setOpen((prev) => !prev)}
              className='flex min-w-0 flex-1 items-center gap-1.5 text-left'
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
                {collectionName}
              </h2>
            </button>
          )}
          <RatioBadge summary={summary} />
        </div>
        <div className='flex shrink-0 items-center gap-0.5 pr-1.5 pl-1 text-muted-foreground'>
          <input
            ref={inputRef}
            type='file'
            accept='video/*'
            multiple
            className='hidden'
            onChange={handleFilesSelected}
          />
          <Button
            disabled={isAddingSources}
            onClick={() => {
              if (!onAddSources) return
              inputRef?.current?.click()
            }}
            variant='ghost'
            size='icon-xs'
            aria-label='Add sources'
          >
            {!isAddingSources && <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />}
            {isAddingSources && <Spinner className='size-3.5' />}
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete collection?</DialogTitle>
                <DialogDescription>
                  This will delete the collection and all sources in it.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant='destructive'
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    onDeleteCollection?.(collection)
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant='ghost' size='icon-xs' aria-label='Collection actions'>
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                </Button>
              }
            />
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={startEditingName}>
                <HugeiconsIcon icon={Edit03Icon} strokeWidth={2} />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem variant='destructive' onClick={() => setDeleteDialogOpen(true)}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {open && (
        <div className='flex flex-col overflow-hidden rounded-b-lg'>
          {collection.sources.length === 0 && (
            <EmptyCollection handleAddFiles={handleAddFiles} isAddingSources={isAddingSources} />
          )}
          {collection.sources.length > 0 &&
            collection.sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onEdit={onEditSource}
                onDelete={onDeleteSource}
              />
            ))}
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
        className='font-mono text-[11px] tabular-nums'
        color='var(--muted-foreground)'
        shimmerColor='var(--color-foreground)'
        as='span'
        duration={2}
      >
        {ratio}
      </Shimmer>
    )
  }

  return <span className='font-mono text-[11px] text-muted-foreground tabular-nums'>{ratio}</span>
}

function EmptyCollection({
  handleAddFiles,
  isAddingSources,
}: {
  handleAddFiles: (files: File[]) => void
  isAddingSources: boolean
}) {
  const [showFileDragSweep, setShowFileDragSweep] = useState(false)

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setShowFileDragSweep(true)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setShowFileDragSweep(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    handleAddFiles(files)
    e.dataTransfer.clearData()
    setShowFileDragSweep(false)
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex h-16 items-center justify-center text-center text-xs transition-colors'
      )}
    >
      {showFileDragSweep && (
        <div
          onAnimationEnd={() => setShowFileDragSweep(false)}
          aria-hidden
          className='pointer-events-none absolute top-0 left-0 h-full w-full animate-file-drag-sweep bg-linear-to-r from-accent/0 via-accent to-accent/0 mix-blend-overlay'
        />
      )}
      {showFileDragSweep && !isAddingSources && (
        <p className='pointer-events-none text-success'>Release to add videos</p>
      )}
      {!showFileDragSweep && !isAddingSources && (
        <p className='pointer-events-none text-muted-foreground'>Drop videos to add</p>
      )}
      {isAddingSources && (
        <Spinner className='pointer-events-none size-3.5 text-muted-foreground' />
      )}
    </div>
  )
}
