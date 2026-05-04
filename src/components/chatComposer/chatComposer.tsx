'use client'

import type { ChatStatus } from 'ai'

import { Add01Icon, ArrowUp02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

type ChatComposerProps = {
  value: string
  status: ChatStatus
  placeholder?: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
}

export function ChatComposer({
  value,
  status,
  placeholder = 'Send follow up',
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [hasMultipleInputLines, setHasMultipleInputLines] = useState(false)
  const isBusy = status === 'submitted' || status === 'streaming'
  const canSubmit = value.trim().length > 0 && !isBusy
  const isEmpty = value.trim() === ''
  const multipleInputLines = !isEmpty && hasMultipleInputLines

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'

    const styles = window.getComputedStyle(textarea)
    const lineHeight = Number.parseFloat(styles.lineHeight)
    const paddingY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
    const singleLineHeight = Number.isFinite(lineHeight)
      ? lineHeight + paddingY
      : textarea.clientHeight

    setHasMultipleInputLines(textarea.scrollHeight > singleLineHeight + 1)

    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  const submit = useCallback(() => {
    if (!canSubmit) return
    onSubmit(value.trim())
  }, [canSubmit, onSubmit, value])

  return (
    <div>
      <form
        className={cn(
          'border border-border bg-card',
          multipleInputLines ? 'rounded-[calc(var(--radius)*2)]' : 'rounded-full'
        )}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div
          className={cn(
            'flex min-h-8 gap-2',
            multipleInputLines
              ? 'flex-col items-stretch justify-start px-2.5 py-2.5'
              : 'flex-row items-center justify-center px-2 py-2 pl-3'
          )}
        >
          {!multipleInputLines && (
            <Button size='icon' variant='secondary' className='hidden rounded-full' type='button'>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className='size-4.5' />
            </Button>
          )}

          <textarea
            className={cn(
              'block max-h-32 min-h-4 w-full resize-none overflow-y-auto border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground',
              multipleInputLines ? 'flex-none' : 'flex-1'
            )}
            ref={textareaRef}
            onChange={(event) => onChange(event.currentTarget.value)}
            onCompositionEnd={() => setIsComposing(false)}
            onCompositionStart={() => setIsComposing(true)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              if (event.shiftKey || isComposing || event.nativeEvent.isComposing) return

              event.preventDefault()
              submit()
            }}
            placeholder={placeholder}
            rows={1}
            value={value}
          />

          {!multipleInputLines && (
            <Button size='icon' disabled={!canSubmit} type='submit' className='rounded-full'>
              <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} className='size-4.5' />
            </Button>
          )}

          {multipleInputLines && (
            <div className='flex w-full items-center justify-end'>
              <Button size='icon' variant='secondary' className='hidden rounded-full' type='button'>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className='size-4.5' />
              </Button>

              <Button size='icon' disabled={!canSubmit} type='submit' className='rounded-full'>
                <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} className='size-4.5' />
              </Button>
            </div>
          )}
        </div>
      </form>

      <div className='flex items-center justify-between px-1 py-2 text-xs text-muted-foreground'>
        {/* <div className='flex items-center gap-3'>
          <span>Local</span>
          <span>ui/ai</span>
        </div>
        <div className='flex items-center gap-3'>
          <span>29.5% context</span>
        </div> */}
      </div>
    </div>
  )
}
