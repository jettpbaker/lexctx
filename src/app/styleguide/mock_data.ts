import type { CollectionGroupCollection } from '~/components/sources/collection_group'
import type { SourceRowSource } from '~/components/sources/source_row'
import type { SourceUiStatus } from '~/lib/source_status'

const now = new Date()
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000)
const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60_000)
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60_000)

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

export const ROW_GALLERY: SourceRowSource[] = [
  {
    id: 'row-queued',
    name: 'Lecture_05_Queued.mp4',
    fileSize: 312_000_000,
    createdAt: minutesAgo(1),
    status: { kind: 'queued' },
  },
  {
    id: 'row-hashing',
    name: 'Lecture_06_Hashing.mp4',
    fileSize: 478_000_000,
    createdAt: minutesAgo(2),
    status: { kind: 'hashing', progress: 0.42 },
  },
  {
    id: 'row-uploading',
    name: 'Lecture_07_Uploading_a_quite_long_filename_with_extra.mp4',
    fileSize: 1_240_000_000,
    createdAt: minutesAgo(4),
    status: { kind: 'uploading', progress: 0.61 },
  },
  {
    id: 'row-transcribing',
    name: 'Lecture_08_Transcribing.mp4',
    fileSize: 384_000_000,
    createdAt: minutesAgo(8),
    status: { kind: 'transcribing' },
  },
  {
    id: 'row-indexing',
    name: 'Lecture_09_Indexing.mp4',
    fileSize: 220_000_000,
    createdAt: minutesAgo(15),
    status: { kind: 'indexing' },
  },
  {
    id: 'row-ready',
    name: 'Lecture_01_Ready.mp4',
    fileSize: 156_000_000,
    createdAt: hoursAgo(2),
    status: { kind: 'ready' },
  },
  {
    id: 'row-failed-upload',
    name: 'Lecture_failed_upload.mp4',
    fileSize: 412_000_000,
    createdAt: hoursAgo(4),
    status: {
      kind: 'failed',
      failedDuring: 'upload',
      error: 'Network timeout after 3 retries while uploading audio',
    },
  },
  {
    id: 'row-failed-process',
    name: 'Lecture_failed_process.mp4',
    fileSize: 268_000_000,
    createdAt: hoursAgo(6),
    status: {
      kind: 'failed',
      failedDuring: 'process',
      error: 'Upstream embed timeout: 504 — chunk 4/12',
    },
  },
]

export const COLLECTIONS_GALLERY: CollectionGroupCollection[] = [
  {
    id: 'col-ifb102',
    name: 'IFB102 — Software Architecture',
    description:
      'Software Architecture in industry, weeks 1–13. Covers patterns, distributed systems, and case studies.',
    createdAt: daysAgo(34),
    sources: [
      {
        id: 's-102-1',
        name: 'Week01_Intro.mp4',
        fileSize: 156_000_000,
        createdAt: daysAgo(34),
        status: { kind: 'ready' },
      },
      {
        id: 's-102-2',
        name: 'Week02_Patterns.mp4',
        fileSize: 184_000_000,
        createdAt: daysAgo(27),
        status: { kind: 'ready' },
      },
      {
        id: 's-102-3',
        name: 'Week03_Distributed_Systems.mp4',
        fileSize: 211_000_000,
        createdAt: daysAgo(20),
        status: { kind: 'ready' },
      },
      {
        id: 's-102-4',
        name: 'Week04_CaseStudies.mp4',
        fileSize: 242_000_000,
        createdAt: minutesAgo(3),
        status: { kind: 'transcribing' },
      },
      {
        id: 's-102-5',
        name: 'Week04_Tutorial.mp4',
        fileSize: 1_240_000_000,
        createdAt: minutesAgo(2),
        status: { kind: 'uploading', progress: 0.71 },
      },
    ],
  },
  {
    id: 'col-ifb103',
    name: 'IFB103 — Algorithms',
    description: null,
    createdAt: daysAgo(20),
    sources: [
      {
        id: 's-103-1',
        name: 'Week01_Sorting.mp4',
        fileSize: 178_000_000,
        createdAt: daysAgo(20),
        status: { kind: 'ready' },
      },
      {
        id: 's-103-2',
        name: 'Week02_Searching.mp4',
        fileSize: 192_000_000,
        createdAt: daysAgo(13),
        status: { kind: 'ready' },
      },
      {
        id: 's-103-3',
        name: 'Week03_Graphs.mp4',
        fileSize: 224_000_000,
        createdAt: hoursAgo(6),
        status: {
          kind: 'failed',
          failedDuring: 'process',
          error: 'Upstream embed timeout: 504 — chunk 4/12',
        },
      },
    ],
  },
  {
    id: 'col-personal',
    name: 'Personal',
    description: 'Saved talks and reference videos.',
    createdAt: daysAgo(60),
    sources: [
      {
        id: 's-pers-1',
        name: 'Bret_Victor_Inventing_on_Principle.mp4',
        fileSize: 412_000_000,
        createdAt: daysAgo(60),
        status: { kind: 'ready' },
      },
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
      {
        id: 's-101-1',
        name: 'Week01_Processes.mp4',
        fileSize: 198_000_000,
        createdAt: daysAgo(120),
        status: { kind: 'ready' },
      },
      {
        id: 's-101-2',
        name: 'Week02_Scheduling.mp4',
        fileSize: 212_000_000,
        createdAt: daysAgo(113),
        status: { kind: 'ready' },
      },
      {
        id: 's-101-3',
        name: 'Week03_Memory_Management.mp4',
        fileSize: 256_000_000,
        createdAt: daysAgo(106),
        status: { kind: 'ready' },
      },
      {
        id: 's-101-4',
        name: 'Week04_Virtual_Memory.mp4',
        fileSize: 248_000_000,
        createdAt: daysAgo(99),
        status: { kind: 'ready' },
      },
      {
        id: 's-101-5',
        name: 'Week05_File_Systems.mp4',
        fileSize: 234_000_000,
        createdAt: daysAgo(92),
        status: { kind: 'ready' },
      },
      {
        id: 's-101-6',
        name: 'Week06_Concurrency.mp4',
        fileSize: 267_000_000,
        createdAt: daysAgo(85),
        status: { kind: 'ready' },
      },
      {
        id: 's-101-7',
        name: 'Week07_Deadlocks.mp4',
        fileSize: 189_000_000,
        createdAt: daysAgo(78),
        status: { kind: 'ready' },
      },
    ],
  },
  {
    id: 'col-ifb105',
    name: 'IFB105 — Computer Graphics',
    description: 'Rasterization, shading, ray tracing fundamentals.',
    createdAt: daysAgo(12),
    sources: [
      {
        id: 's-105-1',
        name: 'Week01_Rasterization.mp4',
        fileSize: 312_000_000,
        createdAt: daysAgo(12),
        status: { kind: 'ready' },
      },
      {
        id: 's-105-2',
        name: 'Week02_Shading.mp4',
        fileSize: 298_000_000,
        createdAt: daysAgo(5),
        status: { kind: 'ready' },
      },
      {
        id: 's-105-3',
        name: 'Week03_Ray_Tracing_Intro.mp4',
        fileSize: 412_000_000,
        createdAt: minutesAgo(12),
        status: { kind: 'indexing' },
      },
      {
        id: 's-105-4',
        name: 'Week03_Ray_Tracing_Tutorial.mp4',
        fileSize: 528_000_000,
        createdAt: minutesAgo(8),
        status: { kind: 'extracting', progress: 0.34 },
      },
      {
        id: 's-105-5',
        name: 'Week03_Ray_Tracing_Lab.mp4',
        fileSize: 624_000_000,
        createdAt: minutesAgo(1),
        status: { kind: 'hashing', progress: 0.12 },
      },
    ],
  },
  {
    id: 'col-mab214',
    name: 'MAB214 — Linear Algebra',
    description: null,
    createdAt: daysAgo(180),
    sources: [
      {
        id: 's-214-1',
        name: 'L01_Vectors_and_Spaces.mp4',
        fileSize: 142_000_000,
        createdAt: daysAgo(180),
        status: { kind: 'ready' },
      },
      {
        id: 's-214-2',
        name: 'L02_Matrices.mp4',
        fileSize: 168_000_000,
        createdAt: daysAgo(173),
        status: { kind: 'ready' },
      },
      {
        id: 's-214-3',
        name: 'L03_Determinants.mp4',
        fileSize: 154_000_000,
        createdAt: daysAgo(166),
        status: { kind: 'ready' },
      },
      {
        id: 's-214-4',
        name: 'L04_Eigenvalues.mp4',
        fileSize: 188_000_000,
        createdAt: daysAgo(159),
        status: { kind: 'ready' },
      },
      {
        id: 's-214-5',
        name: 'L05_Diagonalization.mp4',
        fileSize: 176_000_000,
        createdAt: daysAgo(152),
        status: { kind: 'ready' },
      },
      {
        id: 's-214-6',
        name: 'L06_Inner_Product_Spaces.mp4',
        fileSize: 198_000_000,
        createdAt: daysAgo(145),
        status: { kind: 'ready' },
      },
    ],
  },
  {
    id: 'col-reading',
    name: 'Reading list',
    description: 'Talks and papers worth revisiting.',
    createdAt: daysAgo(45),
    sources: [
      {
        id: 's-read-1',
        name: 'Alan_Kay_The_Future_of_Programming.mp4',
        fileSize: 384_000_000,
        createdAt: daysAgo(45),
        status: { kind: 'ready' },
      },
      {
        id: 's-read-2',
        name: 'Joe_Armstrong_The_Mess_Were_In.mp4',
        fileSize: 298_000_000,
        createdAt: daysAgo(38),
        status: { kind: 'ready' },
      },
      {
        id: 's-read-3',
        name: 'Rich_Hickey_Simple_Made_Easy.mp4',
        fileSize: 412_000_000,
        createdAt: daysAgo(31),
        status: { kind: 'ready' },
      },
      {
        id: 's-read-4',
        name: 'Carmack_Functional_Programming_in_Cpp.mp4',
        fileSize: 356_000_000,
        createdAt: minutesAgo(40),
        status: { kind: 'transcribing' },
      },
    ],
  },
  {
    id: 'col-conference',
    name: 'Conference talks 2025',
    description: null,
    createdAt: daysAgo(7),
    sources: [
      {
        id: 's-conf-1',
        name: 'Strange_Loop_2025_Keynote.mp4',
        fileSize: 1_120_000_000,
        createdAt: daysAgo(7),
        status: { kind: 'ready' },
      },
      {
        id: 's-conf-2',
        name: 'Strange_Loop_2025_Day1_Compilers.mp4',
        fileSize: 924_000_000,
        createdAt: daysAgo(6),
        status: { kind: 'ready' },
      },
      {
        id: 's-conf-3',
        name: 'Strange_Loop_2025_Day1_Distributed.mp4',
        fileSize: 1_020_000_000,
        createdAt: hoursAgo(20),
        status: {
          kind: 'failed',
          failedDuring: 'process',
          error: 'Audio extraction failed: codec unsupported',
        },
      },
      {
        id: 's-conf-4',
        name: 'Strange_Loop_2025_Day2_Languages.mp4',
        fileSize: 856_000_000,
        createdAt: minutesAgo(22),
        status: { kind: 'uploading', progress: 0.43 },
      },
      {
        id: 's-conf-5',
        name: 'Strange_Loop_2025_Day2_Closing.mp4',
        fileSize: 980_000_000,
        createdAt: minutesAgo(6),
        status: { kind: 'queued' },
      },
    ],
  },
]
