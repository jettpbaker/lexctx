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
  'transcribing',
  'indexing',
  'ready',
  'failed',
])

export const videoStatusEnum = p.pgEnum('video_status', [
  'processing',
  'ready',
  'failed',
])

export const sources = p.pgTable('sources', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  collectionId: p
    .uuid('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  name: p.text('name').notNull(),
  status: sourceStatusEnum('status').notNull().default('transcribing'),
  videoStatus: videoStatusEnum('video_status').notNull().default('processing'),
  audioUrl: p.text('audio_url').notNull(),
  muxPlaybackId: p.text('mux_playback_id'),
  falRequestId: p.text('fal_request_id'),
  transcriptUrl: p.text('transcript_url'),
  chunkCount: p.integer('chunk_count').notNull().default(0),
  error: p.text('error'),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const chats = p.pgTable('chats', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  title: p.text('title'),
  messagesGzipBase64: p.text('messages_gzip_base64').notNull(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
