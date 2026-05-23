'use client'

import type { LexMessage } from '~/app/api/chat/route'
import type { ChatUsage } from '~/lib/types/chat'
import type { HydratedCitation, HydratedSourceLink } from '~/lib/types/citations'

import { useChat } from '@ai-sdk/react'
import MuxPlayer from '@mux/mux-player-react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { DefaultChatTransport, getToolName, isToolUIPart, UIMessage } from 'ai'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Conversation, ConversationContent } from '~/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '~/components/ai-elements/message'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/ai-elements/reasoning'
import { Shimmer } from '~/components/ai-elements/shimmer'
import { ChatComposer } from '~/components/chat/chat_composer'
import { CitationChip, CitationChipPending, citationNotReadyTooltip } from '~/components/chat/citation_chip'
import { SourceLinkChip } from '~/components/chat/source_link_chip'
import { ToolStatusRow } from '~/components/chat/tool_status_row'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import { getChatUsageById, updateChatModelId } from '~/server/actions/chats'
import { useChatGenerationStore } from '~/hooks/useChatGenerationStore'
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
import { getCitationHydrationByIds } from '~/server/actions/getCitationHydrationByIds'
import { getSourceLinkHydrationByIds } from '~/server/actions/getSourceLinkHydrationByIds'
import type { ChatModelId } from '~/server/ai/modelMapping'

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

  const { sendMessage, messages, status, stop } = useChat<LexMessage>({
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

  const citationIds = [...new Set(parseCitationIdsFromMessages(messages))].sort()
  const sourceLinkIds = [...new Set(parseSourceLinkIdsFromMessages(messages))].sort()

  const hydratedCitationsQuery = useQuery({
    queryKey: [CITATIONS_KEY, citationIds],
    queryFn: () => getCitationHydrationByIds(citationIds),
    enabled: citationIds.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const hasProcessingCitation = (query.state.data ?? []).some(
        (citation) =>
          citation.videoStatus === 'pending_upload' ||
          citation.videoStatus === 'uploading' ||
          citation.videoStatus === 'processing'
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
      const hasProcessingSource = (query.state.data ?? []).some(
        (source) =>
          source.videoStatus === 'pending_upload' ||
          source.videoStatus === 'uploading' ||
          source.videoStatus === 'processing'
      )
      return hasProcessingSource ? 5000 : false
    },
  })

  const sourceLinksById = useMemo(() => {
    return new Map(
      hydratedSourceLinksQuery.data?.map((source) => [source.sourceId, source]) ?? []
    )
  }, [hydratedSourceLinksQuery.data])

  function parseCitationIdsFromMessages(messages: UIMessage[]) {
    const ids: string[] = []
    const citationHrefRegex = /\]\(#citation-([^)]+)\)/g

    messages.forEach((message) => {
      message.parts.forEach((part) => {
        if (part.type !== 'text') return

        for (const match of part.text.matchAll(citationHrefRegex)) {
          ids.push(match[1])
        }
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

  return (
    <div className='relative flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden pt-[36px]'>
      <Conversation>
        <ConversationContent>
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
                      citationsById={citationsById}
                      sourceLinksById={sourceLinksById}
                      citationHydrationUpdatedAt={hydratedCitationsQuery.dataUpdatedAt}
                      sourceLinkHydrationUpdatedAt={hydratedSourceLinksQuery.dataUpdatedAt}
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
  citationHydrationUpdatedAt,
  sourceLinkHydrationUpdatedAt,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage
  citationsById: Map<string, HydratedCitation>
  sourceLinksById: Map<string, HydratedSourceLink>
  citationHydrationUpdatedAt: number
  sourceLinkHydrationUpdatedAt: number
  isLastMessage: boolean
  isStreaming: boolean
}) => {
  const [selectedCitation, setSelectedCitation] = useState<HydratedCitation | null>(null)
  const selectedPlaybackId = selectedCitation?.muxPlaybackId
  const selectedBlurDataUrl = selectedCitation?.muxBlurDataUrl
  const selectedBlurAspectRatio = selectedCitation?.muxBlurAspectRatio

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
              key={`${message.id}-${i}-${citationHydrationUpdatedAt}-${sourceLinkHydrationUpdatedAt}`}
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith('#citation-')) {
                    const citationId = href.replace('#citation-', '')
                    const citation = citationsById.get(citationId)

                    if (!citation) {
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
                        <CitationChip citation={citation} onOpen={setSelectedCitation} />
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
                    const source = sourceLinksById.get(sourceId)
                    const hasPlayableVideo =
                      source?.videoStatus === 'ready' && Boolean(source.muxPlaybackId)

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
                            hasPlayableVideo
                              ? () => setSelectedCitation(hydratedSourceLinkToCitation(source))
                              : undefined
                          }
                        >
                          {children}
                        </SourceLinkChip>
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
          className='max-w-[90vw] border-none bg-transparent p-0 shadow-none sm:max-w-[90vw] data-open:duration-400 data-open:ease-[var(--ease-out-quart)] data-closed:duration-0'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>
            {selectedCitation?.sourceName ?? 'Lecture video'}
          </DialogTitle>

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
