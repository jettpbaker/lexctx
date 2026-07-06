'use client'

import type { ComponentProps } from 'react'

import { createContext, useContext, useMemo } from 'react'
import { cn } from '~/lib/utils'

const ICON_RADIUS = 9
const ICON_VIEWBOX = 24
const ICON_CENTER = 12
const ICON_STROKE_WIDTH = 3

interface ContextSchema {
  usedTokens: number
  maxTokens: number
}

const ContextContext = createContext<ContextSchema | null>(null)

const useContextValue = () => {
  const context = useContext(ContextContext)

  if (!context) {
    throw new Error('Context components must be used within Context')
  }

  return context
}

export type ContextProps = ComponentProps<'div'> & ContextSchema & {
  modelId?: string
}

export const Context = ({ usedTokens, maxTokens, ...props }: ContextProps) => {
  const contextValue = useMemo(
    () => ({ maxTokens, usedTokens }),
    [maxTokens, usedTokens]
  )

  return (
    <ContextContext.Provider value={contextValue}>
      <div {...props} />
    </ContextContext.Provider>
  )
}

const ContextIcon = () => {
  const { usedTokens, maxTokens } = useContextValue()
  const circumference = 2 * Math.PI * ICON_RADIUS
  const usedPercent = usedTokens / maxTokens
  const dashOffset = circumference * (1 - usedPercent)

  return (
    <svg
      aria-label='Model context usage'
      height='20'
      role='img'
      style={{ color: 'currentcolor' }}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width='20'
    >
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill='none'
        opacity='0.25'
        r={ICON_RADIUS}
        stroke='currentColor'
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill='none'
        opacity='1'
        r={ICON_RADIUS}
        stroke='var(--primary)'
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap='round'
        strokeWidth={ICON_STROKE_WIDTH}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
    </svg>
  )
}

export type ContextTriggerProps = ComponentProps<'button'>

export const ContextTrigger = ({ children, className, type, ...props }: ContextTriggerProps) => {
  const { usedTokens, maxTokens } = useContextValue()
  const usedPercent = usedTokens / maxTokens
  const renderedPercent = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(usedPercent)

  return (
    <button
      type={type ?? 'button'}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <ContextIcon />
          <span className='font-mono text-xs text-muted-foreground'>
            {renderedPercent}
          </span>
        </>
      )}
    </button>
  )
}
