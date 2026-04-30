'use client'

import type { CSSProperties, ElementType } from 'react'

import { createElement, memo, useMemo } from 'react'
import { cn } from '~/lib/utils'

export interface TextShimmerProps {
  children: string
  as?: ElementType
  className?: string
  /** Base text color the shimmer reveals (second gradient stop). Highlight still uses `background` token. */
  textColorVar?: string
  /** Loop length in seconds */
  duration?: number
  /** Multiplied by character count (px) — width of the highlight band in the sweep */
  spread?: number
}

const ShimmerComponent = ({
  children,
  as = 'p',
  className,
  textColorVar = 'var(--color-muted-foreground)',
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const dynamicSpread = useMemo(
    () => Math.max(4, (children?.length ?? 0) * spread),
    [children, spread]
  )

  const Tag = typeof as === 'string' ? as : 'p'

  return createElement(
    Tag,
    {
      className: cn(
        'lex-shimmer-pan relative inline-block bg-[length:250%_100%,auto] bg-clip-text',
        '[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))]',
        className,
        'text-transparent'
      ),
      style: {
        '--spread': `${dynamicSpread}px`,
        '--shimmer-base': textColorVar,
        '--shimmer-duration': `${duration}s`,
        backgroundImage: 'var(--bg), linear-gradient(var(--shimmer-base), var(--shimmer-base))',
      } as CSSProperties,
    },
    children
  )
}

export const Shimmer = memo(ShimmerComponent)
