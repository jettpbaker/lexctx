'use client'

import { Shimmer } from '~/components/ai-elements/shimmer'
import { isVideoChipVisible, type VideoUiStatus } from '~/lib/source_status'
import { cn } from '~/lib/utils'

const baseClasses =
  'font-mono shrink-0 inline-flex items-center text-[10px] tracking-wide uppercase tabular-nums'

export function VideoStatusChip({ status }: { status: VideoUiStatus }) {
  if (!isVideoChipVisible(status)) return null

  if (status.kind === 'uploading') {
    const pct = Math.round(Math.max(0, Math.min(1, status.progress)) * 100)
    // Pad to two digits so the chip width (and the "ready" label position to
    // its right) doesn't jitter as the percentage crosses 0→9→10.
    const display = String(pct).padStart(2, '0')
    return (
      <span
        className={cn(baseClasses, 'text-muted-foreground/60')}
        aria-label={`Video upload ${pct}% complete`}
      >
        video {display}%
      </span>
    )
  }

  if (status.kind === 'processing') {
    return (
      <Shimmer
        className={cn(baseClasses, 'opacity-70')}
        color='var(--muted-foreground)'
        shimmerColor='var(--color-foreground)'
        as='span'
        duration={1.5}
      >
        video processing
      </Shimmer>
    )
  }

  return <span className={cn(baseClasses, 'text-warn/80')}>video failed</span>
}
