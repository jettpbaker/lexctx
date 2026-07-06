'use client'

import type { ChatUsage } from '~/lib/types/chat'
import type { HydratedCitation, HydratedSourceLink } from '~/lib/types/citations'
import type { ComponentProps } from 'react'

import { useChat } from '@ai-sdk/react'
import { Alert02Icon, ArrowReloadHorizontalIcon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { DefaultChatTransport, getToolName, isToolUIPart, UIMessage } from 'ai'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { Conversation, ConversationContent } from '~/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '~/components/ai-elements/message'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/ai-elements/reasoning'
import { Shimmer } from '~/components/ai-elements/shimmer'
import { ChatComposer } from '~/components/chat/chat_composer'
import {
  CitationChip,
  CitationChipPending,
  citationNotReadyTooltip,
} from '~/components/chat/citation_chip'
import { SourceLinkChip } from '~/components/chat/source_link_chip'
import { ToolStatusRow } from '~/components/chat/tool_status_row'
import { Button } from '~/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '~/components/ui/dialog'
import { getChatUsageById, updateChatModelId } from '~/server/actions/chats'
import { useChatGenerationStore } from '~/hooks/useChatGenerationStore'
import {
  citationIdFromHref,
  isCitationLinkHref,
  parseCitationIdsFromMarkdown,
} from '~/lib/chat/citationLinks'
import { mergeUsageForDisplay } from '~/lib/chat/mergeUsageDisplay'
import { lastUsedChatModelClientCookieString } from '~/lib/chat_model_cookie'
import { hydratedSourceLinkToCitation } from '~/lib/chat/sourceLinkPlayback'
import {
  isCollectionLinkHref,
  isSourceLinkHref,
  parseSourceIdsFromMarkdown,
  sourceIdFromHref,
} from '~/lib/chat/sourceLinks'
import { CHAT_USAGE_KEY, CITATIONS_KEY, SOURCE_LINKS_KEY } from '~/lib/query_keys'
import { isVideoInFlight } from '~/lib/types/citations'
import { getCitationHydrationByIds } from '~/server/actions/getCitationHydrationByIds'
import { getSourceLinkHydrationByIds } from '~/server/actions/getSourceLinkHydrationByIds'
import type { ChatModelId } from '~/server/ai/modelMapping'
import type { LexMessage } from '~/server/chat/store'

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false })

function parseCitationIdsFromMessages(messages: UIMessage[]) {
  const ids: string[] = []

  messages.forEach((message) => {
    message.parts.forEach((part) => {
      if (part.type !== 'text') return
      ids.push(...parseCitationIdsFromMarkdown(part.text))
    })
  })

  return ids
}

function parseSourceLinkIdsFromMessages(messages: UIMessage[]) {
  const ids: string[] = []

  messages.forEach((message) => {
    message.parts.forEach((part) => {
      if (part.type !== 'text') return
      ids.push(...parseSourceIdsFromMarkdown(part.text))
    })
  })

  return ids
}

type MessageLinkContextValue = {
  citationsById: Map<string, HydratedCitation>
  sourceLinksById: Map<string, HydratedSourceLink>
  setSelectedCitation: (citation: HydratedCitation) => void
}

const MessageLinkContext = createContext<MessageLinkContextValue | null>(null)

function MessageResponseLink({ href, children }: ComponentProps<'a'>) {
  const context = useContext(MessageLinkContext)

  if (isCitationLinkHref(href)) {
    const citationId = citationIdFromHref(href)
    const citation = context?.citationsById.get(citationId)

    if (!context || !citation) {
      return (
        <>
          {' '}
          <CitationChipPending />
        </>
      )
    }

    return (
      <>
        {' '}
        <CitationChip citation={citation} onOpen={context.setSelectedCitation} />
      </>
    )
  }

  if (isCollectionLinkHref(href)) {
    return (
      <>
        {' '}
        <SourceLinkChip>{children}</SourceLinkChip>
      </>
    )
  }

  if (isSourceLinkHref(href)) {
    const sourceId = sourceIdFromHref(href)
    const source = context?.sourceLinksById.get(sourceId)
    const hasPlayableVideo = source?.videoStatus === 'ready' && Boolean(source.muxPlaybackId)

    return (
      <>
        {' '}
        <SourceLinkChip
          title={
            hasPlayableVideo
              ? `Open ${source.sourceName}`
              : source
                ? citationNotReadyTooltip(source.videoStatus)
                : undefined
          }
          onClick={
            hasPlayableVideo && context
              ? () => context.setSelectedCitation(hydratedSourceLinkToCitation(source))
              : undefined
          }
        >
          {children}
        </SourceLinkChip>
      </>
    )
  }

  return <a href={href}>{children}</a>
}

const messageResponseComponents = { a: MessageResponseLink }

export default function Chat({
  id,
  initialMessages,
  initialQuery,
  initialModelId,
}: {
  id: string
  initialMessages: LexMessage[]
  initialQuery?: string
  initialModelId: ChatModelId
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [modelId, setModelIdState] = useState(initialModelId)
  const modelIdRef = useRef(modelId)
  modelIdRef.current = modelId

  useEffect(() => {
    setModelIdState(initialModelId)
  }, [id, initialModelId])

  const setModelId = useCallback(
    (nextModelId: ChatModelId) => {
      setModelIdState(nextModelId)
      document.cookie = lastUsedChatModelClientCookieString(nextModelId)
      void updateChatModelId(id, nextModelId)
    },
    [id]
  )
  const [streamingTurnUsage, setStreamingTurnUsage] = useState<ChatUsage | null>(null)
  const hasAppendedQuery = useRef(false)

  const chatUsageQuery = useQuery({
    queryKey: [CHAT_USAGE_KEY, id],
    queryFn: () => getChatUsageById(id),
  })

  const chatUsage = chatUsageQuery.data
  const displayUsage = useMemo(
    () => mergeUsageForDisplay(chatUsage, streamingTurnUsage),
    [chatUsage, streamingTurnUsage]
  )

  const registerGeneration = useChatGenerationStore((state) => state.register)

  const { sendMessage, messages, status, stop, error, regenerate } = useChat<LexMessage>({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ id, messages }) {
        return {
          body: {
            id,
            message: messages.at(-1),
            modelId: modelIdRef.current,
            locale: navigator.languages.at(0) ?? navigator.language,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      },
    }),
    onData: (dataPart) => {
      if (dataPart.type === 'data-usage') {
        setStreamingTurnUsage(dataPart.data as ChatUsage)
      }
    },
    onFinish: async ({ isAbort }) => {
      if (isAbort) {
        setStreamingTurnUsage(null)
        return
      }

      await queryClient.refetchQueries({ queryKey: [CHAT_USAGE_KEY, id] })
      setStreamingTurnUsage(null)
      router.refresh()
    },
    onError: (error) => {
      console.error('Chat stream error', error)
      setStreamingTurnUsage(null)
      toast.error('The response stopped unexpectedly', {
        description: 'Retry to pick up where it left off.',
      })
    },
  })

  useEffect(() => {
    if (status !== 'submitted' && status !== 'streaming') return

    return registerGeneration(id, stop)
  }, [id, registerGeneration, status, stop])

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
  }

  const latestMessage = messages.at(-1)
  const latestAssistantHasVisibleParts =
    latestMessage?.role === 'assistant' && hasVisibleAssistantParts(latestMessage)
  const isWaitingForVisibleAssistantOutput =
    (status === 'submitted' || status === 'streaming') &&
    (latestMessage?.role === 'user' ||
      (latestMessage?.role === 'assistant' && !latestAssistantHasVisibleParts))

  const citationIds = useMemo(
    () => [...new Set(parseCitationIdsFromMessages(messages))].sort(),
    [messages]
  )
  const sourceLinkIds = useMemo(
    () => [...new Set(parseSourceLinkIdsFromMessages(messages))].sort(),
    [messages]
  )

  const hydratedCitationsQuery = useQuery({
    queryKey: [CITATIONS_KEY, citationIds],
    queryFn: () => getCitationHydrationByIds(citationIds),
    enabled: citationIds.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const hasProcessingCitation = (query.state.data ?? []).some((citation) =>
        isVideoInFlight(citation.videoStatus)
      )
      return hasProcessingCitation ? 5000 : false
    },
  })

  const citationsById = useMemo(() => {
    return new Map(
      hydratedCitationsQuery.data?.map((citation) => [citation.citationId, citation]) ?? []
    )
  }, [hydratedCitationsQuery.data])

  const hydratedSourceLinksQuery = useQuery({
    queryKey: [SOURCE_LINKS_KEY, sourceLinkIds],
    queryFn: () => getSourceLinkHydrationByIds(sourceLinkIds),
    enabled: sourceLinkIds.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const hasProcessingSource = (query.state.data ?? []).some((source) =>
        isVideoInFlight(source.videoStatus)
      )
      return hasProcessingSource ? 5000 : false
    },
  })

  const sourceLinksById = useMemo(() => {
    return new Map(
      hydratedSourceLinksQuery.data?.map((source) => [source.sourceId, source]) ?? []
    )
  }, [hydratedSourceLinksQuery.data])

  return (
    <div className='relative flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden pt-[36px]'>
      <Conversation>
        <ConversationContent>
          {messages.length > 0 &&
            messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1
              const isEmptyLatestAssistantMessage =
                (isWaitingForVisibleAssistantOutput || status === 'error') &&
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
                      citationsById={citationsById}
                      sourceLinksById={sourceLinksById}
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

          {status === 'error' && (
            <Message from='assistant'>
              <MessageContent>
                <ChatErrorRow error={error} onRetry={() => regenerate()} />
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>

      <div className='w-full'>
        <ChatComposer
          status={status}
          onSubmit={handleSubmit}
          onStop={stop}
          usage={displayUsage}
          modelId={modelId}
          onModelChange={setModelId}
        />
      </div>
    </div>
  )
}

function ChatErrorRow({ error, onRetry }: { error: Error | undefined; onRetry: () => void }) {
  const detail = error?.message?.trim()

  return (
    <div className='flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-gradient-to-r from-warn/10 to-warn/0 px-3 py-2.5'>
      <HugeiconsIcon
        icon={Alert02Icon}
        strokeWidth={2}
        className='mt-0.5 size-4 shrink-0 text-destructive'
      />
      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <div className='flex flex-col gap-0.5'>
          <p className='text-xs font-medium text-destructive'>Something went wrong</p>
          <p className='text-xs text-muted-foreground'>
            {detail && detail.length > 0 ? detail : 'The response stopped before it finished.'}
          </p>
        </div>
        <div>
          <Button variant='outline' size='sm' onClick={onRetry}>
            <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} />
            Retry
          </Button>
        </div>
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
  citationsById,
  sourceLinksById,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage
  citationsById: Map<string, HydratedCitation>
  sourceLinksById: Map<string, HydratedSourceLink>
  isLastMessage: boolean
  isStreaming: boolean
}) => {
  const [selectedCitation, setSelectedCitation] = useState<HydratedCitation | null>(null)
  const selectedPlaybackId = selectedCitation?.muxPlaybackId
  const selectedBlurDataUrl = selectedCitation?.muxBlurDataUrl
  const selectedBlurAspectRatio = selectedCitation?.muxBlurAspectRatio
  const linkContextValue = useMemo(
    () => ({
      citationsById,
      sourceLinksById,
      setSelectedCitation,
    }),
    [citationsById, sourceLinksById]
  )

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
            <MessageLinkContext.Provider value={linkContextValue} key={`${message.id}-${i}`}>
              <MessageResponse components={messageResponseComponents}>{part.text}</MessageResponse>
            </MessageLinkContext.Provider>
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
          className='max-w-[90vw] border-none bg-transparent p-0 shadow-none sm:max-w-[90vw] data-open:duration-400 data-open:ease-[var(--ease-out-quart)] data-closed:duration-0'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>
            {selectedCitation?.sourceName ?? 'Lecture video'}
          </DialogTitle>

          <DialogClose
            aria-label='Close video'
            className='absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none'
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className='size-4' />
          </DialogClose>

          {selectedPlaybackId && (
            <MuxPlayer
              autoPlay
              preload='auto'
              volume={0.4}
              accentColor='var(--color-success)'
              primaryColor='oklch(0.985 0 0)'
              secondaryColor='oklch(0 0 0 / 0.5)'
              title={selectedCitation?.sourceName}
              className='lex-mux-player aspect-video w-[90vw] overflow-hidden rounded-lg'
              playbackId={selectedPlaybackId}
              placeholder={selectedBlurDataUrl ?? undefined}
              startTime={selectedCitation?.startSeconds}
              style={selectedBlurAspectRatio ? { aspectRatio: selectedBlurAspectRatio } : undefined}
              thumbnailTime={selectedCitation?.startSeconds}
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
