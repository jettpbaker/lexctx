'use client'

import type { LocalSourceType } from '~/lib/types'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { SourceList, SourceListEmpty } from '~/components/source_list'
import { Button } from '~/components/ui/button'
import { useSourceStore } from '~/hooks/useStore'
import { MAX_FILES_PER_UPLOAD } from '~/lib/constants'
import tickPipeline from '~/lib/localPipeline/tickPipeline'
import { createCollection, createPendingSources, listCollections } from '~/server/actions/sources'

type Collection = Awaited<ReturnType<typeof listCollections>>[number]

export default function Page() {
  const sources = useSourceStore(useShallow((state) => Object.values(state.sources)))
  const addSource = useSourceStore((state) => state.addSource)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId)

  useEffect(() => {
    void listCollections().then((collections) => {
      setCollections(collections)
      setSelectedCollectionId((currentId) => currentId || collections[0]?.id || '')
    })
  }, [])

  async function handleCreateCollection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('collectionName')
    if (typeof name !== 'string' || name.trim().length === 0) {
      console.error('Please enter a collection name')
      return
    }

    const collection = await createCollection(name)
    setCollections((collections) => [...collections, collection])
    setSelectedCollectionId(collection.id)
    form.reset()
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (!selectedCollectionId) {
      console.error('Please create or select a collection first')
      return
    }

    const files = formData.getAll('file') as File[]
    if (files.length === 0) {
      console.error('Please upload a file!')
      return
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      console.error(`You can only upload ${MAX_FILES_PER_UPLOAD} files at a time`)
      return
    }

    const names = files.map((file) => file.name)

    const sources = await createPendingSources(selectedCollectionId, names)

    sources.forEach((source, index) => {
      const file = files[index]
      const localSource: LocalSourceType = {
        id: source.id,
        collectionId: source.collectionId,
        name: source.name,
        audioStatus: { stage: 'hashing-queued' },
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
          <h1>Collections</h1>
          <form onSubmit={handleCreateCollection}>
            <input name='collectionName' type='text' placeholder='Collection name' />
            <Button type='submit'>Create collection</Button>
          </form>

          <div className='mt-4'>
            <p>Selected collection: {selectedCollection?.name ?? 'none'}</p>
            <p>Selected collection ID: {selectedCollectionId || 'none'}</p>

            {collections.length > 0 ? (
              <fieldset>
                <legend>Pick a collection</legend>
                {collections.map((collection) => (
                  <label key={collection.id} className='block'>
                    <input
                      type='radio'
                      name='collection'
                      value={collection.id}
                      checked={selectedCollectionId === collection.id}
                      onChange={() => setSelectedCollectionId(collection.id)}
                    />
                    {collection.name}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p>No collections yet.</p>
            )}
          </div>
        </div>

        <div>
          <h1>Upload A Source!</h1>
          <form onSubmit={handleSubmit}>
            <input name='file' type='file' accept='video/*' multiple />
            <Button type='submit' disabled={!selectedCollectionId}>
              Upload!
            </Button>
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
