'use client'

import type { ChangeEvent, DragEvent } from 'react'
import type {
  CollectionGroupCollection,
  SourceRowAction,
  SourceRowSource,
} from '~/lib/types/ui/sources'

import {
  ArrowDown01Icon,
  Delete02Icon,
  Edit03Icon,
  MoreHorizontalIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SourceRow } from '~/components/sources/source_row'
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
import { useInlineRename } from '~/hooks/useInlineRename'
import { MAX_FILES_PER_UPLOAD } from '~/lib/constants'
import { type CollectionStatusSummary, summarizeStatuses } from '~/lib/source_status'
import { cn } from '~/lib/utils'

import { Shimmer } from '../ai-elements/shimmer'

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
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const dragDepth = useRef(0)
  const summary = summarizeStatuses(collection.sources.map((s) => s.status))

  const canAddSources = Boolean(onAddSources)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const rename = useInlineRename({
    value: collection.name,
    onCommit: (name) => onEditCollection?.(collection, name),
  })

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const files = Array.from(input.files ?? [])
    input.value = ''

    handleAddFiles(files)
  }

  function handleAddFiles(files: File[]) {
    if (files.length === 0) return

    if (files.length > MAX_FILES_PER_UPLOAD) {
      toast.error('Too many files', {
        description: `You can add up to ${MAX_FILES_PER_UPLOAD} videos at once.`,
      })
      return
    }

    onAddSources?.(collection, files)
  }

  function dragHasFiles(e: DragEvent<HTMLElement>) {
    return Array.from(e.dataTransfer.types).includes('Files')
  }

  function handleDragEnter(e: DragEvent<HTMLElement>) {
    if (!canAddSources || !dragHasFiles(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setIsDraggingFiles(true)
  }

  function handleDragOver(e: DragEvent<HTMLElement>) {
    if (!canAddSources || !dragHasFiles(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave(e: DragEvent<HTMLElement>) {
    if (!canAddSources || !dragHasFiles(e)) return
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDraggingFiles(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLElement>) {
    if (!canAddSources) return
    e.preventDefault()
    dragDepth.current = 0
    setIsDraggingFiles(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    handleAddFiles(files)
    e.dataTransfer.clearData()
  }

  useEffect(() => {
    if (isSearching) {
      setOpen(true)
    }
  }, [isSearching])

  return (
    <section
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col overflow-clip rounded-lg border bg-background transition-colors',
        isDraggingFiles ? 'border-success/40' : 'border-border'
      )}
    >
      {isDraggingFiles && (
        <div className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-lg bg-success/5'>
          <div
            aria-hidden
            className='absolute inset-0 animate-file-drag-sweep bg-linear-to-r from-white/0 via-white/50 to-white/0 mix-blend-overlay motion-reduce:animate-none'
          />
          {!isAddingSources && <p className='relative text-xs text-success'>Release to add videos</p>}
        </div>
      )}
      <header
        className={cn(
          'box-border flex h-[30px] items-stretch border-b bg-background text-xs',
          open ? 'sticky top-0 z-10 rounded-t-lg border-border' : 'rounded-lg border-transparent'
        )}
      >
        <div className='flex min-w-0 flex-1 items-center gap-1.5 rounded-tl-lg px-2'>
          {rename.isEditing ? (
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
                ref={rename.inputRef}
                value={rename.draft}
                onChange={(e) => rename.setDraft(e.target.value)}
                onKeyDown={rename.handleKeyDown}
                onBlur={() => void rename.handleBlur()}
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
                {rename.draft}
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
              <DialogFooter className='mt-2'>
                <Button variant='ghost' size='sm' onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
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
              <DropdownMenuItem onClick={rename.startEditing}>
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
            <EmptyCollection isAddingSources={isAddingSources} />
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

function EmptyCollection({ isAddingSources }: { isAddingSources: boolean }) {
  return (
    <div className='relative flex h-16 items-center justify-center text-center text-xs'>
      {isAddingSources ? (
        <Spinner className='pointer-events-none size-3.5 text-muted-foreground' />
      ) : (
        <p className='pointer-events-none text-muted-foreground'>Drop videos to add</p>
      )}
    </div>
  )
}
