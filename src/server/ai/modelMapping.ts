export type ChatModelId =
  | 'openai/gpt-5.5'
  | 'xai/grok-4.3'
  | 'deepseek/deepseek-v4-pro'

export type ModelPrice = {
  inputUsdPerMillionTokens: number
  cachedInputUsdPerMillionTokens: number
  outputUsdPerMillionTokens: number
}

export type ChatModelConfig = {
  label: string
  maxContextTokens: number
  pricing: ModelPrice
}

export const DEFAULT_CHAT_MODEL_ID = 'openai/gpt-5.5' satisfies ChatModelId

export const modelMapping = {
  'openai/gpt-5.5': {
    label: 'GPT-5.5',
    maxContextTokens: 1_000_000,
    pricing: {
      inputUsdPerMillionTokens: 5,
      cachedInputUsdPerMillionTokens: 0.5,
      outputUsdPerMillionTokens: 30,
    },
  },
  'xai/grok-4.3': {
    label: 'Grok 4.3',
    maxContextTokens: 1_000_000,
    pricing: {
      inputUsdPerMillionTokens: 1.25,
      cachedInputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 2.5,
    },
  },
  'deepseek/deepseek-v4-pro': {
    label: 'DeepSeek V4 Pro',
    maxContextTokens: 1_000_000,
    pricing: {
      inputUsdPerMillionTokens: 0.43,
      cachedInputUsdPerMillionTokens: 0.003625,
      outputUsdPerMillionTokens: 0.87,
    },
  },
} as const satisfies Record<ChatModelId, ChatModelConfig>

export const CHAT_MODEL_IDS = Object.keys(modelMapping) as ChatModelId[]

export function isChatModelId(value: string): value is ChatModelId {
  return Object.hasOwn(modelMapping, value)
}

export function parseChatModelId(value: unknown): ChatModelId {
  if (typeof value === 'string' && isChatModelId(value)) {
    return value
  }

  return DEFAULT_CHAT_MODEL_ID
}

export function getChatModelConfig(modelId: ChatModelId): ChatModelConfig {
  return modelMapping[modelId]
}
