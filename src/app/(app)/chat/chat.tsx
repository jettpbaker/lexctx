'use client'

import type { LexMessage } from '~/app/api/chat/route'
import type { GenerationStatusType } from '~/db/schema'

import { HOME_SUBMIT_AT_SESSION_KEY } from '~/app/(app)/start-chat-form'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function Chat({
  id,
  initialMessages,
  generationStatus,
}: {
  id: string
  initialMessages?: LexMessage[]
  generationStatus: GenerationStatusType
}) {
  const [input, setInput] = useState('')
  const [submitToOwnMessageMs, setSubmitToOwnMessageMs] = useState<number | null>(null)
  const [homeSubmitToVisibleMs, setHomeSubmitToVisibleMs] = useState<number | null>(null)
  const didAutoSubmitRef = useRef(false)
  const pendingSubmitStartedAtRef = useRef<number | null>(null)
  const pendingSubmittedTextRef = useRef<string | null>(null)
  const homeLatencyMeasuredRef = useRef(false)

  const { sendMessage, messages, status } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ id, messages }) {
        return { body: { id, message: messages.at(-1) } }
      },
    }),
  })

  const isGenerating = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (pendingSubmitStartedAtRef.current === null || pendingSubmittedTextRef.current === null) {
      return
    }

    const pendingText = pendingSubmittedTextRef.current
    const last = messages.at(-1)
    if (last?.role !== 'user') return

    const textPart = last.parts.find((part) => part.type === 'text')
    if (!textPart || textPart.text !== pendingText) return

    const elapsedMs = Math.round(performance.now() - pendingSubmitStartedAtRef.current)
    setSubmitToOwnMessageMs(elapsedMs)
    pendingSubmitStartedAtRef.current = null
    pendingSubmittedTextRef.current = null
  }, [messages])

  useEffect(() => {
    if (status !== 'error') return
    if (pendingSubmitStartedAtRef.current === null) return
    pendingSubmitStartedAtRef.current = null
    pendingSubmittedTextRef.current = null
  }, [status])

  useEffect(() => {
    if (generationStatus !== 'submitted' || status !== 'ready') return

    const previousMessage = initialMessages?.at(-1)
    if (previousMessage?.role !== 'user') return
    if (didAutoSubmitRef.current) {
      return
    }

    didAutoSubmitRef.current = true
    void sendMessage()
  }, [generationStatus, initialMessages, id, sendMessage, status])

  useLayoutEffect(() => {
    if (homeLatencyMeasuredRef.current) return

    const raw = sessionStorage.getItem(HOME_SUBMIT_AT_SESSION_KEY)
    if (!raw) return

    const startMs = Number(raw)
    if (Number.isNaN(startMs)) {
      sessionStorage.removeItem(HOME_SUBMIT_AT_SESSION_KEY)
      return
    }

    const lastInit = initialMessages?.at(-1)
    const looksLikeHomeSeed =
      generationStatus === 'submitted' &&
      initialMessages?.length === 1 &&
      lastInit?.role === 'user'

    if (!looksLikeHomeSeed) {
      sessionStorage.removeItem(HOME_SUBMIT_AT_SESSION_KEY)
      return
    }

    sessionStorage.removeItem(HOME_SUBMIT_AT_SESSION_KEY)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHomeSubmitToVisibleMs(Date.now() - startMs)
        homeLatencyMeasuredRef.current = true
      })
    })
  }, [generationStatus, initialMessages])

  return (
    <div className='stretch mx-auto flex w-full max-w-md flex-col py-24'>
      <h1 className='text-lg font-medium text-foreground/90'>ScratchChat: {id}</h1>
      {homeSubmitToVisibleMs !== null ? (
        <p className='text-xs text-muted-foreground'>
          Home submit → your message visible ~ {(homeSubmitToVisibleMs / 1000).toFixed(2)}s
        </p>
      ) : null}
      {submitToOwnMessageMs !== null ? (
        <p className='text-xs text-muted-foreground'>
          Submit → your message visible: {(submitToOwnMessageMs / 1000).toFixed(2)}s
        </p>
      ) : null}
      <div className='stretch mx-auto flex w-full max-w-md flex-col py-24'>
        {messages.map((message) => (
          <div key={message.id} className='whitespace-pre-wrap'>
            {message.role === 'user' ? 'User: ' : 'AI: '}
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return <div key={`${message.id}-${i}`}>{part.text}</div>
                case 'tool-weather':
                case 'tool-convertFahrenheitToCelsius':
                  return <pre key={`${message.id}-${i}`}>{JSON.stringify(part, null, 2)}</pre>
              }
            })}
          </div>
        ))}

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (isGenerating) return
            const text = input.trim()
            if (text === '') return

            pendingSubmitStartedAtRef.current = performance.now()
            pendingSubmittedTextRef.current = text
            setSubmitToOwnMessageMs(null)
            sendMessage({ text })
            setInput('')
          }}
        >
          <input
            className='fixed bottom-0 mb-8 w-full max-w-md rounded border border-zinc-300 p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900'
            value={input}
            placeholder='Say something...'
            onChange={(e) => setInput(e.currentTarget.value)}
          />
        </form>
      </div>
    </div>
  )
}
