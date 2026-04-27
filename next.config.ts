import './src/env'
import type { NextConfig } from 'next'

import { withWorkflow } from 'workflow/next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['chromadb', '@chroma-core/openai', '@chroma-core/chroma-cloud-splade'],
  outputFileTracingIncludes: {
    '/.well-known/workflow/v1/step': [
      './node_modules/chromadb/**/*',
      './node_modules/@chroma-core/openai/**/*',
      './node_modules/@chroma-core/chroma-cloud-splade/**/*',
      './node_modules/@chroma-core/ai-embeddings-common/**/*',
      './node_modules/@chroma-core/default-embed/**/*',
    ],
    '/.well-known/workflow/v1/flow': [
      './node_modules/chromadb/**/*',
      './node_modules/@chroma-core/openai/**/*',
      './node_modules/@chroma-core/chroma-cloud-splade/**/*',
      './node_modules/@chroma-core/ai-embeddings-common/**/*',
      './node_modules/@chroma-core/default-embed/**/*',
    ],
    '/.well-known/workflow/v1/webhook/[token]': [
      './node_modules/chromadb/**/*',
      './node_modules/@chroma-core/openai/**/*',
      './node_modules/@chroma-core/chroma-cloud-splade/**/*',
      './node_modules/@chroma-core/ai-embeddings-common/**/*',
      './node_modules/@chroma-core/default-embed/**/*',
    ],
  },
}

export default withWorkflow(nextConfig)
