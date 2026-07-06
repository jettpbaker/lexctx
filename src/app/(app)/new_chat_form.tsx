'use client'

import type { ChatSidebarItem } from '~/lib/types/chat'

import { useQueryClient } from '@tanstack/react-query'
import { generateId } from 'ai'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { ChatComposer } from '~/components/chat/chat_composer'
import { Button } from '~/components/ui/button'
import { lastUsedChatModelClientCookieString } from '~/lib/chat_model_cookie'
import { CHATS_KEY } from '~/lib/query_keys'
import { generateChatTitle } from '~/server/actions/generateChatTitle'
import type { ChatModelId } from '~/server/ai/modelMapping'

const EXAMPLE_PROMPTS = [
  'Summarize my most recent lecture',
  'Build a study guide for this week',
  'Quiz me on the key concepts',
  'Explain a topic I keep getting stuck on',
] as const

export default function NewChatForm({ initialModelId }: { initialModelId: ChatModelId }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [modelId, setModelIdState] = useState(initialModelId)
  const [prefill, setPrefill] = useState<{ text: string; token: number }>({ text: '', token: 0 })
  const [isPending, startTransition] = useTransition()

  const setModelId = useCallback((nextModelId: ChatModelId) => {
    setModelIdState(nextModelId)
    document.cookie = lastUsedChatModelClientCookieString(nextModelId)
  }, [])

  const handlePromptSelect = useCallback((text: string) => {
    setPrefill((current) => ({ text, token: current.token + 1 }))
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
    <>
      <div className='flex flex-1 items-center justify-center px-6'>
        <div className='flex w-full max-w-(--conversation-width) flex-col items-center gap-8 text-center'>
          <div className='flex flex-col items-center gap-3'>
            <h1 className='font-serif text-5xl text-balance text-whisper sm:text-6xl'>
              Ask your lectures.
            </h1>
            <p className='max-w-md text-sm text-balance text-muted-foreground'>
              Add lecture recordings to a collection, then chat with them — answers cite the exact
              moment in the video.
            </p>
          </div>

          <div className='flex flex-wrap items-center justify-center gap-2'>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full font-normal text-muted-foreground'
                onClick={() => handlePromptSelect(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className='w-full'>
        <ChatComposer
          status='ready'
          isSubmitPending={isPending}
          placeholder='Enter your message'
          onSubmit={handleSubmit}
          displayUsage={false}
          modelId={modelId}
          onModelChange={setModelId}
          prefill={prefill}
        />
      </div>
    </>
  )
}
