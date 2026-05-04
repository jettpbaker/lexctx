import z from 'zod'
import { getNearbyRagChunks } from '~/server/actions/sources'

export const getNearbyRagChunksTool = {
  description:
    'Get nearby chunks from the provided chunk index. Includes the provided chunk and the chunks before and/or after.',
  inputSchema: z.object({
    sourceId: z.uuid().describe('The ID of the source.'),
    chunkIndex: z.number().int().min(0).describe('The index of the chunk.'),
    before: z
      .number()
      .int()
      .min(0)
      .max(5)
      .default(2)
      .describe(
        'The number of chunks to get from before the current chunk. Min 0, Max 5, Default 2.'
      ),
    after: z
      .number()
      .int()
      .min(0)
      .max(5)
      .default(2)
      .describe(
        'The number of chunks to get from after the current chunk. Min 0, Max 5, Default 2.'
      ),
  }),
  execute: async ({
    sourceId,
    chunkIndex,
    before,
    after,
  }: {
    sourceId: string
    chunkIndex: number
    before: number
    after: number
  }) => {
    const chunks = await getNearbyRagChunks(sourceId, chunkIndex, before, after)
    return {
      sourceId,
      requestedChunkIndex: chunkIndex,
      before,
      after,
      chunks,
      requestedChunkFound: chunks.some((chunk) => chunk.chunkIndex === chunkIndex),
    }
  },
}
