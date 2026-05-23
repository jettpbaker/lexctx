import type { SourceUiStatus, VideoUiStatus } from '~/lib/source_status'

export type SourceRowSource = {
  id: string
  name: string
  fileSize: number | null
  createdAt: Date
  status: SourceUiStatus
  videoStatus: VideoUiStatus
}

export type SourceRowAction = (source: SourceRowSource) => void

export type CollectionGroupCollection = {
  id: string
  name: string
  description: string | null
  createdAt: Date
  sources: SourceRowSource[]
}
