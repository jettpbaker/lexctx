import Exa from 'exa-js'

let exa: Exa | undefined

export function getExaClient() {
  if (!exa) {
    exa = new Exa(process.env.EXA_API_KEY)
  }

  return exa
}
