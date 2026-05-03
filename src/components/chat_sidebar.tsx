'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buttonVariants } from '~/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'
import { cn } from '~/lib/utils'

const DUMMY_CHATS = [
  { id: 'contract-review-acme', title: 'Contract review — Acme Corp' },
  { id: 'motion-to-dismiss', title: 'Motion to dismiss draft' },
  { id: 'discovery-followup', title: 'Discovery: follow-up questions' },
  { id: 'case-law-smith-jones', title: 'Case law: Smith v. Jones' },
  { id: 'depo-prep-witness-a', title: 'Deposition prep — witness A' },
  { id: 'emails-opposing', title: 'Email thread with opposing counsel' },
  { id: 'settlement-term', title: 'Settlement term sheet' },
  { id: 'local-rules', title: 'Local rules & deadlines' },
] as const

export default function ChatSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className='h-7' aria-hidden />
        <Link href='/' className='text-lg font-medium text-foreground/90'>
          Lex
        </Link>
        <Link
          href='/chat/new'
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-full')}
        >
          + New chat
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DUMMY_CHATS.map((chat) => {
                const href = `/chat/${chat.id}`
                const isActive = pathname === href

                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={href} prefetch={false} />}
                      tooltip={chat.title}
                    >
                      <span className='truncate'>{chat.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className='border-t border-sidebar-border p-2 text-center text-xs text-sidebar-foreground/50'>
        Lex
      </SidebarFooter>
    </Sidebar>
  )
}
