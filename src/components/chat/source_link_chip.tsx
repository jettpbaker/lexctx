'use client'

import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

const chipClassName =
  'mx-0.5 inline max-w-[12rem] truncate align-middle text-xs font-medium text-citation underline-offset-2'

type SourceLinkChipProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
}

export function SourceLinkChip({ children, onClick, disabled, title }: SourceLinkChipProps) {
  if (!onClick) {
    return (
      <span title={title} className={cn(chipClassName, 'cursor-default hover:underline')}>
        {children}
      </span>
    )
  }

  return (
    <button
      type='button'
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        chipClassName,
        disabled ? 'cursor-default opacity-50' : 'cursor-pointer hover:underline'
      )}
    >
      {children}
    </button>
  )
}
