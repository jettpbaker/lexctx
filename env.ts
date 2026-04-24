import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    UPLOADTHING_TOKEN: z.string().min(1),
  },
  client: {},
  experimental__runtimeEnv: process.env,
})
