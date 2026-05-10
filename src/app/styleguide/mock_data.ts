import type { CollectionGroupCollection } from '~/components/sources/collection_group'
import type { SourceRowSource } from '~/components/sources/source_row'
import type { SourceUiStatus, VideoUiStatus } from '~/lib/source_status'
import type { HydratedCitation } from '~/server/actions/getCitationHydrationByIds'

const now = new Date()
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000)
const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60_000)
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60_000)

// Default video status for fixtures that don't care about the chip — matches
// the realistic shape: video catches up after chat is ready, fails are rare,
// and rows in early audio stages haven't started video yet.
const defaultVideoFor = (status: SourceUiStatus): VideoUiStatus => {
  switch (status.kind) {
    case 'ready':
      return { kind: 'ready' }
    case 'failed':
      return status.failedDuring === 'upload' ? { kind: 'pending' } : { kind: 'ready' }
    case 'transcribing':
    case 'indexing':
      return { kind: 'processing' }
    default:
      return { kind: 'pending' }
  }
}

type RowInput = Omit<SourceRowSource, 'videoStatus'> & {
  videoStatus?: VideoUiStatus
}

const row = (input: RowInput): SourceRowSource => ({
  ...input,
  videoStatus: input.videoStatus ?? defaultVideoFor(input.status),
})

export const STATUS_GALLERY: { label: string; status: SourceUiStatus }[] = [
  { label: 'Queued', status: { kind: 'queued' } },
  { label: 'Hashing 25%', status: { kind: 'hashing', progress: 0.25 } },
  { label: 'Hashing 80%', status: { kind: 'hashing', progress: 0.8 } },
  { label: 'Extracting 40%', status: { kind: 'extracting', progress: 0.4 } },
  { label: 'Uploading 30%', status: { kind: 'uploading', progress: 0.3 } },
  { label: 'Uploading 95%', status: { kind: 'uploading', progress: 0.95 } },
  { label: 'Transcribing', status: { kind: 'transcribing' } },
  { label: 'Indexing', status: { kind: 'indexing' } },
  { label: 'Ready', status: { kind: 'ready' } },
  {
    label: 'Failed (upload)',
    status: {
      kind: 'failed',
      failedDuring: 'upload',
      error: 'Network timeout while uploading audio',
    },
  },
  {
    label: 'Failed (process)',
    status: {
      kind: 'failed',
      failedDuring: 'process',
      error: 'Upstream embed timeout: 504',
    },
  },
]

/**
 * Video chip states isolated from chat status — chat is fixed at `ready` so
 * the only thing on the row is the chip. Iterate styling here.
 */
export const VIDEO_CHIP_GALLERY: { label: string; videoStatus: VideoUiStatus }[] = [
  { label: 'Pending (chip hidden)', videoStatus: { kind: 'pending' } },
  { label: 'Uploading 12%', videoStatus: { kind: 'uploading', progress: 0.12 } },
  { label: 'Uploading 47%', videoStatus: { kind: 'uploading', progress: 0.47 } },
  { label: 'Uploading 100%', videoStatus: { kind: 'uploading', progress: 1 } },
  { label: 'Processing (Mux)', videoStatus: { kind: 'processing' } },
  { label: 'Ready (chip hidden)', videoStatus: { kind: 'ready' } },
  {
    label: 'Failed',
    videoStatus: { kind: 'failed', error: 'Mux asset errored: input format unsupported' },
  },
]

export const ROW_GALLERY: SourceRowSource[] = [
  row({
    id: 'row-queued',
    name: 'Lecture_05_Queued.mp4',
    fileSize: 312_000_000,
    createdAt: minutesAgo(1),
    status: { kind: 'queued' },
  }),
  row({
    id: 'row-hashing',
    name: 'Lecture_06_Hashing.mp4',
    fileSize: 478_000_000,
    createdAt: minutesAgo(2),
    status: { kind: 'hashing', progress: 0.42 },
  }),
  row({
    id: 'row-uploading',
    name: 'Lecture_07_Uploading_a_quite_long_filename_with_extra.mp4',
    fileSize: 1_240_000_000,
    createdAt: minutesAgo(4),
    status: { kind: 'uploading', progress: 0.61 },
  }),
  row({
    id: 'row-transcribing',
    name: 'Lecture_08_Transcribing.mp4',
    fileSize: 384_000_000,
    createdAt: minutesAgo(8),
    status: { kind: 'transcribing' },
    videoStatus: { kind: 'uploading', progress: 0.34 },
  }),
  row({
    id: 'row-indexing',
    name: 'Lecture_09_Indexing.mp4',
    fileSize: 220_000_000,
    createdAt: minutesAgo(15),
    status: { kind: 'indexing' },
    videoStatus: { kind: 'processing' },
  }),
  row({
    id: 'row-ready-video-uploading',
    name: 'Lecture_10_Ready_video_still_uploading.mp4',
    fileSize: 612_000_000,
    createdAt: minutesAgo(18),
    status: { kind: 'ready' },
    videoStatus: { kind: 'uploading', progress: 0.78 },
  }),
  row({
    id: 'row-ready-video-processing',
    name: 'Lecture_11_Ready_video_processing.mp4',
    fileSize: 488_000_000,
    createdAt: minutesAgo(22),
    status: { kind: 'ready' },
    videoStatus: { kind: 'processing' },
  }),
  row({
    id: 'row-ready-video-failed',
    name: 'Lecture_12_Ready_video_failed.mp4',
    fileSize: 322_000_000,
    createdAt: hoursAgo(1),
    status: { kind: 'ready' },
    videoStatus: { kind: 'failed', error: 'Mux: input format unsupported' },
  }),
  row({
    id: 'row-ready',
    name: 'Lecture_01_Ready.mp4',
    fileSize: 156_000_000,
    createdAt: hoursAgo(2),
    status: { kind: 'ready' },
  }),
  row({
    id: 'row-failed-upload',
    name: 'Lecture_failed_upload.mp4',
    fileSize: 412_000_000,
    createdAt: hoursAgo(4),
    status: {
      kind: 'failed',
      failedDuring: 'upload',
      error: 'Network timeout after 3 retries while uploading audio',
    },
  }),
  row({
    id: 'row-failed-process',
    name: 'Lecture_failed_process.mp4',
    fileSize: 268_000_000,
    createdAt: hoursAgo(6),
    status: {
      kind: 'failed',
      failedDuring: 'process',
      error: 'Upstream embed timeout: 504 — chunk 4/12',
    },
  }),
]

/** Rows showing chat=ready while video chip varies. The "I came back, what's
 *  pending?" surface — the chip is the only signal on these rows. */
export const VIDEO_CHIP_ROWS: SourceRowSource[] = VIDEO_CHIP_GALLERY.map((entry, index) => ({
  id: `video-chip-row-${index}`,
  name: `Lecture_chip_${entry.label.replace(/\s+/g, '_')}.mp4`,
  fileSize: 256_000_000,
  createdAt: minutesAgo(index * 2 + 1),
  status: { kind: 'ready' },
  videoStatus: entry.videoStatus,
}))

export const COLLECTIONS_GALLERY: CollectionGroupCollection[] = [
  {
    id: 'col-ifb102',
    name: 'IFB102 — Software Architecture',
    description:
      'Software Architecture in industry, weeks 1–13. Covers patterns, distributed systems, and case studies.',
    createdAt: daysAgo(34),
    sources: [
      row({
        id: 's-102-1',
        name: 'Week01_Intro.mp4',
        fileSize: 156_000_000,
        createdAt: daysAgo(34),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-102-2',
        name: 'Week02_Patterns.mp4',
        fileSize: 184_000_000,
        createdAt: daysAgo(27),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-102-3',
        name: 'Week03_Distributed_Systems.mp4',
        fileSize: 211_000_000,
        createdAt: daysAgo(20),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-102-4',
        name: 'Week04_CaseStudies.mp4',
        fileSize: 242_000_000,
        createdAt: minutesAgo(3),
        status: { kind: 'transcribing' },
        videoStatus: { kind: 'uploading', progress: 0.41 },
      }),
      row({
        id: 's-102-5',
        name: 'Week04_Tutorial.mp4',
        fileSize: 1_240_000_000,
        createdAt: minutesAgo(2),
        status: { kind: 'uploading', progress: 0.71 },
      }),
      row({
        id: 's-102-6',
        name: 'Week05_Patterns_part2.mp4',
        fileSize: 312_000_000,
        createdAt: minutesAgo(30),
        status: { kind: 'ready' },
        videoStatus: { kind: 'processing' },
      }),
    ],
  },
  {
    id: 'col-ifb103',
    name: 'IFB103 — Algorithms',
    description: null,
    createdAt: daysAgo(20),
    sources: [
      row({
        id: 's-103-1',
        name: 'Week01_Sorting.mp4',
        fileSize: 178_000_000,
        createdAt: daysAgo(20),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-103-2',
        name: 'Week02_Searching.mp4',
        fileSize: 192_000_000,
        createdAt: daysAgo(13),
        status: { kind: 'ready' },
        videoStatus: { kind: 'failed', error: 'Mux: input format unsupported' },
      }),
      row({
        id: 's-103-3',
        name: 'Week03_Graphs.mp4',
        fileSize: 224_000_000,
        createdAt: hoursAgo(6),
        status: {
          kind: 'failed',
          failedDuring: 'process',
          error: 'Upstream embed timeout: 504 — chunk 4/12',
        },
      }),
    ],
  },
  {
    id: 'col-personal',
    name: 'Personal',
    description: 'Saved talks and reference videos.',
    createdAt: daysAgo(60),
    sources: [
      row({
        id: 's-pers-1',
        name: 'Bret_Victor_Inventing_on_Principle.mp4',
        fileSize: 412_000_000,
        createdAt: daysAgo(60),
        status: { kind: 'ready' },
      }),
    ],
  },
  {
    id: 'col-empty',
    name: 'IFB104 — Networks',
    description: null,
    createdAt: daysAgo(1),
    sources: [],
  },
  {
    id: 'col-ifb101',
    name: 'IFB101 — Operating Systems',
    description: 'Full semester recordings — processes, scheduling, memory, file systems.',
    createdAt: daysAgo(120),
    sources: [
      row({
        id: 's-101-1',
        name: 'Week01_Processes.mp4',
        fileSize: 198_000_000,
        createdAt: daysAgo(120),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-101-2',
        name: 'Week02_Scheduling.mp4',
        fileSize: 212_000_000,
        createdAt: daysAgo(113),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-101-3',
        name: 'Week03_Memory_Management.mp4',
        fileSize: 256_000_000,
        createdAt: daysAgo(106),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-101-4',
        name: 'Week04_Virtual_Memory.mp4',
        fileSize: 248_000_000,
        createdAt: daysAgo(99),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-101-5',
        name: 'Week05_File_Systems.mp4',
        fileSize: 234_000_000,
        createdAt: daysAgo(92),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-101-6',
        name: 'Week06_Concurrency.mp4',
        fileSize: 267_000_000,
        createdAt: daysAgo(85),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-101-7',
        name: 'Week07_Deadlocks.mp4',
        fileSize: 189_000_000,
        createdAt: daysAgo(78),
        status: { kind: 'ready' },
      }),
    ],
  },
  {
    id: 'col-ifb105',
    name: 'IFB105 — Computer Graphics',
    description: 'Rasterization, shading, ray tracing fundamentals.',
    createdAt: daysAgo(12),
    sources: [
      row({
        id: 's-105-1',
        name: 'Week01_Rasterization.mp4',
        fileSize: 312_000_000,
        createdAt: daysAgo(12),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-105-2',
        name: 'Week02_Shading.mp4',
        fileSize: 298_000_000,
        createdAt: daysAgo(5),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-105-3',
        name: 'Week03_Ray_Tracing_Intro.mp4',
        fileSize: 412_000_000,
        createdAt: minutesAgo(12),
        status: { kind: 'indexing' },
        videoStatus: { kind: 'processing' },
      }),
      row({
        id: 's-105-4',
        name: 'Week03_Ray_Tracing_Tutorial.mp4',
        fileSize: 528_000_000,
        createdAt: minutesAgo(8),
        status: { kind: 'extracting', progress: 0.34 },
      }),
      row({
        id: 's-105-5',
        name: 'Week03_Ray_Tracing_Lab.mp4',
        fileSize: 624_000_000,
        createdAt: minutesAgo(1),
        status: { kind: 'hashing', progress: 0.12 },
      }),
    ],
  },
  {
    id: 'col-mab214',
    name: 'MAB214 — Linear Algebra',
    description: null,
    createdAt: daysAgo(180),
    sources: [
      row({
        id: 's-214-1',
        name: 'L01_Vectors_and_Spaces.mp4',
        fileSize: 142_000_000,
        createdAt: daysAgo(180),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-214-2',
        name: 'L02_Matrices.mp4',
        fileSize: 168_000_000,
        createdAt: daysAgo(173),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-214-3',
        name: 'L03_Determinants.mp4',
        fileSize: 154_000_000,
        createdAt: daysAgo(166),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-214-4',
        name: 'L04_Eigenvalues.mp4',
        fileSize: 188_000_000,
        createdAt: daysAgo(159),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-214-5',
        name: 'L05_Diagonalization.mp4',
        fileSize: 176_000_000,
        createdAt: daysAgo(152),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-214-6',
        name: 'L06_Inner_Product_Spaces.mp4',
        fileSize: 198_000_000,
        createdAt: daysAgo(145),
        status: { kind: 'ready' },
      }),
    ],
  },
  {
    id: 'col-reading',
    name: 'Reading list',
    description: 'Talks and papers worth revisiting.',
    createdAt: daysAgo(45),
    sources: [
      row({
        id: 's-read-1',
        name: 'Alan_Kay_The_Future_of_Programming.mp4',
        fileSize: 384_000_000,
        createdAt: daysAgo(45),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-read-2',
        name: 'Joe_Armstrong_The_Mess_Were_In.mp4',
        fileSize: 298_000_000,
        createdAt: daysAgo(38),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-read-3',
        name: 'Rich_Hickey_Simple_Made_Easy.mp4',
        fileSize: 412_000_000,
        createdAt: daysAgo(31),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-read-4',
        name: 'Carmack_Functional_Programming_in_Cpp.mp4',
        fileSize: 356_000_000,
        createdAt: minutesAgo(40),
        status: { kind: 'transcribing' },
        videoStatus: { kind: 'uploading', progress: 0.88 },
      }),
    ],
  },
  {
    id: 'col-conference',
    name: 'Conference talks 2025',
    description: null,
    createdAt: daysAgo(7),
    sources: [
      row({
        id: 's-conf-1',
        name: 'Strange_Loop_2025_Keynote.mp4',
        fileSize: 1_120_000_000,
        createdAt: daysAgo(7),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-conf-2',
        name: 'Strange_Loop_2025_Day1_Compilers.mp4',
        fileSize: 924_000_000,
        createdAt: daysAgo(6),
        status: { kind: 'ready' },
      }),
      row({
        id: 's-conf-3',
        name: 'Strange_Loop_2025_Day1_Distributed.mp4',
        fileSize: 1_020_000_000,
        createdAt: hoursAgo(20),
        status: {
          kind: 'failed',
          failedDuring: 'process',
          error: 'Audio extraction failed: codec unsupported',
        },
      }),
      row({
        id: 's-conf-4',
        name: 'Strange_Loop_2025_Day2_Languages.mp4',
        fileSize: 856_000_000,
        createdAt: minutesAgo(22),
        status: { kind: 'uploading', progress: 0.43 },
      }),
      row({
        id: 's-conf-5',
        name: 'Strange_Loop_2025_Day2_Closing.mp4',
        fileSize: 980_000_000,
        createdAt: minutesAgo(6),
        status: { kind: 'queued' },
      }),
    ],
  },
]

function citation(
  input: Partial<HydratedCitation> & { videoStatus: HydratedCitation['videoStatus'] }
): HydratedCitation {
  const videoStatus = input.videoStatus
  return {
    citationId: input.citationId ?? `mock-source:chunk:${input.chunkIndex ?? 0}`,
    sourceId: input.sourceId ?? 'mock-source',
    sourceName: input.sourceName ?? 'Lecture_03_compilers.mp4',
    collectionId: input.collectionId ?? 'mock-collection',
    collectionName: input.collectionName ?? 'CS50',
    chunkIndex: input.chunkIndex ?? 0,
    startSeconds: input.startSeconds ?? 0,
    endSeconds: input.endSeconds ?? 30,
    muxPlaybackId: input.muxPlaybackId ?? (videoStatus === 'ready' ? 'mock-playback-id' : null),
    muxBlurDataUrl: input.muxBlurDataUrl ?? null,
    muxBlurAspectRatio: input.muxBlurAspectRatio ?? null,
    videoStatus,
  }
}

export const CITATION_CHIP_GALLERY: { label: string; citation: HydratedCitation | null }[] = [
  { label: 'Pending hydration (skeleton)', citation: null },
  {
    label: 'Ready (playable)',
    citation: citation({ videoStatus: 'ready', sourceName: 'cs50-10m-aac.mp4' }),
  },
  {
    label: 'Ready, very long source name',
    citation: citation({
      videoStatus: 'ready',
      sourceName: 'really_long_lecture_title_about_binary_and_compilers.mp4',
    }),
  },
  {
    label: 'Processing',
    citation: citation({ videoStatus: 'processing', sourceName: 'lecture_05_recursion.mp4' }),
  },
  {
    label: 'Uploading',
    citation: citation({ videoStatus: 'uploading', sourceName: 'lecture_06_arrays.mp4' }),
  },
  {
    label: 'Pending upload',
    citation: citation({ videoStatus: 'pending_upload', sourceName: 'lecture_07_strings.mp4' }),
  },
  {
    label: 'Failed',
    citation: citation({ videoStatus: 'failed', sourceName: 'lecture_08_memory.mp4' }),
  },
]
