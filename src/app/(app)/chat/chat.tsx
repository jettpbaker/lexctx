'use client'

import type { LexMessage } from '~/app/api/chat/route'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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
  const [input, setInput] = useState('')
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

  return (
    <div className='stretch mx-auto flex w-full max-w-md flex-col py-24'>
      <h1 className='text-lg font-medium text-foreground/90'>Chat: {id}</h1>
      <div className='stretch mx-auto flex w-full max-w-md flex-col py-24'>
        {messages.map((message) => (
          <div key={message.id} className='whitespace-pre-wrap'>
            {message.role === 'user' ? 'User: ' : 'AI: '}
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return (
                    <div
                      key={`${message.id}-${i}`}
                      style={{ color: '#1a8cff' }} // blue-ish for 'text'
                    >
                      {part.text}
                    </div>
                  )
                case 'reasoning':
                  return (
                    <div
                      key={`${message.id}-${i}`}
                      style={{ color: '#878a00' }} // olive for 'reasoning'
                    >
                      {part.text}
                    </div>
                  )
                case 'tool-weather':
                  return (
                    <pre
                      key={`${message.id}-${i}`}
                      style={{ color: '#00af54' }} // green for 'tool-weather'
                    >
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  )
                case 'tool-convertFahrenheitToCelsius':
                  return (
                    <pre
                      key={`${message.id}-${i}`}
                      style={{ color: '#cf46b2' }} // magenta for 'tool-convertFahrenheitToCelsius'
                    >
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  )
              }
            })}
          </div>
        ))}

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (status === 'submitted' || status === 'streaming') return
            const text = input.trim()
            if (text === '') return

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
