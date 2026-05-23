import type { VideoStatus } from '~/lib/types/sources'

export type CitationLookup = {
  sourceId: string
  chunkIndex: number
}

export type HydratedCitation = {
  citationId: string
  sourceId: string
  sourceName: string
  collectionId: string
  collectionName: string
  chunkIndex: number
  muxPlaybackId: string | null
  muxBlurDataUrl: string | null
  muxBlurAspectRatio: number | null
  videoStatus: VideoStatus | 'deleted'
  startSeconds: number
  endSeconds: number
}
