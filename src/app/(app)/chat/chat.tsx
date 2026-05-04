'use client'

import type { LexMessage } from '~/app/api/chat/route'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '~/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '~/components/ai-elements/message'
import { ChatComposer } from '~/components/chatComposer'

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
  const [text, setText] = useState('')
  const hasAppendedQuery = useRef(false)

  const { sendMessage, messages, status } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ id, messages }) {
        return { body: { id, message: messages.at(-1) } }
      },
    }),
    onFinish() {
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
            messages.map(({ role, parts }, index) => (
              <Message from={role} key={index}>
                <MessageContent>
                  {parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return <MessageResponse key={`${role}-${i}`}>{part.text}</MessageResponse>
                      case 'tool-webSearch':
                        if (part.state === 'input-streaming' || part.state === 'input-available') {
                          return <span key={`${role}-${i}`}>Searching the web...</span>
                        }

                        if (part.state === 'output-available') {
                          return <span key={`${role}-${i}`}> Searched the web</span>
                        }
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
        </ConversationContent>
      </Conversation>

      <div className='m-auto w-full max-w-(--conversation-width) px-[36px]'>
        <ChatComposer value={text} status={status} onChange={setText} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
