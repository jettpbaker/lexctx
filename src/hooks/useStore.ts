import { create } from 'zustand'
import { LocalSourceType } from '~/lib/types'

type SourceFiles = {
  video: File
  audio?: File
}

type ActiveType = {
  extracting: string | null
  audioUploading: string | null
  videoUploading: string | null
}

type SourceStore = {
  sources: Record<string, LocalSourceType>
  files: Partial<Record<string, SourceFiles>>

  extractQueue: string[]
  audioUploadQueue: string[]
  videoUploadQueue: string[]

  active: ActiveType

  addSource: (source: LocalSourceType, file: File) => void

  markExtractionStarted: (id: string) => void
  markExtractionCompleted: (id: string, audio: File) => void

  markAudioUploadStarted: (id: string) => void
  markAudioUploadCompleted: (id: string) => void
  markAudioPipelineFailed: (id: string, error: string) => void

  // markVideoUploadStarted: (id: string) => void
  // markVideoUploadCompleted: (id: string) => void

  updateExtractionProgress: (id: string, progress: number) => void
  updateUploadProgress: (id: string, progress: number) => void
}

const addSource = (
  sources: Record<string, LocalSourceType>,
  files: Partial<Record<string, SourceFiles>>,
  source: LocalSourceType,
  file: File,
  queue: string[]
) => {
  return {
    extractQueue: [...queue, source.id],
    sources: { ...sources, [source.id]: source },
    files: { ...files, [source.id]: { video: file } },
  }
}

const markExtractionStarted = (
  id: string,
  sources: Record<string, LocalSourceType>,
  active: ActiveType,
  queue: string[]
): Partial<SourceStore> => ({
  extractQueue: queue.filter((sourceId) => sourceId !== id),
  active: {
    ...active,
    extracting: id,
  },
  sources: {
    ...sources,
    [id]: {
      ...sources[id],
      audioStatus: { stage: 'extracting', progress: 0 },
    },
  },
})

const markExtractionCompleted = (
  id: string,
  sources: Record<string, LocalSourceType>,
  files: Partial<Record<string, SourceFiles>>,
  active: ActiveType,
  queue: string[],
  audio: File
): Partial<SourceStore> => {
  const existingFiles = files[id]
  if (!existingFiles?.video) {
    console.error('Could not find existing video file for ', files[id])
    return {}
  }

  return {
    audioUploadQueue: [...queue, id],
    active: { ...active, extracting: null },
    files: { ...files, [id]: { ...existingFiles, audio } },
    sources: {
      ...sources,
      [id]: {
        ...sources[id],
        audioStatus: { stage: 'upload-queued' },
      },
    },
  }
}

const markAudioUploadStarted = (
  id: string,
  sources: Record<string, LocalSourceType>,
  active: ActiveType,
  queue: string[]
): Partial<SourceStore> => ({
  audioUploadQueue: queue.filter((sourceId) => sourceId !== id),
  active: { ...active, audioUploading: id },
  sources: {
    ...sources,
    [id]: {
      ...sources[id],
      audioStatus: { stage: 'uploading', progress: 0 },
    },
  },
})

const markAudioUploadCompleted = (
  id: string,
  sources: Record<string, LocalSourceType>,
  files: Partial<Record<string, SourceFiles>>,
  active: ActiveType
): Partial<SourceStore> => {
  const { [id]: _, ...restFiles } = files

  return {
    // TODO: Update video upload queue
    // TODO: Mark video upload as active
    active: {
      ...active,
      audioUploading: null,
    },
    files: restFiles,
    sources: {
      ...sources,
      [id]: {
        ...sources[id],
        audioStatus: { stage: 'uploaded' },
      },
    },
  }
}

const markAudioPipelineFailed = (
  id: string,
  error: string,
  sources: Record<string, LocalSourceType>,
  files: Partial<Record<string, SourceFiles>>,
  active: ActiveType,
  extractQueue: string[],
  audioUploadQueue: string[]
): Partial<SourceStore> => {
  const source = sources[id]
  const { [id]: _, ...restFiles } = files

  return {
    extractQueue: extractQueue.filter((sourceId) => sourceId !== id),
    audioUploadQueue: audioUploadQueue.filter((sourceId) => sourceId !== id),
    active: {
      ...active,
      extracting: active.extracting === id ? null : active.extracting,
      audioUploading: active.audioUploading === id ? null : active.audioUploading,
    },
    files: restFiles,
    sources: source
      ? {
          ...sources,
          [id]: {
            ...source,
            audioStatus: { stage: 'failed', error },
            error,
          },
        }
      : sources,
  }
}

const updateExtractionProgress = (
  id: string,
  progress: number,
  sources: Record<string, LocalSourceType>
): Partial<SourceStore> => {
  const source = sources[id]

  if (!source || source.audioStatus.stage !== 'extracting') {
    return {}
  }

  return {
    sources: {
      ...sources,
      [id]: {
        ...source,
        audioStatus: {
          ...source.audioStatus,
          progress,
        },
      },
    },
  }
}

const updateUploadProgress = (
  id: string,
  progress: number,
  sources: Record<string, LocalSourceType>
): Partial<SourceStore> => {
  const source = sources[id]

  if (!source || source.audioStatus.stage !== 'uploading') {
    return {}
  }

  return {
    sources: {
      ...sources,
      [id]: {
        ...source,
        audioStatus: {
          ...source.audioStatus,
          progress,
        },
      },
    },
  }
}
export const useSourceStore = create<SourceStore>()((set) => ({
  sources: {},
  files: {},

  extractQueue: [],
  audioUploadQueue: [],
  videoUploadQueue: [],

  active: {
    extracting: null,
    audioUploading: null,
    videoUploading: null,
  },

  addSource: (source, file) =>
    set((state) => addSource(state.sources, state.files, source, file, state.extractQueue)),

  markExtractionStarted: (id) =>
    set((state) => markExtractionStarted(id, state.sources, state.active, state.extractQueue)),
  markExtractionCompleted: (id, audio) =>
    set((state) =>
      markExtractionCompleted(
        id,
        state.sources,
        state.files,
        state.active,
        state.audioUploadQueue,
        audio
      )
    ),

  markAudioUploadStarted: (id) =>
    set((state) => markAudioUploadStarted(id, state.sources, state.active, state.audioUploadQueue)),
  markAudioUploadCompleted: (id) =>
    set((state) => markAudioUploadCompleted(id, state.sources, state.files, state.active)),
  markAudioPipelineFailed: (id, error) =>
    set((state) =>
      markAudioPipelineFailed(
        id,
        error,
        state.sources,
        state.files,
        state.active,
        state.extractQueue,
        state.audioUploadQueue
      )
    ),

  updateExtractionProgress: (id, progress) =>
    set((state) => updateExtractionProgress(id, progress, state.sources)),
  updateUploadProgress: (id, progress) =>
    set((state) => updateUploadProgress(id, progress, state.sources)),
}))
