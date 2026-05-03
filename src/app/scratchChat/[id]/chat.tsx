'use client'

import type { ScratchMessage } from '~/app/api/scratchChat/route'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'

export default function Chat({
  id,
  initialMessages,
}: {
  id: string
  initialMessages?: ScratchMessage[]
}) {
  const [input, setInput] = useState('')
  const { sendMessage, messages } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/scratchChat',
      prepareSendMessagesRequest({ id, messages }) {
        return { body: { id, message: messages.at(-1) } }
      },
    }),
  })

  return (
    <div className='stretch mx-auto flex w-full max-w-md flex-col py-24'>
      <h1 className='text-lg font-medium text-foreground/90'>ScratchChat: {id}</h1>
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
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage({ text: input })
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
