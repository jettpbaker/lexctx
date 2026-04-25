import { create } from 'zustand'

type AudioStatus =
  | { stage: 'queued' }
  | { stage: 'extracting'; progress: number }
  | { stage: 'uploading'; progress: number }
  | { stage: 'handed-off'; jobId: string }

type VideoStatus =
  | { stage: 'pending' }
  | { stage: 'uploading'; progress: number }
  | { stage: 'done'; muxPlaybackId: string }

type Source = {
  id: string
  collectionId: string
  name: string
  audioStatus: AudioStatus
  videoStatus: VideoStatus
  transcriptUrl?: string
  error?: string
  createdAt: Date
}

type SourceStore = {
  sources: Record<string, Source>
  addSource: (source: Source) => void
  deleteSource: (id: string) => void
  updateAudioStatus: (id: string, status: AudioStatus) => void
  updateVideoStatus: (id: string, status: VideoStatus) => void
}

export const useSourceStore = create<SourceStore>()((set) => ({
  sources: {},
  addSource: (source) =>
    set((state) => ({
      sources: { ...state.sources, [source.id]: source },
    })),
  deleteSource: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.sources
      return { sources: rest }
    }),
  updateAudioStatus: (id, audioStatus) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [id]: { ...state.sources[id], audioStatus },
      },
    })),
  updateVideoStatus: (id, videoStatus) =>
    set((state) => ({
      sources: {
        ...state.sources,
        [id]: { ...state.sources[id], videoStatus },
      },
    })),
}))
