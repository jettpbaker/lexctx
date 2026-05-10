'use client'

import type { ChatStatus } from 'ai'
import type { ChatUsageSummary } from '~/server/actions/sources'

import { Add01Icon, ArrowUp02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

import { Context, ContextTrigger } from '../ai-elements/context'

type ChatComposerProps = {
  value: string
  status: ChatStatus
  isSubmitPending?: boolean
  usage?: ChatUsageSummary
  displayUsage?: boolean
  placeholder?: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onStop?: () => void
}

export function ChatComposer({
  value,
  status,
  isSubmitPending = false,
  placeholder = 'Send follow up',
  usage,
  displayUsage = true,
  onChange,
  onSubmit,
  onStop,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [hasMultipleInputLines, setHasMultipleInputLines] = useState(false)
  const isBusy = isSubmitPending || status === 'submitted' || status === 'streaming'
  const canStop = status === 'submitted' || status === 'streaming'
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

  const maxContextTokens = 272_000
  const usedContextPercent = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format((usage?.totalTokens ?? 0) / maxContextTokens)
  const price = ((usage?.totalCostMicroUsd ?? 0) / 1_000_000).toFixed(2).padStart(5, '0')
  const [d1, d2, , d3, d4] = price

  return (
    <div className='mx-auto w-full max-w-(--conversation-width) px-9'>
      <form
        className={cn(
          'border border-border bg-card',
          multipleInputLines ? 'rounded-2xl' : 'rounded-full'
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
              multipleInputLines ? 'flex-none pr-9' : 'flex-1'
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
            <ComposerActionButton
              canSubmit={canSubmit}
              canStop={canStop}
              isSubmitPending={isSubmitPending}
              onStop={onStop}
            />
          )}

          {multipleInputLines && (
            <div className='flex w-full items-center justify-end'>
              <Button size='icon' variant='secondary' className='hidden rounded-full' type='button'>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className='size-4.5' />
              </Button>

              <ComposerActionButton
                canSubmit={canSubmit}
                canStop={canStop}
                isSubmitPending={isSubmitPending}
                onStop={onStop}
              />
            </div>
          )}
        </div>
      </form>

      <div className='flex min-h-[35px] items-center justify-between px-2 py-2 text-xs text-muted-foreground'>
        {displayUsage && (
          <div className='flex w-full animate-[usage-enter_260ms_var(--ease-out-cubic)_both] items-center justify-between motion-reduce:animate-none'>
            <div className='flex cursor-default items-center gap-0.5'>
              <span>$</span>
              <div className='flex h-[1rem] overflow-hidden font-mono leading-[1rem]'>
                <DigitScroller value={Number(d1)} />
                <DigitScroller value={Number(d2)} />
                <span>.</span>
                <DigitScroller value={Number(d3)} />
                <DigitScroller value={Number(d4)} />
              </div>
            </div>
            <div>
              <Context maxTokens={maxContextTokens} usedTokens={usage?.totalTokens ?? 0}>
                <Tooltip>
                  <TooltipTrigger render={<ContextTrigger />} />
                  <TooltipContent>{usedContextPercent} context used</TooltipContent>
                </Tooltip>
              </Context>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ComposerActionButton({
  canSubmit,
  canStop,
  isSubmitPending,
  onStop,
}: {
  canSubmit: boolean
  canStop: boolean
  isSubmitPending: boolean
  onStop?: () => void
}) {
  if (canStop) {
    return (
      <Button
        size='icon'
        type='button'
        className='rounded-full'
        aria-label='Stop response'
        onClick={onStop}
      >
        <span className='size-3 rounded-[2px] bg-current' aria-hidden />
      </Button>
    )
  }

  return (
    <Button size='icon' disabled={!canSubmit} type='submit' className='rounded-full'>
      {isSubmitPending ? (
        <Spinner className='size-4.5' />
      ) : (
        <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} className='size-4.5' />
      )}
    </Button>
  )
}

function DigitScroller({ value }: { value: number }) {
  return (
    <div
      className='flex flex-col transition-transform duration-500 motion-reduce:transition-none'
      style={{
        transform: `translateY(calc(${value} * -1rem))`,
        transitionTimingFunction: 'var(--ease-out-cubic)',
      }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <span className='h-[1rem] leading-[1rem]' key={i}>
          {i}
        </span>
      ))}
    </div>
  )
}
