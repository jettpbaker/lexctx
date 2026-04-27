import 'server-only'
import type { RagChunk } from '~/lib/rag/chunkTranscriptSegments'

import { env } from '~/env'

const LECTURE_CHUNKS_COLLECTION = 'lecture_chunks_v1'
const SPARSE_EMBEDDING_KEY = 'sparse_embedding'
const DENSE_EMBEDDING_MODEL = 'text-embedding-3-small'

type ChromaModules = {
  ChromaCloudSpladeEmbeddingFunction: new (config: { apiKeyEnvVar: string }) => unknown
  CloudClient: new (config: {
    apiKey: string
    host: string
    tenant: string
    database: string
  }) => { getOrCreateCollection: (config: unknown) => Promise<{ upsert: (input: unknown) => Promise<void> }> }
  K: { DOCUMENT: unknown }
  OpenAIEmbeddingFunction: new (config: { apiKey: string; modelName: string }) => unknown
  Schema: new () => { createIndex: (config: unknown, key?: string) => void }
  SparseVectorIndexConfig: new (config: unknown) => unknown
  VectorIndexConfig: new (config: unknown) => unknown
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as <T>(
  specifier: string
) => Promise<T>

async function loadChromaModules(): Promise<ChromaModules> {
  const [chroma, openai, splade] = await Promise.all([
    dynamicImport<Record<string, never>>('chromadb'),
    dynamicImport<Record<string, never>>('@chroma-core/openai'),
    dynamicImport<Record<string, never>>('@chroma-core/chroma-cloud-splade'),
  ])

  return {
    ChromaCloudSpladeEmbeddingFunction: splade.ChromaCloudSpladeEmbeddingFunction,
    CloudClient: chroma.CloudClient,
    K: chroma.K,
    OpenAIEmbeddingFunction: openai.OpenAIEmbeddingFunction,
    Schema: chroma.Schema,
    SparseVectorIndexConfig: chroma.SparseVectorIndexConfig,
    VectorIndexConfig: chroma.VectorIndexConfig,
  }
}

function getChromaClient({ CloudClient }: Pick<ChromaModules, 'CloudClient'>) {
  return new CloudClient({
    apiKey: env.CHROMA_API_KEY,
    host: env.CHROMA_HOST,
    tenant: env.CHROMA_TENANT,
    database: env.CHROMA_DATABASE,
  })
}

function createDenseEmbeddingFunction({
  OpenAIEmbeddingFunction,
}: Pick<ChromaModules, 'OpenAIEmbeddingFunction'>) {
  return new OpenAIEmbeddingFunction({
    apiKey: env.OPENAI_API_KEY,
    modelName: DENSE_EMBEDDING_MODEL,
  })
}

function createSparseEmbeddingFunction({
  ChromaCloudSpladeEmbeddingFunction,
}: Pick<ChromaModules, 'ChromaCloudSpladeEmbeddingFunction'>) {
  return new ChromaCloudSpladeEmbeddingFunction({
    apiKeyEnvVar: 'CHROMA_API_KEY',
  })
}

function createHybridSchema(modules: ChromaModules) {
  const {
    ChromaCloudSpladeEmbeddingFunction,
    K,
    OpenAIEmbeddingFunction,
    Schema,
    SparseVectorIndexConfig,
    VectorIndexConfig,
  } = modules
  const schema = new Schema()

  schema.createIndex(
    new VectorIndexConfig({
      sourceKey: K.DOCUMENT,
      embeddingFunction: createDenseEmbeddingFunction({ OpenAIEmbeddingFunction }),
    })
  )

  schema.createIndex(
    new SparseVectorIndexConfig({
      sourceKey: K.DOCUMENT,
      embeddingFunction: createSparseEmbeddingFunction({ ChromaCloudSpladeEmbeddingFunction }),
    }),
    SPARSE_EMBEDDING_KEY
  )

  return schema
}

export async function getLectureChunksCollection() {
  const modules = await loadChromaModules()
  const client = getChromaClient(modules)

  return client.getOrCreateCollection({
    name: LECTURE_CHUNKS_COLLECTION,
    schema: createHybridSchema(modules),
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
