'use client'

import type { LexMessage } from '~/app/api/chat/route'
import type { LectureChunkSearchResult } from '~/server/actions/searchSources'

import { useChat } from '@ai-sdk/react'
import { PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import MuxPlayer from '@mux/mux-player-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DefaultChatTransport, getToolName, isToolUIPart, UIMessage } from 'ai'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '~/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '~/components/ai-elements/message'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/ai-elements/reasoning'
import { Shimmer } from '~/components/ai-elements/shimmer'
import { ChatComposer } from '~/components/chat/chat_composer'
import { ToolStatusRow } from '~/components/chat/tool_status_row'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { CHAT_USAGE_KEY } from '~/lib/query_keys'
import { getChatUsageById } from '~/server/actions/sources'

export default function Chat({
  id,
  initialMessages,
  initialQuery,
}: {
  id: string
  initialMessages: LexMessage[]
  initialQuery?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const hasAppendedQuery = useRef(false)

  const chatUsageQuery = useQuery({
    queryKey: [CHAT_USAGE_KEY, id],
    queryFn: () => getChatUsageById(id),
  })

  const chatUsage = chatUsageQuery.data

  const { sendMessage, messages, status } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ id, messages }) {
        return {
          body: {
            id,
            message: messages.at(-1),
            locale: navigator.languages.at(0) ?? navigator.language,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      },
    }),
    onFinish() {
      queryClient.invalidateQueries({ queryKey: [CHAT_USAGE_KEY, id] })
      router.refresh()
    },
  })

  useEffect(() => {
    if (hasAppendedQuery.current) return
    if (status === 'submitted' || status === 'streaming') return
    if (!initialQuery) return

    sendMessage({ text: initialQuery })
    hasAppendedQuery.current = true
    window.history.replaceState({}, '', `/chat/${id}`)
  }, [initialQuery, sendMessage, status, id])

  function handleSubmit(text: string) {
    if (!text) return
    if (status === 'submitted' || status === 'streaming') return

    sendMessage({ text })
    setText('')
  }

  const latestMessage = messages.at(-1)
  const latestAssistantHasVisibleParts =
    latestMessage?.role === 'assistant' && hasVisibleAssistantParts(latestMessage)
  const isWaitingForVisibleAssistantOutput =
    (status === 'submitted' || status === 'streaming') &&
    (latestMessage?.role === 'user' ||
      (latestMessage?.role === 'assistant' && !latestAssistantHasVisibleParts))

  return (
    <div className='relative flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden pt-[36px]'>
      <Conversation>
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState
              title='Start a conversation'
              description='Type a message below to begin chatting'
            />
          )}
          {messages.length > 0 &&
            messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1
              const isEmptyLatestAssistantMessage =
                isWaitingForVisibleAssistantOutput &&
                isLastMessage &&
                message.role === 'assistant' &&
                !hasVisibleAssistantParts(message)

              if (isEmptyLatestAssistantMessage) {
                return null
              }

              return (
                <Message from={message.role} key={index}>
                  <MessageContent>
                    <MessageParts
                      message={message}
                      isLastMessage={isLastMessage}
                      isStreaming={status === 'streaming'}
                    />
                  </MessageContent>
                </Message>
              )
            })}

          {isWaitingForVisibleAssistantOutput && (
            <Message from='assistant'>
              <MessageContent>
                <Shimmer
                  color='var(--color-muted-foreground)'
                  shimmerColor='var(--color-foreground)'
                  duration={1.25}
                  spread={2}
                >
                  Planning next steps
                </Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>

      <div className='w-full'>
        <ChatComposer
          value={text}
          status={status}
          onChange={setText}
          onSubmit={handleSubmit}
          usage={chatUsage}
        />
      </div>
    </div>
  )
}

function hasVisibleAssistantParts(message: UIMessage) {
  return message.parts.some((part) => {
    if (part.type === 'text' || part.type === 'reasoning') {
      return part.text.trim().length > 0
    }
    return isToolUIPart(part)
  })
}

const MessageParts = ({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage
  isLastMessage: boolean
  isStreaming: boolean
}) => {
  const [selectedCitation, setSelectedCitation] = useState<LectureChunkSearchResult | null>(null)

  function getCitationSources(message: UIMessage) {
    const sources = new Map<string, LectureChunkSearchResult>()

    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue
      if (part.state !== 'output-available') continue
      if (getToolName(part) !== 'sourceSearch') continue

      const output = part.output as {
        results?: LectureChunkSearchResult[]
      }

      for (const result of output.results ?? []) {
        sources.set(result.citationId, result)
      }
    }

    return sources
  }

  const citationSources = getCitationSources(message)

  const selectedPlaybackId = selectedCitation?.metadata.muxPlaybackId

  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === 'reasoning') {
          const prev = message.parts[i - 1]
          if (prev?.type === 'reasoning') return null

          const runTexts: string[] = []
          let runPartCount = 0
          for (let j = i; j < message.parts.length; j++) {
            const next = message.parts[j]
            if (next.type !== 'reasoning') break
            runPartCount++
            const text = next.text.trim()
            if (text.length > 0) {
              runTexts.push(text)
            }
          }

          if (runTexts.length === 0) return null

          const runEndsAtLastPart = i + runPartCount === message.parts.length
          const isThisRunStreaming = isLastMessage && isStreaming && runEndsAtLastPart

          return (
            <Reasoning
              key={`${message.id}-${i}`}
              className='w-full'
              isStreaming={isThisRunStreaming}
            >
              <ReasoningTrigger />
              <ReasoningContent>{runTexts.join('\n\n')}</ReasoningContent>
            </Reasoning>
          )
        }

        if (isToolUIPart(part)) {
          return <ToolPart key={`${message.id}-${i}`} part={part} />
        }

        if (part.type === 'text') {
          return (
            <MessageResponse
              key={`${message.id}-${i}`}
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith('#citation-')) {
                    const citationId = href.replace('#citation-', '')
                    const citation = citationSources.get(citationId)

                    if (!citation) {
                      return <span>{children}</span>
                    }

                    return (
                      <>
                        {' '}
                        <CitationChip citation={citation} onOpen={setSelectedCitation} />
                      </>
                    )
                  }

                  return <a href={href}>{children}</a>
                },
              }}
            >
              {part.text}
            </MessageResponse>
          )
        }

        return null
      })}

      <Dialog
        open={selectedCitation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCitation(null)
          }
        }}
      >
        <DialogContent
          className='max-w-[90vw] border-none bg-transparent p-0 shadow-none sm:max-w-[90vw]'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>
            {selectedCitation?.metadata.sourceName ?? 'Lecture video'}
          </DialogTitle>

          {selectedPlaybackId && (
            <MuxPlayer
              autoPlay
              preload='auto'
              volume={0.4}
              accentColor='var(--color-success)'
              primaryColor='oklch(0.985 0 0)'
              secondaryColor='oklch(0 0 0 / 0.5)'
              title={selectedCitation?.metadata.sourceName}
              className='lex-mux-player aspect-video w-[90vw] overflow-hidden rounded-lg'
              playbackId={selectedPlaybackId}
              startTime={selectedCitation?.metadata.startSeconds}
              thumbnailTime={selectedCitation?.metadata.startSeconds}
              streamType='on-demand'
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

const ToolPart = ({ part }: { part: UIMessage['parts'][number] }) => {
  if (!isToolUIPart(part)) return null

  const toolName = getToolName(part)
  const isInFlight =
    part.state === 'input-streaming' ||
    part.state === 'input-available' ||
    part.state === 'approval-requested' ||
    part.state === 'approval-responded'

  const status = part.state === 'output-error' ? 'error' : isInFlight ? 'in-flight' : 'completed'

  return <ToolStatusRow toolName={toolName} status={status} />
}

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

function citationNotReadyTooltip(status: LectureChunkSearchResult['metadata']['videoStatus']) {
  switch (status) {
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

function CitationChip({
  citation,
  onOpen,
}: {
  citation: LectureChunkSearchResult
  onOpen: (citation: LectureChunkSearchResult) => void
}) {
  const startTime = citation.metadata.startSeconds ?? 0
  const hasPlayableVideo =
    citation.metadata.videoStatus === 'ready' && Boolean(citation.metadata.muxPlaybackId)

  const chipButton = (
    <button
      type='button'
      disabled={!hasPlayableVideo}
      title={
        hasPlayableVideo
          ? `Open ${citation.metadata.sourceName} at ${formatTimestamp(startTime)}`
          : undefined
      }
      onClick={() => onOpen(citation)}
      className='inline-flex h-[1lh] max-w-[15ch] cursor-pointer items-center gap-1 rounded-sm bg-citation/15 px-1.5 align-middle leading-[inherit] text-citation transition-colors [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] hover:bg-citation/25 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted'
    >
      <HugeiconsIcon icon={PlayIcon} strokeWidth={2.25} className='size-[1em] shrink-0' />
      <span className='min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,black_calc(100%-1em),transparent)] whitespace-nowrap'>
        {citation.metadata.sourceName}
      </span>
    </button>
  )

  if (hasPlayableVideo) return chipButton

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className='inline-flex max-w-[15ch] cursor-not-allowed align-middle' />}
      >
        {chipButton}
      </TooltipTrigger>
      <TooltipContent>{citationNotReadyTooltip(citation.metadata.videoStatus)}</TooltipContent>
    </Tooltip>
  )
}
