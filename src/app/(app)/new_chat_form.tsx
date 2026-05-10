'use client'

import { useQueryClient } from '@tanstack/react-query'
import { generateId } from 'ai'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ChatComposer } from '~/components/chat/chat_composer'
import { CHATS_KEY } from '~/lib/query_keys'
import { generateChatTitle } from '~/server/actions/generateChatTitle'
import { ChatType } from '~/server/actions/sources'

export type ChatSidebarItem = ChatType & {
  titleLoading: boolean
}

export default function NewChatForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (query: string) => {
    const chatId = generateId()

    queryClient.setQueryData<ChatSidebarItem[]>([CHATS_KEY], (current) => [
      { id: chatId, title: 'New chat', titleLoading: true },
      ...(current ?? []),
    ])

    void generateChatTitle(chatId, query)
      .then((title) => {
        queryClient.setQueryData<ChatSidebarItem[]>([CHATS_KEY], (current = []) =>
          current.map((chat) =>
            chat.id === chatId ? { ...chat, title, titleLoading: false } : chat
          )
        )
      })
      .catch(() => {
        queryClient.setQueryData<ChatSidebarItem[]>([CHATS_KEY], (current = []) =>
          current.map((chat) => (chat.id === chatId ? { ...chat, titleLoading: false } : chat))
        )
      })

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
