import 'server-only'
import { UTApi } from 'uploadthing/server'
import { env } from '~/env'

import { removeSourceAudioMetadata } from './sources'

export default async function deleteSourceAudio(sourceId: string, key: string) {
  const ut = new UTApi({
    token: env.UPLOADTHING_TOKEN,
  })

  const result = await ut.deleteFiles(key)

  if (!result.success || result.deletedCount === 0) {
    throw new Error(`UploadThing did not delete audio file for source ${sourceId}`)
  }

  await removeSourceAudioMetadata(sourceId)
}
