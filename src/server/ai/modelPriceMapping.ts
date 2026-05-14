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
  'DeepSeek V4 Pro': {
    inputUsdPerMillionTokens: 0.435,
    cachedInputUsdPerMillionTokens: 0.003625,
    outputUsdPerMillionTokens: 0.87,
  },
} satisfies Record<string, ModelPrice>
