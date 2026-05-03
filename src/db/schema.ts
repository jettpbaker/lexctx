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

export const videoStatusEnum = p.pgEnum('video_status', ['processing', 'ready', 'failed'])

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
    videoStatus: videoStatusEnum('video_status').notNull().default('processing'),
    audioUrl: p.text('audio_url'),
    audioKey: p.text('audio_key'),
    muxPlaybackId: p.text('mux_playback_id'),
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

export const chats = p.pgTable('chats', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  title: p.text('title'),
  messagesGzipBase64: p.text('messages_gzip_base64').notNull(),
  messageCount: p.integer('message_count').notNull().default(0),
  totalInputTokens: p.bigint('total_input_tokens', { mode: 'number' }).notNull().default(0),
  totalOutputTokens: p.bigint('total_output_tokens', { mode: 'number' }).notNull().default(0),
  totalTokens: p.bigint('total_tokens', { mode: 'number' }).notNull().default(0),
  totalCostMicroUsd: p.bigint('total_cost_micro_usd', { mode: 'number' }).notNull().default(0),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
