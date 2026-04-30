'use server'

import { deleteLectureChunks } from '~/db/chroma'

import deleteSourceAudio from './deleteSourceAudio'
import { deleteSourceById, getSourceById } from './sources'

export async function deleteSource(sourceId: string) {
  const [source] = await getSourceById(sourceId)
  if (!source) throw new Error(`Source not found: ${sourceId}`)

  await Promise.all([
    deleteLectureChunks(sourceId),
    source.audioKey ? deleteSourceAudio(sourceId, source.audioKey) : Promise.resolve(),
  ])

  await deleteSourceById(sourceId)
}
