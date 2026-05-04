import { cookies } from 'next/headers'
import ChatSidebar from '~/components/chat_sidebar'
import CollectionsSidebar from '~/components/collections_sidebar'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import {
  defaultOpenFromSidebarCookie,
  SIDEBAR_STATE_COOKIE_NAME,
} from '~/lib/sidebar_state_cookie'

export const dynamic = 'force-dynamic'

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get(SIDEBAR_STATE_COOKIE_NAME)?.value
  const defaultOpen = defaultOpenFromSidebarCookie(sidebarCookie)

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ChatSidebar />
      <SidebarTrigger className='fixed top-2 left-2 z-20' />
      <main className='relative flex min-h-svh w-full min-w-0 flex-1 flex-col bg-background'>
        {children}
      </main>
      <CollectionsSidebar />
    </SidebarProvider>
  )
}
