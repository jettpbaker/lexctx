'use server'

import db from '~/db'
import { sources } from '~/db/schema'
import { MAX_FILES_PER_UPLOAD } from '~/lib/sourceUploadConstants'

export async function createPendingSources(names: string[]) {
  if (names.length === 0) return []
  if (names.length > MAX_FILES_PER_UPLOAD)
    throw new Error('You can upload up to 13 sources at once')

  const createdSources = await db
    .insert(sources)
    .values(names.map((name) => ({ name, status: 'pending_upload' as const })))
    .returning()
  return createdSources
}
