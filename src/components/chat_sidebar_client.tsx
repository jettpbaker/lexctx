'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChatSidebarItem } from '~/app/(app)/new_chat_form'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/ui/sidebar'
import { CHATS_KEY } from '~/lib/query_keys'
import { getAllChats } from '~/server/actions/sources'

import { Shimmer } from './ai-elements/shimmer'
import { Spinner } from './ui/spinner'

export default function ChatSidebarClient({ initialChats }: { initialChats: ChatSidebarItem[] }) {
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
        const title = chat.title ?? 'New chat'

        return (
          <SidebarMenuItem key={chat.id}>
            <SidebarMenuButton
              isActive={isActive}
              render={<Link href={href} prefetch={true} />}
              tooltip={title}
            >
              {chat.titleLoading && (
                <div className='flex flex-1 items-center justify-between'>
                  <Shimmer color='var(--muted-foreground)' shimmerColor='var(--foreground)'>
                    {title}
                  </Shimmer>
                  <Spinner className='size-4 shrink-0' />
                </div>
              )}

              {!chat.titleLoading && (
                <div className='min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,black_calc(100%-3em),transparent)] whitespace-nowrap'>
                  {title}
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
