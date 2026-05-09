import { start } from 'workflow/api'
import { z } from 'zod'
import { getSourceById } from '~/server/actions/sources'
import { pollMuxFinishedProcessing } from '~/workflows/pollMuxFinishedProcessing'

const monitorUploadSchema = z.object({
  sourceId: z.uuid(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const { sourceId } = monitorUploadSchema.parse(body)

  const [source] = await getSourceById(sourceId)
  if (!source?.muxUploadId) {
    return Response.json({ error: 'Mux upload ID not found' }, { status: 404 })
  }

  await start(pollMuxFinishedProcessing, [sourceId, source.muxUploadId])

  return Response.json({ status: 202 })
}
