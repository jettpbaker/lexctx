'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import type { KeyboardEvent } from 'react'

import { Delete02Icon, Edit03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useRef, useState } from 'react'
import { Shimmer } from '~/components/ai-elements/shimmer'
import { VideoStatusChip } from '~/components/sources/video_status_chip'
import { Button } from '~/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import {
  isLocalStage,
  isRemoteStage,
  isVideoChipVisible,
  labelForStatus,
  type SourceUiStatus,
  type VideoUiStatus,
} from '~/lib/source_status'
import { cn } from '~/lib/utils'

export type SourceRowSource = {
  id: string
  name: string
  fileSize: number | null
  createdAt: Date
  status: SourceUiStatus
  videoStatus: VideoUiStatus
}

export type SourceRowAction = (source: SourceRowSource) => void

type SourceRowProps = {
  source: SourceRowSource
  onEdit?: (source: SourceRowSource, name: string) => void
  onDelete?: SourceRowAction
}

export function SourceRow({ source, onEdit, onDelete }: SourceRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [sourceName, setSourceName] = useState(source.name)
  const [showSuccessSweep, setShowSuccessSweep] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const editInput = useRef<HTMLInputElement>(null)
  const cancelEditRef = useRef(false)

  const previousStatus = useRef(source.status.kind)

  const { status, videoStatus } = source
  const failed = status.kind === 'failed'

  // When chat is ready but the video chip is still showing (uploading /
  // processing / failed), surface "ready" explicitly in the StatusLabel slot.
  // Otherwise the row is ambiguous — the chip alone reads as "this source is
  // still working" even though chat is already usable. Right-aligned so the
  // word stacks into a tidy column across rows.
  const showReadyPrimaryLabel = status.kind === 'ready' && isVideoChipVisible(videoStatus)

  useEffect(() => {
    if (status.kind === 'ready' && previousStatus.current !== 'ready') setShowSuccessSweep(true)
    previousStatus.current = status.kind
  }, [status])

  function handleConfirmDelete() {
    setDeleteOpen(false)
    onDelete?.(source)
  }

  function startEditing() {
    cancelEditRef.current = false
    setIsEditing(true)
  }

  function commitEdit() {
    if (cancelEditRef.current) {
      cancelEditRef.current = false
      return
    }

    const trimmedName = sourceName.trim()
    setIsEditing(false)

    if (trimmedName.length === 0) {
      setSourceName(source.name)
      return
    }

    setSourceName(trimmedName)

    if (trimmedName !== source.name) {
      onEdit?.(source, trimmedName)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelEditRef.current = true
      setIsEditing(false)
      setSourceName(source.name)
      e.currentTarget.blur()
    }
  }

  useEffect(() => {
    setSourceName(source.name)
  }, [source.name])

  useEffect(() => {
    if (isEditing && editInput.current) {
      editInput.current.focus()
      editInput.current.select()
    }
  }, [isEditing])

  return (
    <>
      <div className='relative'>
        {showSuccessSweep && (
          <div
            onAnimationEnd={() => setShowSuccessSweep(false)}
            aria-hidden
            className='pointer-events-none absolute h-full w-full animate-success-sweep bg-linear-to-r from-success/0 via-success to-success/0 mix-blend-overlay'
          />
        )}
        <div
          className={cn(
            'group/row text-foreground',
            failed
              ? 'bg-gradient-to-r from-warn/10 to-warn/0 text-destructive hover:from-warn/20'
              : 'hover:bg-muted/40'
          )}
        >
          <div className='flex w-full items-center gap-2 px-3 py-2'>
            <span
              className={cn('min-w-0 flex-1 truncate text-xs font-medium', isEditing && 'hidden')}
            >
              {sourceName}
            </span>

            <input
              ref={editInput}
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              className={cn(
                'min-w-0 flex-1 truncate text-xs font-medium focus:ring-0 focus:outline-none',
                !isEditing && 'hidden'
              )}
            />

            <div className='grid shrink-0 items-center'>
              <div className='col-start-1 row-start-1 flex items-center justify-end gap-2 transition-opacity duration-150 ease-out group-focus-within/row:opacity-0 group-hover/row:opacity-0 motion-reduce:transition-none'>
                <VideoStatusChip status={videoStatus} />
                {showReadyPrimaryLabel ? <ReadyPrimaryLabel /> : <StatusLabel status={status} />}
              </div>
              <div className='pointer-events-none col-start-1 row-start-1 flex translate-x-1 items-center justify-end opacity-0 transition-all duration-150 ease-out group-focus-within/row:pointer-events-auto group-focus-within/row:translate-x-0 group-focus-within/row:opacity-100 group-hover/row:pointer-events-auto group-hover/row:translate-x-0 group-hover/row:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-none'>
                <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <SourceActions
                    source={source}
                    onEdit={startEditing}
                    deleteTrigger={
                      <PopoverTrigger
                        render={
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label='Delete source'
                            className='hover:bg-destructive/10 hover:text-destructive'
                          >
                            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                          </Button>
                        }
                      />
                    }
                  />
                  <PopoverContent align='end' side='left' className='w-64'>
                    <PopoverHeader>
                      <PopoverTitle>Delete source?</PopoverTitle>
                      <PopoverDescription>
                        This removes the source, transcript, and embeddings.
                      </PopoverDescription>
                    </PopoverHeader>
                    <div className='flex justify-end gap-1.5'>
                      <Button variant='ghost' size='sm' onClick={() => setDeleteOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant='destructive' size='sm' onClick={handleConfirmDelete}>
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

type SourceActionsProps = {
  source: SourceRowSource
  onEdit?: SourceRowAction
  deleteTrigger: ReactNode
}

function SourceActions({ source, onEdit, deleteTrigger }: SourceActionsProps) {
  const handle = (cb?: SourceRowAction) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    cb?.(source)
  }

  return (
    <div className='flex items-center gap-0.5 text-muted-foreground'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='Edit source'
              onClick={handle(onEdit)}
            >
              <HugeiconsIcon icon={Edit03Icon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>Rename source</TooltipContent>
      </Tooltip>
      {deleteTrigger}
    </div>
  )
}

function StatusLabel({ status }: { status: SourceUiStatus }) {
  const baseClasses = 'font-mono shrink-0 text-[10px] tracking-wide uppercase'

  if (status.kind === 'ready') return null

  if (isLocalStage(status)) {
    const pct = Math.max(0, Math.min(1, status.progress)) * 100
    return (
      <span
        key={status.kind}
        className={cn(baseClasses, 'text-progress-fill')}
        style={{ '--progress-fill': `${pct}%` } as CSSProperties}
      >
        {labelForStatus(status)}
      </span>
    )
  }

  if (isRemoteStage(status)) {
    return (
      <Shimmer
        className={cn(baseClasses)}
        color='var(--muted-foreground)'
        shimmerColor='var(--color-foreground)'
        as='span'
        duration={1}
      >
        {labelForStatus(status)}
      </Shimmer>
    )
  }

  if (status.kind === 'failed') {
    return <span className={cn(baseClasses, 'text-destructive')}>{labelForStatus(status)}</span>
  }

  return (
    <span className={cn(baseClasses, status.kind === 'queued' && 'text-muted-foreground')}>
      {labelForStatus(status)}
    </span>
  )
}

function ReadyPrimaryLabel() {
  return (
    <span className='shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
      ready
    </span>
  )
}
