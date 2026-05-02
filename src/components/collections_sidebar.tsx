import type { CSSProperties } from 'react'

import { Suspense } from 'react'
import CollectionsSidebarClient from '~/components/collections_sidebar_client'
import { Sidebar, SidebarHeader } from '~/components/ui/sidebar'
import { Spinner } from '~/components/ui/spinner'
import { listCollectionsWithSources } from '~/server/actions/sources'

import NewCollectionButton from './new_collection_button'

const COLLECTIONS_RAIL_WIDTH = '32rem' as const

export default async function CollectionsSidebar() {
  return (
    <div
      className='relative z-10 hidden h-svh min-h-0 shrink-0 md:block'
      style={{ '--sidebar-width': COLLECTIONS_RAIL_WIDTH } as CSSProperties}
    >
      <Sidebar
        side='right'
        collapsible='none'
        className='flex h-full min-h-0 w-(--sidebar-width) shrink-0 flex-col overflow-hidden border-l border-border bg-background text-foreground'
      >
        <SidebarHeader className='gap-0 p-0'>
          <div className='flex h-8 items-center justify-between gap-3 px-2'>
            <h2 className='text-sm text-muted-foreground'>Collections</h2>
            <NewCollectionButton />
          </div>
        </SidebarHeader>
        <Suspense fallback={<CollectionsSidebarLoading />}>
          <CollectionsSidebarData />
        </Suspense>
      </Sidebar>
    </div>
  )
}

async function CollectionsSidebarData() {
  const initialCollections = await listCollectionsWithSources()

  return <CollectionsSidebarClient initialCollections={initialCollections} />
}

function CollectionsSidebarLoading() {
  return (
    <div className='flex h-full items-center justify-center'>
      <Spinner className='size-8' />
    </div>
  )
}
