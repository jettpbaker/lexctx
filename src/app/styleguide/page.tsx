import { COLLECTIONS_GALLERY, ROW_GALLERY } from '~/app/styleguide/mock_data'
import {
  CollectionGroup,
  type CollectionGroupCollection,
} from '~/components/sources/collection_group'
import { SourceRow } from '~/components/sources/source_row'

export default function StyleguidePage() {
  return (
    <main className='mx-auto flex w-full max-w-5xl flex-col gap-12 px-8 py-12'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Lex — styleguide</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Component sketches with mock data that mirrors real state.
        </p>
      </header>

      <Section
        title='Source row'
        description='Local stages (hashing → extracting → uploading) paint progress directly into the status label — the word fills left-to-right with the success color, pixel-precise via background-clip: text. Remote stages (transcribing, indexing) shimmer the label since they have no numeric progress.'
      >
        <SidebarFrame>
          <div className='flex flex-col'>
            {ROW_GALLERY.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </div>
        </SidebarFrame>
      </Section>

      <Section
        title='Collection group'
        description='Sticky header with name, ratio, add, and actions menu. Aggregate progress bar appears under the description while anything is in flight.'
      >
        <div className='grid gap-6 md:grid-cols-2'>
          {COLLECTIONS_GALLERY.map((collection) => (
            <SidebarFrame key={collection.id}>
              <CollectionGroup collection={collection} />
            </SidebarFrame>
          ))}
        </div>
      </Section>

      <Section
        title='Composed sidebar'
        description='All collections rendered together in a 32rem column — matches the production right-rail width.'
      >
        <SidebarFrame>
          <ComposedSidebar collections={COLLECTIONS_GALLERY} />
        </SidebarFrame>
      </Section>
    </main>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className='flex flex-col gap-3'>
      <div>
        <h2 className='text-base font-semibold tracking-tight'>{title}</h2>
        {description && <p className='mt-0.5 text-xs text-muted-foreground'>{description}</p>}
      </div>
      {children}
    </section>
  )
}

function SidebarFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        'flex h-full w-full max-w-[32rem] flex-col overflow-clip rounded-lg border border-border bg-background' +
        (className ?? '')
      }
    >
      {children}
    </div>
  )
}

function ComposedSidebar({ collections }: { collections: CollectionGroupCollection[] }) {
  return (
    <div className='flex flex-col'>
      <div className='flex shrink-0 items-center justify-between border-b border-border bg-background px-3 py-3'>
        <p className='text-sm font-semibold tracking-tight'>Collections</p>
        <p className='text-xs text-muted-foreground'>+ New collection</p>
      </div>
      <div className='flex max-h-[640px] flex-col gap-2 overflow-y-auto px-2 pb-2 [&>*:first-child]:mt-2'>
        {collections.map((collection) => (
          <CollectionGroup key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  )
}
