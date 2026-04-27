import './src/env'
import type { NextConfig } from 'next'

import { withWorkflow } from 'workflow/next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['chromadb', '@chroma-core/openai', '@chroma-core/chroma-cloud-splade'],
}

export default withWorkflow(nextConfig)
