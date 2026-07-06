'use client'

import type { ReactNode } from 'react'

import { Cancel01Icon, SidebarRightIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'

import NewCollectionButton from './new_collection_button'

export default function CollectionsMobileDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        aria-label='Open collections'
        onClick={() => setOpen(true)}
        className='fixed top-2 right-2 z-50 md:hidden'
      >
        <HugeiconsIcon icon={SidebarRightIcon} strokeWidth={2} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side='right'
          showCloseButton={false}
          className='w-[88vw] gap-0 bg-background p-0 text-foreground sm:max-w-md'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>Collections</SheetTitle>
            <SheetDescription>Manage your collections and sources.</SheetDescription>
          </SheetHeader>

          <div className='flex h-full min-h-0 flex-col'>
            <div className='flex h-8 shrink-0 items-center justify-between gap-3 px-2'>
              <h2 className='text-sm text-muted-foreground'>Collections</h2>
              <div className='flex items-center gap-0.5'>
                <NewCollectionButton />
                <SheetClose
                  render={
                    <Button variant='ghost' size='icon-xs' aria-label='Close collections'>
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        strokeWidth={2}
                        className='size-3.5 text-muted-foreground'
                      />
                    </Button>
                  }
                />
              </div>
            </div>
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
