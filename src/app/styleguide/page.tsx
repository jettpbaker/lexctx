import {
  COLLECTIONS_GALLERY,
  ROW_GALLERY,
  VIDEO_CHIP_GALLERY,
  VIDEO_CHIP_ROWS,
} from '~/app/styleguide/mock_data'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/ai-elements/reasoning'
import { ToolStatusRow } from '~/components/chat/tool_status_row'
import { toolUiMapping } from '~/components/chat/toolUiMapping'
import {
  CollectionGroup,
  type CollectionGroupCollection,
} from '~/components/sources/collection_group'
import { SourceRow } from '~/components/sources/source_row'

const TOOL_NAMES = Object.keys(toolUiMapping) as Array<keyof typeof toolUiMapping>
const TOOL_STATES = ['in-flight', 'completed', 'error'] as const

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
        title='Video status chip'
        description='Secondary chip for the video upload/Mux pipeline. Demoted from the primary chat status because chat does not depend on video. Hidden when video is `pending` or `ready` — surfaces only while there is something to communicate. Rows below all have chat status `ready`, so the StatusLabel slot shows an explicit `ready` label alongside the chip to disambiguate "chat is usable, video is still working" from "this source is still processing."'
      >
        <div className='grid gap-6 md:grid-cols-2'>
          <SidebarFrame>
            <div className='flex flex-col'>
              {VIDEO_CHIP_ROWS.map((source) => (
                <SourceRow key={source.id} source={source} />
              ))}
            </div>
          </SidebarFrame>
          <div className='flex flex-col gap-1 rounded-lg border border-border p-4'>
            <p className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
              States
            </p>
            <ul className='flex flex-col gap-1.5 text-xs text-muted-foreground'>
              {VIDEO_CHIP_GALLERY.map((entry, i) => (
                <li key={i} className='flex items-center justify-between gap-2'>
                  <span>{entry.label}</span>
                  <code className='font-mono text-[10px] tracking-wide text-muted-foreground/70'>
                    {entry.videoStatus.kind}
                    {entry.videoStatus.kind === 'uploading' &&
                      ` ${Math.round(entry.videoStatus.progress * 100)}%`}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        </div>
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

      <Section
        title='Chat tool statuses'
        description='Every tool from toolUiMapping rendered in each lifecycle state. The reasoning trigger row is included on top so icon/text alignment can be checked across rows.'
      >
        <div className='grid gap-6 md:grid-cols-3'>
          {TOOL_STATES.map((state) => (
            <div key={state} className='flex flex-col rounded-lg border border-border p-4'>
              <p className='mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                {state}
              </p>
              <Reasoning defaultOpen>
                <ReasoningTrigger />
                <ReasoningContent>Mock reasoning content for alignment check.</ReasoningContent>
              </Reasoning>
              {TOOL_NAMES.map((toolName) => (
                <ToolStatusRow key={toolName} toolName={toolName} status={state} />
              ))}
            </div>
          ))}
        </div>
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
