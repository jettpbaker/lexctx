import Mux from '@mux/mux-node'
import { sleep } from 'workflow'
import { env } from '~/env'
import { MAX_MUX_DELETE_CLEANUP_POLLS, MUX_DELETE_CLEANUP_POLL_INTERVAL } from '~/lib/constants'

export async function deleteMuxVideoAfterUploadCompletes(muxUploadId: string) {
  'use workflow'

  for (let i = 0; i < MAX_MUX_DELETE_CLEANUP_POLLS; i++) {
    await sleep(MUX_DELETE_CLEANUP_POLL_INTERVAL)

    const upload = await getMuxUpload(muxUploadId)

    if (upload.status === 'asset_created' && upload.asset_id) {
      await deleteMuxAsset(upload.asset_id)
      return
    }

    if (
      upload.status === 'errored' ||
      upload.status === 'cancelled' ||
      upload.status === 'timed_out'
    ) {
      return
    }
  }

  await logMuxCleanupTimedOut(muxUploadId)
}

function createMuxClient() {
  return new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
  })
}

async function getMuxUpload(muxUploadId: string) {
  'use step'

  const mux = createMuxClient()
  console.log('[mux delete cleanup] retrieving upload', { muxUploadId })
  return mux.video.uploads.retrieve(muxUploadId)
}

async function deleteMuxAsset(muxAssetId: string) {
  'use step'

  const mux = createMuxClient()
  console.log('[mux delete cleanup] deleting asset', { muxAssetId })
  await mux.video.assets.delete(muxAssetId)
}

async function logMuxCleanupTimedOut(muxUploadId: string) {
  'use step'

  console.error('[mux delete cleanup] timed out waiting for asset creation', { muxUploadId })
}
