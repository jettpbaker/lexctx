import Mux from '@mux/mux-node'
import { z } from 'zod'
import { env } from '~/env'
import { saveMuxUploadId } from '~/server/actions/sources'

const mux = new Mux({
  tokenId: env.MUX_TOKEN_ID,
  tokenSecret: env.MUX_TOKEN_SECRET,
})

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

  return Response.json({
    uploadId: upload.id,
    url: upload.url,
  })
}
