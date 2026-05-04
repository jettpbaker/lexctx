'use client'

import type { ChatType } from '~/server/actions/sources'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/ui/sidebar'

export default function ChatSidebarClient({ initialChats }: { initialChats: ChatType[] }) {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {initialChats.map((chat) => {
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
              <span className='truncate'>{title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
