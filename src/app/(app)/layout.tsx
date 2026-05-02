import ChatSidebar from '~/components/chat_sidebar'
import CollectionsSidebar from '~/components/collections_sidebar'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'

export const dynamic = 'force-dynamic'

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ChatSidebar />
      <SidebarTrigger className='fixed top-2 left-2 z-20' />
      <main className='relative flex min-h-svh w-full min-w-0 flex-1 flex-col bg-background'>
        {children}
      </main>
      <CollectionsSidebar />
    </SidebarProvider>
  )
}
