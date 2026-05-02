'use client'

import type { SubmitEvent } from 'react'

import { PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Spinner } from '~/components/ui/spinner'
import { COLLECTIONS_WITH_SOURCES_KEY } from '~/lib/query_keys'
import { createCollection } from '~/server/actions/sources'

import type { CollectionsWithSources } from './collections_sidebar_client'

export default function NewCollectionButton() {
  const queryClient = useQueryClient()

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [formError, setFormError] = useState(false)

  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: (newCollection) => {
      const queryKey = [COLLECTIONS_WITH_SOURCES_KEY]
      queryClient.setQueryData<CollectionsWithSources>(queryKey, (current) => [
        { ...newCollection, sources: [] },
        ...(current ?? []),
      ])

      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      // TODO toast
      console.error('Error creating collection', error)
    },
  })

  async function handleCreateCollection(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('collectionName')
    const trimmedName = name?.toString().trim()
    if (!trimmedName || trimmedName.length === 0) {
      setFormError(true)
      return
    }

    setPopoverOpen(false)
    setFormError(false)
    form.reset()

    createCollectionMutation.mutate(trimmedName)
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger
        render={
          <Button
            disabled={createCollectionMutation.isPending}
            variant='ghost'
            size='icon-xs'
            aria-label='New collection'
          >
            {createCollectionMutation.isPending && <Spinner className='text-muted-foreground' />}
            {!createCollectionMutation.isPending && (
              <HugeiconsIcon
                className='size-3.5 text-muted-foreground'
                icon={PlusSignIcon}
                strokeWidth={2}
              />
            )}
          </Button>
        }
      />
      <PopoverContent align='center' side='bottom' className='w-64'>
        <form onSubmit={handleCreateCollection}>
          <Field orientation='vertical'>
            <FieldLabel htmlFor='collectionName' className='w-1/2 text-muted-foreground'>
              Collection Name <span className='text-destructive'>*</span>
            </FieldLabel>
            <Input id='collectionName' name='collectionName' placeholder='Enter name' />
            {formError && (
              <FieldError className='-mt-1'>Please enter a collection name.</FieldError>
            )}
          </Field>

          <Field orientation='horizontal' className='mt-2 flex justify-end gap-1.5'>
            <Button type='button' variant='ghost' size='sm' onClick={() => setPopoverOpen(false)}>
              Cancel
            </Button>
            <Button disabled={createCollectionMutation.isPending} size='sm' type='submit'>
              Create
            </Button>
          </Field>
        </form>
      </PopoverContent>
    </Popover>
  )
}
