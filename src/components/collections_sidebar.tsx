import type { CSSProperties, ReactNode } from 'react'

import { Suspense } from 'react'
import CollectionsMobileDrawer from '~/components/collections_mobile_drawer'
import CollectionsSidebarClient from '~/components/collections_sidebar_client'
import CollectionsSidebarError from '~/components/collections_sidebar_error'
import { Sidebar, SidebarHeader } from '~/components/ui/sidebar'
import { Spinner } from '~/components/ui/spinner'
import { listCollectionsWithSources } from '~/db/queries/collections'

import NewCollectionButton from './new_collection_button'

const COLLECTIONS_RAIL_WIDTH = '32rem' as const

export default function CollectionsSidebar() {
  return (
    <Suspense fallback={<CollectionsRail>{null}</CollectionsRail>}>
      <CollectionsSidebarLoaded />
    </Suspense>
  )
}

async function CollectionsSidebarLoaded() {
  let content: ReactNode
  try {
    const initialCollections = await listCollectionsWithSources()
    content = <CollectionsSidebarClient initialCollections={initialCollections} />
  } catch (error) {
    console.error('Failed to load collections sidebar:', error)
    content = <CollectionsSidebarError />
  }

  return (
    <>
      <CollectionsRail>{content}</CollectionsRail>
      <CollectionsMobileDrawer>{content}</CollectionsMobileDrawer>
    </>
  )
}

function CollectionsRail({ children }: { children: ReactNode }) {
  return (
    <div
      className='relative z-10 hidden h-svh min-h-0 shrink-0 md:block'
      style={{ '--sidebar-width': COLLECTIONS_RAIL_WIDTH } as CSSProperties}
    >
      <Sidebar
        side='right'
        collapsible='none'
        className='flex h-full min-h-0 w-(--sidebar-width) shrink-0 flex-col overflow-hidden border-l border-border text-foreground'
      >
        <SidebarHeader className='gap-0 p-0'>
          <div className='flex h-8 items-center justify-between gap-3 px-2'>
            <h2 className='text-sm text-muted-foreground'>Collections</h2>
            <NewCollectionButton />
          </div>
        </SidebarHeader>
        {children ?? <CollectionsRailLoading />}
      </Sidebar>
    </div>
  )
}

function CollectionsRailLoading() {
  return (
    <div className='flex h-full items-center justify-center'>
      <Spinner className='size-8' />
    </div>
  )
}
