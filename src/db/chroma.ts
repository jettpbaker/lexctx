import 'server-only'
import type { RagChunk } from '~/lib/rag/chunkTranscriptSegments'

import { ChromaCloudSpladeEmbeddingFunction } from '@chroma-core/chroma-cloud-splade'
import { OpenAIEmbeddingFunction } from '@chroma-core/openai'
import { CloudClient, K, Schema, SparseVectorIndexConfig, VectorIndexConfig } from 'chromadb'
import { env } from '~/env'

const LECTURE_CHUNKS_COLLECTION = 'lecture_chunks_v1'
const SPARSE_EMBEDDING_KEY = 'sparse_embedding'
const DENSE_EMBEDDING_MODEL = 'text-embedding-3-small'

function getChromaClient() {
  return new CloudClient({
    apiKey: env.CHROMA_API_KEY,
    host: env.CHROMA_HOST,
    tenant: env.CHROMA_TENANT,
    database: env.CHROMA_DATABASE,
  })
}

function createDenseEmbeddingFunction() {
  return new OpenAIEmbeddingFunction({
    apiKey: env.OPENAI_API_KEY,
    modelName: DENSE_EMBEDDING_MODEL,
  })
}

function createSparseEmbeddingFunction() {
  return new ChromaCloudSpladeEmbeddingFunction({
    apiKeyEnvVar: 'CHROMA_API_KEY',
  })
}

function createHybridSchema() {
  const schema = new Schema()

  schema.createIndex(
    new VectorIndexConfig({
      sourceKey: K.DOCUMENT,
      embeddingFunction: createDenseEmbeddingFunction(),
    })
  )

  schema.createIndex(
    new SparseVectorIndexConfig({
      sourceKey: K.DOCUMENT,
      embeddingFunction: createSparseEmbeddingFunction(),
    }),
    SPARSE_EMBEDDING_KEY
  )

  return schema
}

export async function getLectureChunksCollection() {
  const client = getChromaClient()

  return client.getOrCreateCollection({
    name: LECTURE_CHUNKS_COLLECTION,
    schema: createHybridSchema(),
  })
}

type LectureChunkSourceMetadata = {
  sourceId: string
  sourceName: string
  collectionId: string
  collectionName: string
}

export async function upsertLectureChunks(metadata: LectureChunkSourceMetadata, chunks: RagChunk[]) {
  const collection = await getLectureChunksCollection()

  await collection.upsert({
    ids: chunks.map((chunk) => `${metadata.sourceId}:chunk:${chunk.index}`),
    documents: chunks.map((chunk) => chunk.text),
    metadatas: chunks.map((chunk) => ({
      sourceId: metadata.sourceId,
      sourceName: metadata.sourceName,
      collectionId: metadata.collectionId,
      collectionName: metadata.collectionName,
      chunkIndex: chunk.index,
      startSeconds: chunk.startSeconds,
      endSeconds: chunk.endSeconds,
      segmentStartIndex: chunk.segmentStartIndex,
      segmentEndIndex: chunk.segmentEndIndex,
    })),
  })
}
