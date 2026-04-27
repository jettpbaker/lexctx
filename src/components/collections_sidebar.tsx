import type { CSSProperties } from 'react'

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

/** 2× default shadcn `--sidebar-width` (16rem), scoped to this rail only */
const COLLECTIONS_RAIL_WIDTH = '32rem' as const

const DUMMY_COLLECTIONS = [
  {
    name: 'IFB102 — Software Architecture',
    sources: ['Lecture_01.mp4', 'Lecture_02.mp4', 'Lecture_03.mp4'],
  },
  {
    name: 'IFB103 — Algorithms',
    sources: ['Week4_Sorting.mp4', 'Problem_set_solutions.pdf'],
  },
  {
    name: 'Personal',
    sources: ['saved_talk_keynote.mp4'],
  },
] as const

const totalSources = DUMMY_COLLECTIONS.reduce((n, c) => n + c.sources.length, 0)

export default function CollectionsSidebar() {
  return (
    <div
      className="hidden h-svh min-h-0 shrink-0 md:block"
      style={{ '--sidebar-width': COLLECTIONS_RAIL_WIDTH } as CSSProperties}
    >
    <Sidebar
      side="right"
      collapsible="none"
      className="bg-background text-foreground flex h-full min-h-0 w-(--sidebar-width) shrink-0 flex-col overflow-hidden border-l border-border"
    >
      <SidebarHeader className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold tracking-tight">Collections</p>
        <p className="text-muted-foreground text-xs">Preview — dummy data</p>
      </SidebarHeader>
      <SidebarContent className="min-h-0 overflow-y-auto">
        {DUMMY_COLLECTIONS.map((collection) => (
          <SidebarGroup key={collection.name}>
            <SidebarGroupLabel className="text-xs">{collection.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {collection.sources.map((name) => (
                  <SidebarMenuItem key={`${collection.name}-${name}`}>
                    <SidebarMenuButton>
                      <span className="truncate text-left" title={name}>
                        {name}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="text-muted-foreground border-t border-border p-2 text-center text-xs">
        {totalSources} sources
      </SidebarFooter>
    </Sidebar>
    </div>
  )
}
