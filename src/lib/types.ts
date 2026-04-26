export type AudioStatusType =
  | { stage: 'extraction-queued' }
  | { stage: 'extracting'; progress: number }
  | { stage: 'upload-queued' }
  | { stage: 'uploading'; progress: number }
  | { stage: 'uploaded' }
  | { stage: 'failed'; error: string }

export type VideoStatusType =
  | { stage: 'pending' }
  | { stage: 'uploading'; progress: number }
  | { stage: 'done'; muxPlaybackId: string }

export type LocalSourceType = {
  id: string
  collectionId: string | null
  name: string
  audioStatus: AudioStatusType
  videoStatus: VideoStatusType
  transcriptUrl?: string
  error?: string
  createdAt: Date
}
