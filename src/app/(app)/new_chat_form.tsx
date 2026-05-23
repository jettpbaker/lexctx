'use client'

import type { ChatSidebarItem } from '~/lib/types/chat'

import { useQueryClient } from '@tanstack/react-query'
import { generateId } from 'ai'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { ChatComposer } from '~/components/chat/chat_composer'
import { lastUsedChatModelClientCookieString } from '~/lib/chat_model_cookie'
import { CHATS_KEY } from '~/lib/query_keys'
import { generateChatTitle } from '~/server/actions/generateChatTitle'
import type { ChatModelId } from '~/server/ai/modelMapping'

export default function NewChatForm({ initialModelId }: { initialModelId: ChatModelId }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [modelId, setModelIdState] = useState(initialModelId)
  const [isPending, startTransition] = useTransition()

  const setModelId = useCallback((nextModelId: ChatModelId) => {
    setModelIdState(nextModelId)
    document.cookie = lastUsedChatModelClientCookieString(nextModelId)
  }, [])

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

    const params = new URLSearchParams({ query, model: modelId })
    startTransition(() => {
      router.push(`/chat/${chatId}?${params.toString()}`)
    })
  }

  return (
    <ChatComposer
      status='ready'
      isSubmitPending={isPending}
      placeholder='Enter your message'
      onSubmit={handleSubmit}
      displayUsage={false}
      modelId={modelId}
      onModelChange={setModelId}
    />
  )
}
