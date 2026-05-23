import z from 'zod'
import { listAllCollections } from '~/db/queries/collections'

export const listCollectionsTool = {
  description: 'List collections. Call with an empty object {} to list all collections.',
  inputSchema: z.object({}),
  execute: async () => {
    const collections = await listAllCollections()
    return {
      collections,
    }
  },
}
