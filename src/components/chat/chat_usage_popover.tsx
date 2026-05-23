'use client'

import type { ChatUsage, PersistedChatUsage } from '~/lib/types/chat'

import {
  Context,
  ContextTrigger,
} from '~/components/ai-elements/context'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { formatSessionCost } from '~/lib/chat/formatSessionCost'
import { CHAT_USAGE_TOKEN_COLORS } from '~/lib/chat/chat_usage_token_colors'
import { cn } from '~/lib/utils'
import type { ChatModelId } from '~/server/ai/modelMapping'

type ChatUsagePopoverProps = {
  usage: ChatUsage | PersistedChatUsage
  maxTokens: number
  modelId: ChatModelId
}

type TokenSegment = {
  label: string
  tokens: number
  colorClass: string
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 0.995 ? 0 : 1,
    style: 'percent',
  }).format(value)
}

function getTokenSegments(usage: ChatUsage | PersistedChatUsage): TokenSegment[] {
  const totalInputTokens = usage.totalInputTokens ?? 0
  const cachedInputTokens = usage.totalCachedInputTokens ?? 0
  const outputTokens = usage.totalOutputTokens ?? 0
  const uncachedInputTokens = Math.max(totalInputTokens - cachedInputTokens, 0)

  return [
    { label: 'Input', tokens: uncachedInputTokens, colorClass: CHAT_USAGE_TOKEN_COLORS.input },
    { label: 'Cached Input', tokens: cachedInputTokens, colorClass: CHAT_USAGE_TOKEN_COLORS.cached },
    { label: 'Output', tokens: outputTokens, colorClass: CHAT_USAGE_TOKEN_COLORS.output },
  ]
}

function TokenMixBar({ segments, maxTokens }: { segments: TokenSegment[]; maxTokens: number }) {
  const totalSegmentTokens = segments.reduce((sum, segment) => sum + segment.tokens, 0)

  if (totalSegmentTokens === 0) {
    return <div className='h-1.5 w-full rounded-full bg-muted' />
  }

  return (
    <div className='flex h-1.5 w-full overflow-hidden rounded-full bg-muted'>
      {segments.map((segment) => {
        if (segment.tokens === 0) return null

        const widthPercent = Math.min((segment.tokens / maxTokens) * 100, 100)

        return (
          <div
            key={segment.label}
            className={cn('h-full min-w-px', segment.colorClass)}
            style={{ width: `${widthPercent}%` }}
          />
        )
      })}
    </div>
  )
}

export function ChatUsagePopoverPanel({
  usage,
  maxTokens,
}: Pick<ChatUsagePopoverProps, 'usage' | 'maxTokens'>) {
  const contextInputTokens = usage.contextInputTokens ?? 0
  const usedPercent = maxTokens > 0 ? contextInputTokens / maxTokens : 0
  const segments = getTokenSegments(usage)

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-xs font-medium text-muted-foreground'>Context Usage</div>
          <span className='font-mono tabular-nums text-muted-foreground'>
            ~{formatSessionCost(usage.totalCostMicroUsd ?? 0)}
          </span>
        </div>
        <div className='flex items-center justify-between gap-3 text-xs text-muted-foreground'>
          <span className='font-mono tabular-nums'>{formatPercent(usedPercent)}</span>
          <span className='tabular-nums'>
            <span className='font-mono'>{formatCompact(contextInputTokens)}</span>
            {' / '}
            <span className='font-mono'>{formatCompact(maxTokens)}</span>
          </span>
        </div>
        <TokenMixBar maxTokens={maxTokens} segments={segments} />
      </div>

      <div className='flex flex-col gap-1.5'>
        {segments.map((segment) => (
          <div key={segment.label} className='flex items-center justify-between gap-3 text-xs'>
            <span className='flex min-w-0 items-center gap-2 text-muted-foreground'>
              <span className={cn('size-2.5 shrink-0 rounded-[3px]', segment.colorClass)} />
              <span className='truncate'>{segment.label}</span>
            </span>
            <span className='font-mono tabular-nums text-muted-foreground'>
              {formatCompact(segment.tokens)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatUsagePopover({ usage, maxTokens, modelId }: ChatUsagePopoverProps) {
  const contextInputTokens = usage.contextInputTokens ?? 0

  return (
    <Context usedTokens={contextInputTokens} maxTokens={maxTokens} modelId={modelId}>
      <Popover>
        <PopoverTrigger
          render={
            <ContextTrigger className='rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60' />
          }
        />
        <PopoverContent align='end' side='top' sideOffset={8} className='w-64 p-3'>
          <ChatUsagePopoverPanel usage={usage} maxTokens={maxTokens} />
        </PopoverContent>
      </Popover>
    </Context>
  )
}
