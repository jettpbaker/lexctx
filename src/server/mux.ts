import Mux from '@mux/mux-node'
import { env } from '~/env'

export function createMuxClient() {
  return new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
  })
}
