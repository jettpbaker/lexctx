import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    UPLOADTHING_TOKEN: z.string().min(1),
    FAL_KEY: z.string().min(1),
    DATABASE_URL: z.url(),
    CHROMA_HOST: z.string().min(1),
    CHROMA_API_KEY: z.string().min(1),
    CHROMA_TENANT: z.string().min(1),
    CHROMA_DATABASE: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    AI_GATEWAY_API_KEY: z.string().min(1),
    MUX_TOKEN_ID: z.string().min(1),
    MUX_TOKEN_SECRET: z.string().min(1),
    BASE_URL: z.string().min(1),
  },
  client: {},
  experimental__runtimeEnv: process.env,
})
