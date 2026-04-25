'use client'

import { SourceList, SourceListEmpty } from '@/components/source_list'
import { Button } from '@/components/ui/button'
import { useSourceStore } from '@/hooks/useStore'
import { useShallow } from 'zustand/react/shallow'

export default function Page() {
  const sources = useSourceStore(
    useShallow((state) => Object.values(state.sources))
  )

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const file = formData.get('file') as File
    if (!file) {
      console.error('Please upload a file!')
      return
    }
    const name = file.name
  }

  return (
    <div className='flex min-h-svh p-6'>
      <div className='flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose'>
        <div>
          <h1>Upload A Source!</h1>
          <form onSubmit={handleSubmit}>
            <input name='file' type='file' accept='video/*' />
            <Button type='submit'>Upload!</Button>
          </form>
        </div>

        <div className='mt-12'>
          {sources.length > 0 && <SourceList sources={sources} />}
          {sources.length === 0 && <SourceListEmpty />}
        </div>
      </div>
    </div>
  )
}
