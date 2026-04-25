import './src/env'
import { withWorkflow } from 'workflow/next'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default withWorkflow(nextConfig)
