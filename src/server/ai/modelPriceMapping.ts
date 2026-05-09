export type ModelPrice = {
  inputUsdPerMillionTokens: number
  cachedInputUsdPerMillionTokens: number
  outputUsdPerMillionTokens: number
}

export const modelPriceMapping = {
  'GPT-5.5': {
    inputUsdPerMillionTokens: 5,
    cachedInputUsdPerMillionTokens: 0.5,
    outputUsdPerMillionTokens: 30,
  },
} satisfies Record<string, ModelPrice>
