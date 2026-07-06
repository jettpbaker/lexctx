import Exa from 'exa-js'
import { env } from '~/env'

let exa: Exa | undefined

export function getExaClient() {
  if (!exa) {
    exa = new Exa(env.EXA_API_KEY)
  }

  return exa
}
