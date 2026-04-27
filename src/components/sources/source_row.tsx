'use client'

import type { CSSProperties, MouseEvent } from 'react'

import { Delete02Icon, Edit02Icon, Edit03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Shimmer } from '~/components/ai-elements/shimmer'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import {
  isLocalStage,
  isRemoteStage,
  labelForStatus,
  type SourceUiStatus,
} from '~/lib/source_status'
import { cn } from '~/lib/utils'

export type SourceRowSource = {
  id: string
  name: string
  fileSize: number | null
  createdAt: Date
  status: SourceUiStatus
}

export type SourceRowAction = (source: SourceRowSource) => void

type SourceRowProps = {
  source: SourceRowSource
  onEdit?: SourceRowAction
  onDelete?: SourceRowAction
}

export function SourceRow({ source, onEdit, onDelete }: SourceRowProps) {
  const { status } = source
  const failed = status.kind === 'failed'

  return (
    <div
      className={cn(
        'group/row text-foreground',
        failed
          ? 'bg-gradient-to-r from-warn/10 to-warn/0 text-destructive hover:from-warn/20'
          : 'hover:bg-muted/40'
      )}
    >
      <div className='flex w-full items-center gap-2 px-3 py-2'>
        <span className='min-w-0 flex-1 truncate text-xs font-medium'>{source.name}</span>
        <div className='grid shrink-0 items-center'>
          <div className='col-start-1 row-start-1 flex items-center justify-end transition-opacity duration-150 ease-out group-focus-within/row:opacity-0 group-hover/row:opacity-0 motion-reduce:transition-none'>
            <StatusLabel status={status} />
          </div>
          <div className='pointer-events-none col-start-1 row-start-1 flex translate-x-1 items-center justify-end opacity-0 transition-all duration-150 ease-out group-focus-within/row:pointer-events-auto group-focus-within/row:translate-x-0 group-focus-within/row:opacity-100 group-hover/row:pointer-events-auto group-hover/row:translate-x-0 group-hover/row:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-none'>
            <SourceActions source={source} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      </div>
    </div>
  )
}

type SourceActionsProps = {
  source: SourceRowSource
  onEdit?: SourceRowAction
  onDelete?: SourceRowAction
}

function SourceActions({ source, onEdit, onDelete }: SourceActionsProps) {
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
        <TooltipContent>Edit source</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='Delete source'
              onClick={handle(onDelete)}
              className='hover:bg-destructive/10 hover:text-destructive'
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>Delete source</TooltipContent>
      </Tooltip>
    </div>
  )
}

function StatusLabel({ status }: { status: SourceUiStatus }) {
  if (status.kind === 'ready') {
    return null
  }

  const baseClasses = 'shrink-0 text-[10px] tracking-wide uppercase'

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
      <Shimmer as='span' textColorVar='var(--color-foreground)' className={baseClasses} spread={1}>
        {labelForStatus(status)}
      </Shimmer>
    )
  }

  return (
    <span
      className={cn(
        baseClasses,
        status.kind === 'failed' && 'text-destructive',
        status.kind === 'queued' && 'text-muted-foreground'
      )}
    >
      {labelForStatus(status)}
    </span>
  )
}
