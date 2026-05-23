'use client'

import { Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHorizontalScrollEdges } from '~/components/ai-elements/scroll-fade'
import { ModelLogo } from '~/components/chat/model_logo'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'
import {
  getChatModelConfig,
  getChatModelCostTier,
  type ChatModelId,
  type ChatModelLogo,
} from '~/server/ai/modelMapping'

type ChatModelOption = {
  id: ChatModelId
  label: string
  logo: ChatModelLogo
  description: string
}

type ChatModelProviderGroup = {
  id: string
  label: string
  logo: ChatModelLogo
  models: ChatModelOption[]
}

const openaiModelLogo = getChatModelConfig('openai/gpt-5.5').logo
const claudeModelLogo = getChatModelConfig('anthropic/claude-sonnet-4.6').logo
const grokModelLogo = getChatModelConfig('xai/grok-4.3').logo

const anthropicLabLogo: ChatModelLogo = {
  kind: 'theme',
  lightSrc: '/model-logos/anthropic-light.svg',
  darkSrc: '/model-logos/anthropic-dark.svg',
}

const xaiLabLogo: ChatModelLogo = {
  kind: 'theme',
  lightSrc: '/model-logos/xai-light.svg',
  darkSrc: '/model-logos/xai-dark.svg',
}

const CHAT_MODEL_PROVIDER_GROUPS: ChatModelProviderGroup[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    logo: openaiModelLogo,
    models: [
      {
        id: 'openai/gpt-5.5',
        label: 'GPT-5.5',
        logo: openaiModelLogo,
        description: 'SOTA reasoning, broad knowledge',
      },
      {
        id: 'openai/gpt-5.4',
        label: 'GPT-5.4',
        logo: openaiModelLogo,
        description: 'Verbose intelligence',
      },
      {
        id: 'openai/gpt-5.4-mini',
        label: 'GPT-5.4 Mini',
        logo: openaiModelLogo,
        description: 'Compact intelligence',
      },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    logo: anthropicLabLogo,
    models: [
      {
        id: 'anthropic/claude-opus-4.7',
        label: 'Claude Opus 4.7',
        logo: claudeModelLogo,
        description: 'SOTA reasoning and conversationality',
      },
      {
        id: 'anthropic/claude-sonnet-4.6',
        label: 'Claude Sonnet 4.6',
        logo: claudeModelLogo,
        description: 'Balanced reasoning & speed',
      },
      {
        id: 'anthropic/claude-haiku-4.5',
        label: 'Claude Haiku 4.5',
        logo: claudeModelLogo,
        description: 'Lightning fast',
      },
    ],
  },
  {
    id: 'xai',
    label: 'xAI',
    logo: xaiLabLogo,
    models: [
      {
        id: 'xai/grok-4.3',
        label: 'Grok 4.3',
        logo: grokModelLogo,
        description: 'Bang for buck intelligence',
      },
    ],
  },
]

const CHAT_MODEL_OPTIONS = CHAT_MODEL_PROVIDER_GROUPS.flatMap((provider) => provider.models)
const MODEL_CHIP_ROW_HEIGHT_REM = 1

function findModel(modelId: ChatModelId) {
  for (const provider of CHAT_MODEL_PROVIDER_GROUPS) {
    const model = provider.models.find((entry) => entry.id === modelId)
    if (model) {
      return { provider, model }
    }
  }

  return {
    provider: CHAT_MODEL_PROVIDER_GROUPS[0],
    model: CHAT_MODEL_PROVIDER_GROUPS[0].models[0],
  }
}

function ModelChipOdometer({ modelId }: { modelId: ChatModelId }) {
  const selectedIndex = Math.max(
    CHAT_MODEL_OPTIONS.findIndex((model) => model.id === modelId),
    0
  )

  return (
    <span className='block h-4 max-w-44 overflow-hidden' aria-hidden>
      <span
        className='flex flex-col transition-transform duration-[250ms] ease-[cubic-bezier(0.215,0.61,0.355,1)] will-change-transform motion-reduce:transition-none'
        style={{
          transform: `translateY(calc(${selectedIndex} * -${MODEL_CHIP_ROW_HEIGHT_REM}rem))`,
        }}
      >
        {CHAT_MODEL_OPTIONS.map((model) => (
          <span key={model.id} className='flex h-4 items-center gap-2 text-[13px] leading-none'>
            <ModelLogo logo={model.logo} className='size-4' />
            <span className='truncate'>{model.label}</span>
          </span>
        ))}
      </span>
    </span>
  )
}

function centerPill(button: HTMLElement, container: HTMLElement, smooth: boolean) {
  const containerRect = container.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()
  const buttonLeftInContent = buttonRect.left - containerRect.left + container.scrollLeft
  const targetCenter = buttonLeftInContent + buttonRect.width / 2 - container.clientWidth / 2
  const maxScroll = container.scrollWidth - container.clientWidth
  const clamped = Math.max(0, Math.min(targetCenter, maxScroll))

  container.scrollTo({ left: clamped, behavior: smooth ? 'smooth' : 'auto' })
}

function ModelCheck({ active }: { active: boolean }) {
  return (
    <HugeiconsIcon
      icon={Tick02Icon}
      strokeWidth={2}
      className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-0')}
    />
  )
}

function ProviderTabBar({
  activeProviderId,
  onChange,
}: {
  activeProviderId: string
  onChange: (providerId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion() ?? false
  const { atLeft, atRight } = useHorizontalScrollEdges(scrollRef)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const frameId = requestAnimationFrame(() => {
      const activeButton = container.querySelector<HTMLElement>(
        `[data-provider-id="${activeProviderId}"]`
      )
      if (activeButton) {
        centerPill(activeButton, container, !reduceMotion)
      }
    })

    return () => cancelAnimationFrame(frameId)
  }, [activeProviderId, reduceMotion])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onWheel(event: WheelEvent) {
      if (!el) return
      if (event.deltaY === 0) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      if (el.scrollWidth <= el.clientWidth) return

      event.preventDefault()
      el.scrollLeft += event.deltaY
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const left = atLeft ? 'black 0' : 'transparent 0, rgba(0,0,0,0.15) 1rem, black 3rem'
  const right = atRight
    ? 'black 100%'
    : 'black calc(100% - 3rem), rgba(0,0,0,0.15) calc(100% - 1rem), transparent 100%'
  const maskImage = atLeft && atRight ? undefined : `linear-gradient(to right, ${left}, ${right})`

  return (
    <div className='relative overflow-hidden'>
      <div
        ref={scrollRef}
        style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
        className='relative -mb-4 flex gap-1.5 overflow-x-auto overflow-y-hidden px-3 pt-3 pb-7 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:size-0'
      >
        {CHAT_MODEL_PROVIDER_GROUPS.map((provider) => {
          const active = provider.id === activeProviderId

          return (
            <button
              key={provider.id}
              data-provider-id={provider.id}
              type='button'
              aria-pressed={active}
              onClick={(event) => {
                onChange(provider.id)
                if (scrollRef.current) {
                  centerPill(event.currentTarget, scrollRef.current, !reduceMotion)
                }
              }}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                active
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <ModelLogo logo={provider.logo} className='size-4' />
              {provider.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ModelList({
  provider,
  modelId,
  onSelect,
}: {
  provider: ChatModelProviderGroup
  modelId: ChatModelId
  onSelect: (id: ChatModelId) => void
}) {
  return (
    <div className='flex flex-col gap-0.5 px-3 py-1'>
      {provider.models.map((model) => {
        const active = model.id === modelId
        const costTier = getChatModelCostTier(getChatModelConfig(model.id).pricing)

        return (
          <button
            key={model.id}
            type='button'
            onClick={() => onSelect(model.id)}
            className={cn(
              'flex items-start justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors',
              active ? 'bg-secondary' : 'hover:bg-muted/50'
            )}
          >
            <span className='flex min-w-0 flex-col gap-0.5'>
              <span className={cn('truncate text-[13px]', active && 'font-medium')}>
                {model.label}
              </span>
              <span className='flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground'>
                <ModelLogo logo={model.logo} className='size-3.5 shrink-0' />
                <span className='truncate'>{model.description}</span>
              </span>
            </span>
            {active ? (
              <ModelCheck active={true} />
            ) : (
              <span
                aria-label={`Cost tier ${costTier} of 4`}
                className='shrink-0 font-mono text-[13px] tracking-tight text-muted-foreground tabular-nums'
              >
                {'$'.repeat(costTier)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ChatModelPicker({
  modelId,
  onModelChange,
  disabled = false,
}: {
  modelId: ChatModelId
  onModelChange: (modelId: ChatModelId) => void
  disabled?: boolean
}) {
  const selection = findModel(modelId)
  const [open, setOpen] = useState(false)
  const [activeProviderId, setActiveProviderId] = useState(selection.provider.id)
  const prevIndexRef = useRef(
    CHAT_MODEL_PROVIDER_GROUPS.findIndex((entry) => entry.id === selection.provider.id)
  )
  const [direction, setDirection] = useState(0)
  const reduceMotion = useReducedMotion() ?? false

  const activeProvider = useMemo(
    () =>
      CHAT_MODEL_PROVIDER_GROUPS.find((entry) => entry.id === activeProviderId) ??
      CHAT_MODEL_PROVIDER_GROUPS[0],
    [activeProviderId]
  )

  function setProvider(nextId: string) {
    const nextIndex = CHAT_MODEL_PROVIDER_GROUPS.findIndex((entry) => entry.id === nextId)
    if (nextIndex === -1 || nextId === activeProviderId) return

    setDirection(nextIndex - prevIndexRef.current)
    prevIndexRef.current = nextIndex
    setActiveProviderId(nextId)
  }

  function handleSelect(id: ChatModelId) {
    onModelChange(id)
    const nextProviderId = findModel(id).provider.id
    if (nextProviderId !== activeProviderId) {
      setProvider(nextProviderId)
    }
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled) {
          setOpen(false)
          return
        }

        setOpen(nextOpen)
        if (nextOpen) {
          const idx = CHAT_MODEL_PROVIDER_GROUPS.findIndex(
            (entry) => entry.id === selection.provider.id
          )
          prevIndexRef.current = idx
          setDirection(0)
          setActiveProviderId(selection.provider.id)
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type='button'
            disabled={disabled}
            aria-label='Chat model'
            className='inline-flex max-w-full items-center outline-none disabled:pointer-events-none disabled:opacity-50'
          />
        }
      >
        <span className='inline-flex max-w-44 shrink-0 items-center rounded-full px-1.5 py-0 text-muted-foreground hover:text-foreground'>
          <span className='sr-only'>{selection.model.label}</span>
          <ModelChipOdometer modelId={modelId} />
        </span>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        side='top'
        sideOffset={8}
        className='relative isolate w-72 gap-0 overflow-hidden bg-popover/50 p-0 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-[80px] before:backdrop-saturate-[300%] data-closed:duration-50'
      >
        <ProviderTabBar activeProviderId={activeProviderId} onChange={setProvider} />
        <div className='relative h-44 overflow-hidden'>
          <AnimatePresence custom={direction} initial={false} mode='popLayout'>
            <motion.div
              key={activeProviderId}
              custom={direction}
              variants={{
                enter: (d: number) => ({
                  x: reduceMotion ? 0 : d > 0 ? 28 : d < 0 ? -28 : 0,
                  scale: reduceMotion ? 1 : 0.97,
                  opacity: reduceMotion ? 1 : 0,
                }),
                center: {
                  x: 0,
                  scale: 1,
                  opacity: 1,
                  transition: {
                    duration: reduceMotion ? 0 : 0.22,
                    ease: [0.165, 0.84, 0.44, 1],
                  },
                },
                exit: (d: number) => ({
                  x: reduceMotion ? 0 : d > 0 ? -28 : 28,
                  scale: reduceMotion ? 1 : 0.97,
                  opacity: reduceMotion ? 1 : 0,
                  transition: {
                    duration: reduceMotion ? 0 : 0.16,
                    ease: [0.165, 0.84, 0.44, 1],
                  },
                }),
              }}
              initial='enter'
              animate='center'
              exit='exit'
              style={{ willChange: 'transform, opacity' }}
              className='absolute inset-0'
            >
              <ModelList provider={activeProvider} modelId={modelId} onSelect={handleSelect} />
            </motion.div>
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  )
}
