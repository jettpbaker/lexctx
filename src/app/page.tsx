'use client'

import type { LocalSourceType } from '~/lib/types'

import { useShallow } from 'zustand/react/shallow'
import { SourceList, SourceListEmpty } from '~/components/source_list'
import { Button } from '~/components/ui/button'
import { useSourceStore } from '~/hooks/useStore'
import tickPipeline from '~/lib/localPipeline/tickPipeline'
import { MAX_FILES_PER_UPLOAD } from '~/lib/sourceUploadConstants'
import { createPendingSources } from '~/server/actions/sources'

export default function Page() {
  const sources = useSourceStore(useShallow((state) => Object.values(state.sources)))
  const addSource = useSourceStore((state) => state.addSource)

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const files = formData.getAll('file') as File[]
    if (files.length === 0) {
      console.error('Please upload a file!')
      return
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      console.error('You can only upload 13 files at a time')
      return
    }

    const names = files.map((file) => file.name)

    const sources = await createPendingSources(names)

    sources.forEach((source, index) => {
      const file = files[index]
      const localSource: LocalSourceType = {
        id: source.id,
        collectionId: null,
        name: source.name,
        audioStatus: { stage: 'extraction-queued' },
        videoStatus: { stage: 'pending' },
        createdAt: source.createdAt,
      }

      addSource(localSource, file)
    })

    requestAnimationFrame(() => {
      tickPipeline()
    })
  }

  return (
    <div className='flex min-h-svh p-6'>
      <div className='flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose'>
        <div>
          <h1>Upload A Source!</h1>
          <form onSubmit={handleSubmit}>
            <input name='file' type='file' accept='video/*' multiple />
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
