'use client'

import type { HydratedCitation } from '~/server/actions/getCitationHydrationByIds'

import { PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function citationNotReadyTooltip(status: HydratedCitation['videoStatus']) {
  switch (status) {
    case 'deleted':
      return 'This source was deleted'
    case 'failed':
      return 'Video could not be processed'
    case 'uploading':
    case 'pending_upload':
      return 'Video still uploading'
    case 'processing':
      return 'Video still processing'
    default:
      return 'Video not ready yet'
  }
}

export function CitationChipPending() {
  return (
    <span
      aria-hidden='true'
      className='inline-flex h-[1lh] w-[10ch] animate-pulse items-center justify-center rounded-sm bg-muted align-middle leading-[inherit] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]'
    />
  )
}

export function CitationChip({
  citation,
  onOpen,
}: {
  citation: HydratedCitation
  onOpen: (citation: HydratedCitation) => void
}) {
  const startTime = citation.startSeconds ?? 0
  const hasPlayableVideo = citation.videoStatus === 'ready' && Boolean(citation.muxPlaybackId)
  const isDeleted = citation.videoStatus === 'deleted'

  // First paint matches the skeleton's muted background so swapping pending →
  // hydrated has no transparent frame. After the next animation frame we flip
  // to the real background and `transition-colors` crossfades into it.
  const [entering, setEntering] = useState(true)
  useEffect(() => {
    if (isDeleted) return

    const raf = requestAnimationFrame(() => setEntering(false))
    return () => cancelAnimationFrame(raf)
  }, [isDeleted])

  const chipButton = (
    <button
      type='button'
      disabled={!hasPlayableVideo}
      title={
        hasPlayableVideo
          ? `Open ${citation.sourceName} at ${formatTimestamp(startTime)}`
          : undefined
      }
      onClick={() => onOpen(citation)}
      className={`inline-flex h-[1lh] cursor-pointer items-center justify-center gap-1 rounded-sm px-1.5 align-middle font-mono leading-[inherit] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] disabled:cursor-not-allowed ${
        isDeleted
          ? 'w-fit bg-destructive/10 text-destructive hover:bg-destructive/10 disabled:bg-destructive/10 disabled:text-destructive'
          : `w-[10ch] text-citation transition-colors duration-[100ms] hover:bg-citation/25 disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted ${
              entering ? 'bg-muted' : 'bg-citation/15'
            }`
      }`}
    >
      <HugeiconsIcon icon={PlayIcon} strokeWidth={2.25} className='size-[1em] shrink-0' />
      <span
        className={
          isDeleted
            ? 'min-w-0 whitespace-nowrap'
            : 'min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,black_calc(100%-1em),transparent)] whitespace-nowrap'
        }
      >
        {isDeleted ? 'Deleted' : citation.sourceName}
      </span>
    </button>
  )

  // Keep one DOM structure whether the video is playable or not: switching from
  // Tooltip-wrapped → bare button remounted the `<button>` and killed
  // `transition-colors` when processing became ready. Tooltip stays mounted;
  // `disabled` on Root suppresses the popup once the chip is interactive.
  return (
    <Tooltip disabled={hasPlayableVideo}>
      <TooltipTrigger
        render={
          <span
            className={
              isDeleted
                ? 'inline-flex w-fit cursor-not-allowed align-middle'
                : hasPlayableVideo
                  ? 'inline-flex w-[10ch] align-middle'
                  : 'inline-flex w-[10ch] cursor-not-allowed align-middle'
            }
          />
        }
      >
        {chipButton}
      </TooltipTrigger>
      {!hasPlayableVideo && (
        <TooltipContent>{citationNotReadyTooltip(citation.videoStatus)}</TooltipContent>
      )}
    </Tooltip>
  )
}
