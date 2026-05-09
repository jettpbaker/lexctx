'use server'

import Mux from '@mux/mux-node'
import { start } from 'workflow/api'
import { env } from '~/env'
import { deleteMuxVideoAfterUploadCompletes } from '~/workflows/deleteMuxVideoAfterUploadCompletes'

export async function deleteSourceVideo(sourceId: string, muxAssetId: string) {
  const mux = createMuxClient()

  try {
    await mux.video.assets.delete(muxAssetId)
  } catch (error) {
    console.error('Error deleting Mux asset: ', { sourceId, muxAssetId, error })
    throw error
  }
}

export async function cancelMuxUpload(sourceId: string, muxUploadId: string | null) {
  if (!muxUploadId) return

  const mux = createMuxClient()

  try {
    await mux.video.uploads.cancel(muxUploadId)
  } catch (error) {
    if (isMuxUploadAlreadyCompletedError(error)) {
      console.info('Mux upload already completed before cancellation: ', { sourceId, muxUploadId })
      await start(deleteMuxVideoAfterUploadCompletes, [muxUploadId])
      return
    }

    console.error('Error cancelling Mux upload: ', { sourceId, muxUploadId, error })
    throw error
  }
}

function isMuxUploadAlreadyCompletedError(error: unknown) {
  if (!(error instanceof Error)) return false

  return error.message.includes('The upload has already completed')
}

function createMuxClient() {
  return new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
  })
}
