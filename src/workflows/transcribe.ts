import { fal } from '@fal-ai/client'

export async function transcribeWorkflow(url: string) {
  'use workflow'

  console.log(
    "Workflow is starting! Run 'bunx workflow web' to inspect your run"
  )
  const result = await transcribe(url)
  console.log(
    "Workflow is complete! Run 'bunx workflow web' to inspect your run"
  )

  console.log(result)
  return result
}

async function transcribe(url: string) {
  'use step'

  const result = await fal.subscribe('fal-ai/wizper', {
    input: {
      audio_url: url,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        update.logs.map((log) => log.message).forEach(console.log)
      }
    },
  })
  console.log(result.data)
  console.log(result.requestId)
  return result
}
