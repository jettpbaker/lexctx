import { fal } from '@fal-ai/client'
import { generateText } from 'ai'
import { sleep } from 'workflow'
import { upsertLectureChunks } from '~/db/chroma'
import {
  INITIAL_TRANSCRIPTION_POLL_DELAY,
  MAX_TRANSCRIPTION_POLLS,
  TRANSCRIPTION_POLL_INTERVAL,
} from '~/lib/constants'
import {
  chunkTranscriptSegments,
  RagChunk,
  TranscriptSegmentForChunking,
} from '~/lib/rag/chunkTranscriptSegments'
import deleteSourceAudio from '~/server/actions/deleteSourceAudio'
import {
  getSourceIndexMetadata,
  upsertRagChunks,
  markSourceFailed,
  markSourceReady,
  saveFalRequestId,
  saveSourceSummary,
  saveSourceTranscript,
} from '~/server/actions/sources'

type WizperResult = {
  data: {
    text: string
    chunks?: WizperChunk[]
  }
}

type WizperChunk = {
  timestamp: unknown[]
  text: string
}

export async function ingestSource(id: string, url: string, key: string) {
  'use workflow'

  const falRequestId = await submitTranscription({ url })
  await persistFalRequestId(id, falRequestId)

  // Initial delay avoids polling before FAL has had time to start processing.
  await sleep(INITIAL_TRANSCRIPTION_POLL_DELAY)

  let transcript: WizperResult | undefined
  for (let attempt = 0; attempt < MAX_TRANSCRIPTION_POLLS; attempt++) {
    try {
      const status = await getTranscriptionStatus(falRequestId)

      if (status.status === 'COMPLETED') {
        transcript = await getTranscriptionResult(falRequestId)
        break
      }

      await sleep(TRANSCRIPTION_POLL_INTERVAL)
    } catch (error) {
      console.error('Transcribe error: ', error)

      if (error instanceof Error) {
        await persistSourceFailed(id, error.message)
        return
      }

      if (typeof error === 'string') {
        await persistSourceFailed(id, error)
        return
      }

      await persistSourceFailed(id, 'Transcription encountered an unknown error')
      return
    }
  }

  if (!transcript?.data.chunks) {
    await persistSourceFailed(id, 'Transcription returned no chunks')
    return
  }

  const transcriptSegments: TranscriptSegmentForChunking[] = normalizeTranscriptSegments(
    transcript.data.chunks
  )

  await persistSourceTranscript(id, transcript.data.text, transcriptSegments)
  const summaryPromise = generateAndPersistSourceSummary(id, transcript.data.text)

  try {
    await deleteSourceAudioFile(id, key)
  } catch (error) {
    console.error('Error deleting source audio file: ', error)
  }

  const chunks = await createRagChunks(transcriptSegments)
  await persistRagChunks(id, chunks)

  const sourceMetadata = await loadSourceIndexMetadata(id)
  await indexRagChunks(sourceMetadata, chunks)

  await summaryPromise
  await persistSourceReady(id)
}

function normalizeTranscriptSegments(chunks: WizperChunk[]) {
  return chunks.map((chunk, index) => {
    const [startSeconds, endSeconds] = chunk.timestamp

    if (typeof startSeconds !== 'number' || typeof endSeconds !== 'number') {
      throw new Error(`Invalid timestamp for transcript chunk ${index}`)
    }

    return {
      index,
      startSeconds,
      endSeconds,
      text: chunk.text,
    }
  })
}

async function submitTranscription(input: { url: string }) {
  'use step'

  const queued = await fal.queue.submit('fal-ai/wizper', {
    input: {
      audio_url: input.url,
    },
  })

  return queued.request_id
}

async function persistFalRequestId(sourceId: string, requestId: string) {
  'use step'

  await saveFalRequestId(sourceId, requestId)
}

async function generateAndPersistSourceSummary(sourceId: string, transcriptText: string) {
  'use step'

  try {
    const response = await generateText({
      model: 'google/gemini-3.1-flash-lite',
      prompt: `Write a concise, factual 3-4 sentence summary of this source transcript. Use plain text only. Do not use markdown, headings, bullets, or introductory phrases. Do not speculate beyond the transcript.\n\nTranscript:\n${transcriptText}`,
    })

    await saveSourceSummary(sourceId, response.text.trim())
  } catch (error) {
    console.error('Error generating source summary: ', error)
  }
}

async function getTranscriptionStatus(requestId: string) {
  'use step'

  return fal.queue.status('fal-ai/wizper', { requestId })
}

async function getTranscriptionResult(requestId: string): Promise<WizperResult> {
  'use step'

  return fal.queue.result('fal-ai/wizper', { requestId })
}

async function persistSourceTranscript(
  sourceId: string,
  transcriptText: string,
  segments: ReturnType<typeof normalizeTranscriptSegments>
) {
  'use step'

  await saveSourceTranscript(sourceId, transcriptText, segments)
}

async function persistSourceFailed(sourceId: string, error: string) {
  'use step'

  await markSourceFailed(sourceId, error)
}

async function persistSourceReady(sourceId: string) {
  'use step'

  await markSourceReady(sourceId)
}

async function createRagChunks(segments: TranscriptSegmentForChunking[]) {
  'use step'

  return chunkTranscriptSegments(segments)
}

async function persistRagChunks(sourceId: string, chunks: RagChunk[]) {
  'use step'

  await upsertRagChunks(sourceId, chunks)
}

async function loadSourceIndexMetadata(sourceId: string) {
  'use step'

  return getSourceIndexMetadata(sourceId)
}

async function deleteSourceAudioFile(sourceId: string, key: string) {
  'use step'

  await deleteSourceAudio(sourceId, key)
}

async function indexRagChunks(
  sourceMetadata: Awaited<ReturnType<typeof getSourceIndexMetadata>>,
  chunks: RagChunk[]
) {
  'use step'

  await upsertLectureChunks(sourceMetadata, chunks)
}
