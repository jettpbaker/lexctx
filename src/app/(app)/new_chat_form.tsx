'use client'

import { generateId } from 'ai'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ChatComposer } from '~/components/chat/chat_composer'

export default function NewChatForm() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (query: string) => {
    const chatId = generateId()
    const params = new URLSearchParams({ query })
    startTransition(() => {
      router.push(`/chat/${chatId}?${params.toString()}`)
    })
  }

  return (
    <ChatComposer
      value={message}
      status='ready'
      isSubmitPending={isPending}
      placeholder='Enter your message'
      onChange={setMessage}
      onSubmit={handleSubmit}
      displayUsage={false}
    />
  )
}
