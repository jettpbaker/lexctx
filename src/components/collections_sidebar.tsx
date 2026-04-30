import type { CSSProperties } from 'react'

import CollectionsSidebarClient from '~/components/collections_sidebar_client'
import { Sidebar, SidebarHeader } from '~/components/ui/sidebar'
import { listCollectionsWithSources } from '~/server/actions/sources'

const COLLECTIONS_RAIL_WIDTH = '32rem' as const

export default async function CollectionsSidebar() {
  const initialCollections = await listCollectionsWithSources()

  return (
    <div
      className='hidden h-svh min-h-0 shrink-0 md:block'
      style={{ '--sidebar-width': COLLECTIONS_RAIL_WIDTH } as CSSProperties}
    >
      <Sidebar
        side='right'
        collapsible='none'
        className='flex h-full min-h-0 w-(--sidebar-width) shrink-0 flex-col overflow-hidden border-l border-border bg-background text-foreground'
      >
        <SidebarHeader className='border-b border-border px-4 py-3'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-sm font-semibold tracking-tight'>Collections</p>
            <button type='button' className='text-xs text-muted-foreground hover:text-foreground'>
              + New collection
            </button>
          </div>
        </SidebarHeader>
        <CollectionsSidebarClient initialCollections={initialCollections} />
      </Sidebar>
    </div>
  )
}
