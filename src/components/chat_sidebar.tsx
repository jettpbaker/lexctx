import { Add01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ChatSidebarItem } from '~/app/(app)/new_chat_form'
import { buttonVariants } from '~/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarTrigger,
} from '~/components/ui/sidebar'
import { Spinner } from '~/components/ui/spinner'
import { cn } from '~/lib/utils'
import { getAllChats, upsertChatTitle, deleteChatById } from '~/server/actions/sources'

import ChatSidebarClient from './chat_sidebar_client'

export default function ChatSidebar() {
  return (
    <Sidebar>
      <SidebarTrigger className='fixed top-2 left-2 z-50' />

      <SidebarHeader className='mb-2 p-2'>
        <div className='h-7' aria-hidden />
        <Link
          href='/'
          aria-label='New chat'
          className={cn(
            buttonVariants({ size: 'lg' }),
            'group/new-chat relative w-full overflow-hidden text-sm'
          )}
        >
          <span className='grid place-items-center'>
            <span
              aria-hidden
              className='col-start-1 row-start-1 transition duration-150 ease-[var(--ease-out-quart)] motion-reduce:-translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover/new-chat:-translate-y-[120%] [@media(hover:hover)_and_(pointer:fine)]:group-hover/new-chat:opacity-0'
            >
              New Chat
            </span>
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={2.5}
              aria-hidden
              className='col-start-1 row-start-1 translate-y-[120%] opacity-0 transition duration-150 ease-[var(--ease-out-quart)] motion-reduce:translate-y-[120%] motion-reduce:opacity-0 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover/new-chat:translate-y-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/new-chat:opacity-100'
            />
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Suspense fallback={<ChatSidebarLoading />}>
              <ChatSidebarData />
            </Suspense>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

async function ChatSidebarData() {
  const initialChats = await getAllChats()

  async function renameChat(chatId: string, title: string) {
    'use server'

    await upsertChatTitle(chatId, title)
  }

  async function deleteChat(chatId: string) {
    'use server'

    await deleteChatById(chatId)
  }

  const chats = initialChats.map<ChatSidebarItem>((chat) => ({
    ...chat,
    titleLoading: false,
  }))

  return <ChatSidebarClient initialChats={chats} onEdit={renameChat} onDelete={deleteChat} />
}

function ChatSidebarLoading() {
  return (
    <div className='flex h-24 items-center justify-center'>
      <Spinner className='size-6' />
    </div>
  )
}
