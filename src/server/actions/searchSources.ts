'use server'

import type { SearchResultRow } from 'chromadb'

import { hybridSearch } from '~/db/chroma'

import { getSourceVideoDataByIds } from './sources'

export type LectureChunkSearchMetadata = {
  sourceId: string
  sourceName: string
  collectionId: string
  collectionName: string
  chunkIndex: number
  startSeconds: number
  endSeconds: number
  muxPlaybackId: string | null
  videoStatus: 'pending_upload' | 'uploading' | 'processing' | 'ready' | 'failed' | null
}

export type LectureChunkSearchResult = SearchResultRow & {
  citationId: string
  document: string
  metadata: LectureChunkSearchMetadata
  score: number
}

export async function searchSources(query: string): Promise<LectureChunkSearchResult[]> {
  const results = await hybridSearch(query)

  const typedResults = results.map((result) => ({
    ...result,
    metadata: result.metadata as LectureChunkSearchMetadata,
  }))

  const sourceIds = [...new Set(typedResults.map((result) => result.metadata.sourceId))]

  console.log('sourceIds', sourceIds)
  const sourceVideoData = await getSourceVideoDataByIds(sourceIds)
  console.log('sourceVideoData', sourceVideoData)
  const sourceVideoDataMap = new Map(sourceVideoData.map((data) => [data.sourceId, data]))

  return typedResults.map((result, index) => {
    const sourceVideoData = sourceVideoDataMap.get(result.metadata.sourceId)

    return {
      id: result.id,
      citationId: `S${index + 1}`,
      document: result.document ?? '',
      metadata: {
        ...result.metadata,
        muxPlaybackId: sourceVideoData?.muxPlaybackId ?? null,
        videoStatus: sourceVideoData?.videoStatus ?? null,
      },

      score: result.score ?? 0,
    }
  })
}
