'use client'

import type { KeyboardEvent, MouseEvent } from 'react'

import { Delete02Icon, Edit03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChatSidebarItem } from '~/app/(app)/new_chat_form'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/ui/sidebar'
import { CHATS_KEY } from '~/lib/query_keys'
import { getAllChats } from '~/server/actions/sources'

import { Shimmer } from './ai-elements/shimmer'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

type ChatSidebarClientProps = {
  initialChats: ChatSidebarItem[]
  onEdit?: (chatId: string, title: string) => Promise<void>
  onDelete?: (chatId: string) => Promise<void>
}

export default function ChatSidebarClient({
  initialChats,
  onEdit,
  onDelete,
}: ChatSidebarClientProps) {
  const pathname = usePathname()

  const chatsQuery = useQuery({
    queryKey: [CHATS_KEY],
    queryFn: async () => {
      const chats = await getAllChats()
      return chats.map((chat) => ({ ...chat, titleLoading: false }))
    },
    initialData: initialChats,
  })

  return (
    <SidebarMenu>
      {chatsQuery.data?.map((chat) => {
        const href = `/chat/${chat.id}`
        const isActive = pathname === href

        return (
          <ChatSidebarRow
            key={chat.id}
            chat={chat}
            href={href}
            isActive={isActive}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )
      })}
    </SidebarMenu>
  )
}

type ChatSidebarRowProps = {
  chat: ChatSidebarItem
  href: string
  isActive: boolean
  onEdit?: (chatId: string, title: string) => Promise<void>
  onDelete?: (chatId: string) => Promise<void>
}

function ChatSidebarRow({ chat, href, isActive, onEdit, onDelete }: ChatSidebarRowProps) {
  const queryClient = useQueryClient()
  const fallbackTitle = chat.title ?? 'New chat'
  const [isEditing, setIsEditing] = useState(false)
  const [chatTitle, setChatTitle] = useState(fallbackTitle)
  const [savedTitle, setSavedTitle] = useState(fallbackTitle)
  const editInput = useRef<HTMLInputElement>(null)
  const cancelEditRef = useRef(false)

  function startEditing() {
    cancelEditRef.current = false
    setIsEditing(true)
  }

  async function commitEdit() {
    if (cancelEditRef.current) {
      cancelEditRef.current = false
      return
    }

    const trimmedTitle = chatTitle.trim()
    setIsEditing(false)

    if (trimmedTitle.length === 0) {
      setChatTitle(savedTitle)
      return
    }

    if (trimmedTitle === savedTitle) {
      setChatTitle(trimmedTitle)
      return
    }

    const previousTitle = savedTitle
    const previousChats = queryClient.getQueryData<ChatSidebarItem[]>([CHATS_KEY])

    setChatTitle(trimmedTitle)
    setSavedTitle(trimmedTitle)
    queryClient.setQueryData<ChatSidebarItem[]>([CHATS_KEY], (current = []) =>
      current.map((currentChat) =>
        currentChat.id === chat.id ? { ...currentChat, title: trimmedTitle } : currentChat
      )
    )

    try {
      await onEdit?.(chat.id, trimmedTitle)
    } catch {
      setChatTitle(previousTitle)
      setSavedTitle(previousTitle)
      queryClient.setQueryData([CHATS_KEY], previousChats)
    } finally {
      void queryClient.invalidateQueries({ queryKey: [CHATS_KEY] })
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelEditRef.current = true
      setIsEditing(false)
      setChatTitle(savedTitle)
      e.currentTarget.blur()
    }
  }

  useEffect(() => {
    setChatTitle(fallbackTitle)
    setSavedTitle(fallbackTitle)
  }, [fallbackTitle])

  useEffect(() => {
    if (isEditing && editInput.current) {
      editInput.current.focus()
      editInput.current.select()
    }
  }, [isEditing])

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className='min-w-0 group-focus-within/menu-item:bg-sidebar-accent group-focus-within/menu-item:text-sidebar-accent-foreground group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground'
        isActive={isActive}
        render={isEditing ? <div /> : <Link href={href} prefetch={true} />}
        tooltip={savedTitle}
      >
        {chat.titleLoading && (
          <div className='flex flex-1 items-center justify-between'>
            <Shimmer color='var(--muted-foreground)' shimmerColor='var(--foreground)'>
              {fallbackTitle}
            </Shimmer>
            <Spinner className='size-4 shrink-0' />
          </div>
        )}

        {!chat.titleLoading && (
          <>
            <div
              className='min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,black_calc(100%-3em),transparent)] whitespace-nowrap'
              hidden={isEditing}
            >
              {chatTitle}
            </div>
            <input
              ref={editInput}
              value={chatTitle}
              onChange={(e) => setChatTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => void commitEdit()}
              hidden={!isEditing}
              className='min-w-0 flex-1 truncate bg-transparent text-xs font-medium focus:ring-0 focus:outline-none'
            />
          </>
        )}
      </SidebarMenuButton>
      <div className='pointer-events-none absolute inset-y-0 right-0 z-10 flex translate-x-1 items-center justify-end gap-0.5 bg-sidebar-accent [mask-image:linear-gradient(to_right,transparent,black_1.75rem)] pr-1 pl-8 opacity-0 transition-[translate,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate,opacity] group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:translate-x-0 group-focus-within/menu-item:opacity-100 group-hover/menu-item:pointer-events-auto group-hover/menu-item:translate-x-0 group-hover/menu-item:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-none'>
        <ChatActions chat={chat} onEdit={startEditing} onDelete={onDelete} />
      </div>
    </SidebarMenuItem>
  )
}

type ChatActionsProps = {
  chat: ChatSidebarItem
  onEdit?: (chat: ChatSidebarItem) => void
  onDelete?: (chatId: string) => Promise<void>
}

function ChatActions({ chat, onEdit, onDelete }: ChatActionsProps) {
  const queryClient = useQueryClient()

  function handleEdit(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (chat.titleLoading) return

    onEdit?.(chat)
  }

  async function handleDelete(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()

    const previousChats = queryClient.getQueryData<ChatSidebarItem[]>([CHATS_KEY])

    queryClient.setQueryData<ChatSidebarItem[]>([CHATS_KEY], (current) =>
      (current ?? []).filter((c) => c.id !== chat.id)
    )

    try {
      await onDelete?.(chat.id)
    } catch {
      queryClient.setQueryData([CHATS_KEY], previousChats)
    } finally {
      void queryClient.invalidateQueries({ queryKey: [CHATS_KEY] })
    }
  }

  return (
    <div className='flex items-center gap-0.5 text-muted-foreground'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              disabled={chat.titleLoading}
              variant='ghost'
              size='icon-sm'
              aria-label='Edit chat'
              onClick={handleEdit}
            >
              <HugeiconsIcon icon={Edit03Icon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>Rename chat</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='Delete chat'
              className='hover:bg-destructive/10 hover:text-destructive'
              onClick={handleDelete}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>Delete chat</TooltipContent>
      </Tooltip>
    </div>
  )
}
