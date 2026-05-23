'use client'

import type { ChatStatus } from 'ai'
import type { ChatUsage, PersistedChatUsage } from '~/lib/types/chat'

import { Add01Icon, ArrowUp02Icon, Folder01Icon, PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Spinner } from '~/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import {
  createMentionPill,
  getCursorPosition,
  getOffsetRect,
  parseComposerFromDom,
  renderComposerEditor,
  setCursorPosition,
  setRangeEdge,
} from '~/lib/chat/composerDom'
import {
  DEFAULT_COMPOSER_PARTS,
  type ComposerPart,
  type MentionOption,
  createMentionPart,
  filterMentionOptions,
  getAtMentionContext,
  isComposerEmpty,
  partsToDisplayText,
  serializeComposerForModel,
} from '~/lib/chat/sourceMentions'
import { cn } from '~/lib/utils'
import {
  CHAT_MODEL_IDS,
  getChatModelConfig,
  type ChatModelId,
} from '~/server/ai/modelMapping'
import { useMentionSourceOptions } from '~/hooks/useMentionSourceOptions'

import { Context, ContextTrigger } from '../ai-elements/context'

type ChatComposerProps = {
  status: ChatStatus
  isSubmitPending?: boolean
  usage?: ChatUsage | PersistedChatUsage | null
  displayUsage?: boolean
  modelId: ChatModelId
  onModelChange: (modelId: ChatModelId) => void
  placeholder?: string
  onSubmit: (modelText: string) => void
  onStop?: () => void
}

export function ChatComposer({
  status,
  isSubmitPending = false,
  placeholder = 'Send follow up',
  usage,
  displayUsage = true,
  modelId,
  onModelChange,
  onChange,
  onSubmit,
  onStop,
}: ChatComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mirrorInputRef = useRef(false)
  const [parts, setParts] = useState<ComposerPart[]>(DEFAULT_COMPOSER_PARTS)
  const [cursor, setCursor] = useState(0)
  const [isComposing, setIsComposing] = useState(false)
  const [hasMultipleInputLines, setHasMultipleInputLines] = useState(false)
  const [mentionContext, setMentionContext] = useState<{ query: string; atOffset: number } | null>(
    null
  )
  const [mentionAnchor, setMentionAnchor] = useState<DOMRect | null>(null)
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const showMentionPopover = mentionContext !== null
  const { options: mentionOptionsList, isLoading: mentionSourcesLoading } =
    useMentionSourceOptions(showMentionPopover)

  const mentionOptions = filterMentionOptions(mentionOptionsList, mentionContext?.query ?? '')

  const isBusy = isSubmitPending || status === 'submitted' || status === 'streaming'
  const modelText = serializeComposerForModel(parts)
  const canSubmit = modelText.trim().length > 0 && !isBusy
  const canStop = status === 'submitted' || status === 'streaming'
  const isEmpty = isComposerEmpty(parts)
  const multipleInputLines = !isEmpty && hasMultipleInputLines

  useLayoutEffect(() => {
    if (!showMentionPopover) return
    setActiveMentionIndex(0)
  }, [mentionContext?.query, showMentionPopover])

  const updateMentionAnchor = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !mentionContext) {
      setMentionAnchor(null)
      return
    }

    setMentionAnchor(getOffsetRect(editor, mentionContext.atOffset))
  }, [mentionContext])

  useLayoutEffect(() => {
    updateMentionAnchor()
  }, [updateMentionAnchor, parts, cursor])

  useEffect(() => {
    if (!mentionContext) return

    const editor = editorRef.current
    const scroll = scrollRef.current
    if (!editor || !scroll) return

    const handleReposition = () => updateMentionAnchor()
    scroll.addEventListener('scroll', handleReposition, { passive: true })
    window.addEventListener('resize', handleReposition)

    return () => {
      scroll.removeEventListener('scroll', handleReposition)
      window.removeEventListener('resize', handleReposition)
    }
  }, [mentionContext, updateMentionAnchor])

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    if (mirrorInputRef.current) {
      mirrorInputRef.current = false
      return
    }

    renderComposerEditor(editor, parts)
    setCursorPosition(editor, cursor)
  }, [parts, cursor])

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    editor.style.height = 'auto'
    const styles = window.getComputedStyle(editor)
    const lineHeight = Number.parseFloat(styles.lineHeight)
    const paddingY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
    const singleLineHeight = Number.isFinite(lineHeight)
      ? lineHeight + paddingY
      : editor.clientHeight

    setHasMultipleInputLines(editor.scrollHeight > singleLineHeight + 1)
    editor.style.height = `${editor.scrollHeight}px`
  }, [parts])

  const syncMentionFromCursor = useCallback(() => {
    if (isComposing) return

    const editor = editorRef.current
    if (!editor) return

    const selection = window.getSelection()
    if (!selection?.anchorNode || !editor.contains(selection.anchorNode)) return

    const nextCursor = getCursorPosition(editor)
    const flatText = partsToDisplayText(parseComposerFromDom(editor))
    const context = getAtMentionContext(flatText.slice(0, nextCursor))
    setCursor(nextCursor)
    setMentionContext(context)
  }, [isComposing])

  const syncFromDom = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    const nextParts = parseComposerFromDom(editor)
    const nextCursor = getCursorPosition(editor)
    const flatText = partsToDisplayText(nextParts)
    const context = getAtMentionContext(flatText.slice(0, nextCursor))

    mirrorInputRef.current = true
    setParts(nextParts)
    setCursor(nextCursor)
    setMentionContext(context)
  }, [])

  const insertMention = useCallback(
    (option: MentionOption) => {
      const editor = editorRef.current
      if (!editor) return

      const mention = createMentionPart(option)
      const selection = window.getSelection()
      if (!selection) return

      if (selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
        editor.focus()
        setCursorPosition(editor, cursor)
      }

      if (selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (!editor.contains(range.startContainer)) return

      const cursorPosition = getCursorPosition(editor)
      const flatText = partsToDisplayText(parseComposerFromDom(editor))
      const atMatch = flatText.slice(0, cursorPosition).match(/@(\S*)$/)
      const pill = createMentionPill(mention)
      const gap = document.createTextNode(' ')

      if (atMatch) {
        const start = atMatch.index ?? cursorPosition - atMatch[0].length
        setRangeEdge(editor, range, 'start', start)
        setRangeEdge(editor, range, 'end', cursorPosition)
      }

      range.deleteContents()
      range.insertNode(gap)
      range.insertNode(pill)
      range.setStartAfter(gap)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)

      syncFromDom()
    },
    [cursor, syncFromDom]
  )

  const submit = useCallback(() => {
    if (!canSubmit) return
    onSubmit(modelText.trim())
    mirrorInputRef.current = true
    setParts(DEFAULT_COMPOSER_PARTS)
    setCursor(0)
    setMentionContext(null)
    editorRef.current?.replaceChildren()
  }, [canSubmit, modelText, onSubmit])

  const maxContextTokens = getChatModelConfig(modelId).maxContextTokens
  const contextInputTokens = usage?.contextInputTokens ?? 0
  const usedContextPercent = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(contextInputTokens / maxContextTokens)
  const price = ((usage?.totalCostMicroUsd ?? 0) / 1_000_000).toFixed(2).padStart(5, '0')
  const [d1, d2, , d3, d4] = price

  return (
    <div className='mx-auto w-full max-w-(--conversation-width) px-9'>
      <form
        className={cn(
          'relative border border-border bg-card',
          multipleInputLines ? 'rounded-2xl' : 'rounded-full'
        )}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {showMentionPopover && mentionAnchor ? (
          <SourceMentionPopover
            activeIndex={activeMentionIndex}
            anchor={mentionAnchor}
            isLoading={mentionSourcesLoading}
            options={mentionOptions}
            onHover={setActiveMentionIndex}
            onSelect={insertMention}
          />
        ) : null}

        <div
          className={cn(
            'flex min-h-8 gap-2',
            multipleInputLines
              ? 'flex-col items-stretch justify-start px-2.5 py-2.5'
              : 'flex-row items-center justify-center px-2 py-2 pl-2'
          )}
        >
          {!multipleInputLines && (
            <ChatModelSelect
              modelId={modelId}
              onModelChange={onModelChange}
              disabled={isBusy}
            />
          )}

          <div
            className={cn('relative min-w-0', multipleInputLines ? 'flex-none pr-9' : 'flex-1')}
            ref={scrollRef}
          >
            <div
              ref={editorRef}
              role='textbox'
              aria-multiline='true'
              aria-label={placeholder}
              contentEditable={!isBusy}
              suppressContentEditableWarning
              spellCheck
              onMouseDown={(event) => {
                const removeButton = (event.target as HTMLElement).closest('[data-mention-remove]')
                if (!removeButton) return

                event.preventDefault()
                removeButton.closest('[data-type="mention"]')?.remove()
                syncFromDom()
              }}
              onInput={() => {
                if (isComposing) return
                syncFromDom()
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => {
                setIsComposing(false)
                syncFromDom()
              }}
              onMouseUp={() => syncMentionFromCursor()}
              onKeyUp={(event) => {
                if (isComposing) return
                if (showMentionPopover && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                  return
                }
                if (
                  event.key === 'ArrowLeft' ||
                  event.key === 'ArrowRight' ||
                  event.key === 'ArrowUp' ||
                  event.key === 'ArrowDown' ||
                  event.key === 'Home' ||
                  event.key === 'End'
                ) {
                  syncMentionFromCursor()
                }
              }}
              onKeyDown={(event) => {
                if (showMentionPopover) {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    if (mentionOptions.length > 0) {
                      setActiveMentionIndex((index) =>
                        Math.min(index + 1, mentionOptions.length - 1)
                      )
                    }
                    return
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    if (mentionOptions.length > 0) {
                      setActiveMentionIndex((index) => Math.max(index - 1, 0))
                    }
                    return
                  }
                  if (event.key === 'Enter' || event.key === 'Tab') {
                    const source = mentionOptions[activeMentionIndex]
                    if (source) {
                      event.preventDefault()
                      insertMention(source)
                      return
                    }
                    if (event.key === 'Tab') return
                  }
                }

                if (event.key !== 'Enter') return
                if (event.shiftKey || isComposing || event.nativeEvent.isComposing) return

                event.preventDefault()
                submit()
              }}
              className={cn(
                'block max-h-32 min-h-4 w-full cursor-text overflow-y-auto border-none bg-transparent text-sm text-foreground outline-none',
                '[&_[data-type=mention]]:max-w-[12rem] [&_[data-mention-label]]:cursor-default [&_[data-mention-label]]:truncate'
              )}
            />
            {isEmpty && (
              <div className='pointer-events-none absolute inset-0 text-sm text-muted-foreground'>
                {placeholder}
              </div>
            )}
          </div>

          {!multipleInputLines && (
            <ComposerActionButton
              canSubmit={canSubmit}
              canStop={canStop}
              isSubmitPending={isSubmitPending}
              onStop={onStop}
            />
          )}

          {multipleInputLines && (
            <div className='flex w-full items-center justify-between gap-2'>
              <ChatModelSelect
                modelId={modelId}
                onModelChange={onModelChange}
                disabled={isBusy}
              />

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

      {displayUsage ? (
        <div className='flex min-h-[35px] items-center justify-between px-2 py-2 text-xs text-muted-foreground'>
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
            <Context maxTokens={maxContextTokens} usedTokens={contextInputTokens}>
              <Tooltip>
                <TooltipTrigger render={<ContextTrigger />} />
                <TooltipContent>{usedContextPercent} context used</TooltipContent>
              </Tooltip>
            </Context>
          </div>
        </div>
      ) : null}
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
