import { start } from 'workflow/api'
import { z } from 'zod'
import { saveMuxUploadId } from '~/db/queries/sources'
import { env } from '~/env'
import { createMuxClient } from '~/server/mux'
import { pollMuxFinishedProcessing } from '~/workflows/pollMuxFinishedProcessing'

const mux = createMuxClient()

const createUploadSchema = z.object({
  sourceId: z.uuid(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const { sourceId } = createUploadSchema.parse(body)

  const upload = await mux.video.uploads.create({
    cors_origin: env.BASE_URL,
    new_asset_settings: {
      passthrough: sourceId,
      playback_policy: ['public'],
      video_quality: 'basic',
    },
  })

  await saveMuxUploadId(sourceId, upload.id)
  await start(pollMuxFinishedProcessing, [sourceId, upload.id])

  return Response.json({
    uploadId: upload.id,
    url: upload.url,
  })
}
