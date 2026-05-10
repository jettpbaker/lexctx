import * as p from 'drizzle-orm/pg-core'

export const collections = p.pgTable('collections', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  name: p.text('name').notNull(),
  description: p.text('description'),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const sourceStatusEnum = p.pgEnum('source_status', [
  'pending_upload',
  'transcribing',
  'indexing',
  'ready',
  'failed',
])

export const videoStatusEnum = p.pgEnum('video_status', [
  'pending_upload',
  'uploading',
  'processing',
  'ready',
  'failed',
])

export const sources = p.pgTable(
  'sources',
  {
    id: p.uuid('id').primaryKey().defaultRandom(),
    collectionId: p
      .uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    name: p.text('name').notNull(),
    contentHash: p.text('content_hash'),
    contentHashType: p.text('content_hash_type'),
    fileSize: p.bigint('file_size', { mode: 'number' }),
    status: sourceStatusEnum('status').notNull().default('pending_upload'),
    videoStatus: videoStatusEnum('video_status').notNull().default('pending_upload'),
    audioUrl: p.text('audio_url'),
    audioKey: p.text('audio_key'),
    muxUploadId: p.text('mux_upload_id'),
    muxAssetId: p.text('mux_asset_id'),
    muxPlaybackId: p.text('mux_playback_id'),
    muxBlurDataUrl: p.text('mux_blur_data_url'),
    muxBlurAspectRatio: p.doublePrecision('mux_blur_aspect_ratio'),
    falRequestId: p.text('fal_request_id'),
    transcriptText: p.text('transcript_text'),
    error: p.text('error'),
    createdAt: p.timestamp('created_at').notNull().defaultNow(),
    updatedAt: p
      .timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    p
      .unique('sources_content_hash_unique')
      .on(table.contentHash, table.contentHashType, table.fileSize),
    p.index('sources_collection_id_idx').on(table.collectionId),
  ]
)

export const transcriptSegments = p.pgTable(
  'transcript_segments',
  {
    id: p.uuid('id').primaryKey().defaultRandom(),
    sourceId: p
      .uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    index: p.integer('index').notNull(),
    startSeconds: p.doublePrecision('start_seconds').notNull(),
    endSeconds: p.doublePrecision('end_seconds').notNull(),
    text: p.text('text').notNull(),
    createdAt: p.timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    p.unique().on(table.sourceId, table.index),
    p.index('transcript_segments_source_id_idx').on(table.sourceId),
  ]
)

export const ragChunks = p.pgTable(
  'transcript_chunks',
  {
    id: p.uuid('id').primaryKey().defaultRandom(),
    sourceId: p
      .uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    chunkIndex: p.integer('chunk_index').notNull(),
    text: p.text('text').notNull(),
    startSeconds: p.doublePrecision('start_seconds').notNull(),
    endSeconds: p.doublePrecision('end_seconds').notNull(),
    segmentStartIndex: p.integer('segment_start_index').notNull(),
    segmentEndIndex: p.integer('segment_end_index').notNull(),
    createdAt: p.timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    p.unique().on(table.sourceId, table.chunkIndex),
    p.index('transcript_chunks_source_id_idx').on(table.sourceId),
  ]
)

export const generationStatusEnum = p.pgEnum('generation_status', [
  'idle',
  'submitted',
  'generating',
  'failed',
])

export const chats = p.pgTable('chats', {
  id: p.text('id').primaryKey(),
  title: p.text('title').default('New chat'),
  messagesGzipBase64: p.text('messages_gzip_base64'),
  messageCount: p.integer('message_count').notNull().default(0),
  totalInputTokens: p.bigint('total_input_tokens', { mode: 'number' }),
  totalCachedInputTokens: p.bigint('total_cached_input_tokens', { mode: 'number' }),
  totalOutputTokens: p.bigint('total_output_tokens', { mode: 'number' }),
  totalTokens: p.bigint('total_tokens', { mode: 'number' }),
  totalCostMicroUsd: p.bigint('total_cost_micro_usd', { mode: 'number' }),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
