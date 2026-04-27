import {
  MAX_RAG_CHUNK_WORDS,
  RAG_CHUNK_OVERLAP_WORDS,
  TARGET_RAG_CHUNK_WORDS,
} from '~/lib/constants'

export type TranscriptSegmentForChunking = {
  index: number
  startSeconds: number
  endSeconds: number
  text: string
}

export type RagChunk = {
  index: number
  text: string
  startSeconds: number
  endSeconds: number
  segmentStartIndex: number
  segmentEndIndex: number
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function createChunk(index: number, segments: TranscriptSegmentForChunking[]): RagChunk {
  const first = segments[0]
  const last = segments.at(-1)

  if (!first || !last) {
    throw new Error('Cannot create a chunk from no segments')
  }

  return {
    index,
    text: segments.map((segment) => segment.text).join(' '),
    startSeconds: first.startSeconds,
    endSeconds: last.endSeconds,
    segmentStartIndex: first.index,
    segmentEndIndex: last.index,
  }
}

function getOverlapSegments(currentSegments: TranscriptSegmentForChunking[]) {
  let overlapSegments: TranscriptSegmentForChunking[] = []
  let currentWordCount = 0

  const reversed = currentSegments.toReversed()

  for (const segment of reversed) {
    overlapSegments.push(segment)
    currentWordCount += countWords(segment.text)

    if (currentWordCount >= RAG_CHUNK_OVERLAP_WORDS) {
      break
    }
  }

  return overlapSegments.reverse()
}

export function chunkTranscriptSegments(segments: TranscriptSegmentForChunking[]): RagChunk[] {
  const chunks: RagChunk[] = []
  let currentSegments: TranscriptSegmentForChunking[] = []
  let currentWordCount = 0

  for (const segment of segments) {
    const segmentWordCount = countWords(segment.text)

    if (currentSegments.length > 0 && currentWordCount + segmentWordCount >= MAX_RAG_CHUNK_WORDS) {
      chunks.push(createChunk(chunks.length, currentSegments))
      currentSegments = getOverlapSegments(currentSegments)
      currentWordCount = currentSegments.reduce(
        (total, segment) => total + countWords(segment.text),
        0
      )
    }

    currentSegments.push(segment)
    currentWordCount += countWords(segment.text)

    if (currentWordCount >= TARGET_RAG_CHUNK_WORDS) {
      chunks.push(createChunk(chunks.length, currentSegments))
      currentSegments = getOverlapSegments(currentSegments)
      currentWordCount = currentSegments.reduce(
        (total, segment) => total + countWords(segment.text),
        0
      )
    }
  }

  if (currentSegments.length > 0) {
    chunks.push(createChunk(chunks.length, currentSegments))
  }

  return chunks
}
