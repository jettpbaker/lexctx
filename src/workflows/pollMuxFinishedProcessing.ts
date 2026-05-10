import { createBlurUp } from '@mux/blurup'
import Mux from '@mux/mux-node'
import { sleep } from 'workflow'
import { env } from '~/env'
import { MUX_POLL_INTERVAL, MAX_MUX_POLLS } from '~/lib/constants'
import {
  markSourceVideoFailed,
  markSourceVideoReady,
  saveMuxBlurUpPlaceholder,
  saveMuxAssetId,
} from '~/server/actions/sources'

export async function pollMuxFinishedProcessing(sourceId: string, muxUploadId: string) {
  'use workflow'

  for (let i = 0; i < MAX_MUX_POLLS; i++) {
    await sleep(MUX_POLL_INTERVAL)

    const upload = await getMuxUpload(muxUploadId)
    const uploadStatus = upload.status
    const uploadAssetId = upload.asset_id

    if (
      uploadStatus === 'errored' ||
      uploadStatus === 'cancelled' ||
      uploadStatus === 'timed_out'
    ) {
      await persistVideoFailed(
        sourceId,
        upload.error?.message ?? `Mux upload ended with status: ${uploadStatus}`
      )
      return
    }

    if (uploadStatus === 'waiting') {
      continue
    }

    if (uploadStatus === 'asset_created' && uploadAssetId) {
      await persistMuxAssetId(sourceId, uploadAssetId)

      const asset = await getMuxAsset(uploadAssetId)

      if (asset.status === 'preparing') {
        continue
      }

      if (asset.status === 'errored') {
        await persistVideoFailed(
          sourceId,
          asset.errors?.messages?.join(', ') ?? 'Mux asset processing failed'
        )
        return
      }

      if (asset.status === 'ready') {
        const playbackId = asset.playback_ids?.find((id) => id.policy === 'public')?.id

        if (!playbackId) {
          await persistVideoFailed(sourceId, 'Mux asset is ready but has no public playback ID')
          return
        }

        await persistVideoReady(sourceId, uploadAssetId, playbackId)
        await persistBlurUpPlaceholder(sourceId, playbackId, asset.duration)
        return
      }
    }
  }

  await persistVideoFailed(sourceId, 'Mux asset did not finish processing in time')
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
  console.log('[mux processing poll] retrieving upload', { muxUploadId })
  return mux.video.uploads.retrieve(muxUploadId)
}

async function getMuxAsset(muxAssetId: string) {
  'use step'

  const mux = createMuxClient()
  console.log('[mux processing poll] retrieving asset', { muxAssetId })
  return mux.video.assets.retrieve(muxAssetId)
}

async function persistMuxAssetId(sourceId: string, muxAssetId: string) {
  'use step'

  console.log('[mux processing poll] saving asset ID', { sourceId, muxAssetId })
  await saveMuxAssetId(sourceId, muxAssetId)
}

async function persistVideoReady(sourceId: string, muxAssetId: string, muxPlaybackId: string) {
  'use step'

  console.log('[mux processing poll] video ready', { sourceId, muxAssetId, muxPlaybackId })
  await markSourceVideoReady(sourceId, muxAssetId, muxPlaybackId)
}

async function persistBlurUpPlaceholder(
  sourceId: string,
  muxPlaybackId: string,
  durationSeconds: number | null | undefined
) {
  'use step'

  try {
    const time = getBlurUpTimestamp(durationSeconds)
    const { blurDataURL, aspectRatio } = await createBlurUp(muxPlaybackId, { time, type: 'webp' })

    console.log('[mux processing poll] saving blur-up placeholder', {
      sourceId,
      muxPlaybackId,
      time,
      aspectRatio,
    })
    await saveMuxBlurUpPlaceholder(sourceId, blurDataURL, aspectRatio)
  } catch (error) {
    console.error('[mux processing poll] blur-up placeholder failed', { sourceId, error })
  }
}

function getBlurUpTimestamp(durationSeconds: number | null | undefined) {
  if (!durationSeconds || durationSeconds <= 0) return 1
  if (durationSeconds < 2) return Math.max(0, durationSeconds / 2)

  return Math.min(Math.max(durationSeconds * 0.2, 1), durationSeconds - 1)
}

async function persistVideoFailed(sourceId: string, error: string) {
  'use step'

  console.error('[mux processing poll] video failed', { sourceId, error })
  await markSourceVideoFailed(sourceId, error)
}
