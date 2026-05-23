'use client'

import { useRouter } from 'next/navigation'
import { Button } from '~/components/ui/button'

export default function CollectionsSidebarError() {
  const router = useRouter()

  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center'>
      <p className='text-sm text-muted-foreground'>Could not load collections.</p>
      <Button size='sm' variant='secondary' type='button' onClick={() => router.refresh()}>
        Retry
      </Button>
    </div>
  )
}
