export type ChatModelId =
  | 'openai/gpt-5.5'
  | 'openai/gpt-5.4'
  | 'openai/gpt-5.4-mini'
  | 'anthropic/claude-opus-4.7'
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-haiku-4.5'
  | 'xai/grok-4.3'

export type ModelPrice = {
  inputUsdPerMillionTokens: number
  cachedInputUsdPerMillionTokens: number
  outputUsdPerMillionTokens: number
}

export type ChatModelLogo =
  | { kind: 'theme'; lightSrc: string; darkSrc: string }
  | { kind: 'static'; src: string }

export type ChatModelConfig = {
  label: string
  maxContextTokens: number
  pricing: ModelPrice
  logo: ChatModelLogo
}

export const DEFAULT_CHAT_MODEL_ID = 'xai/grok-4.3' satisfies ChatModelId

const openAiLogo = {
  kind: 'theme',
  lightSrc: '/model-logos/openai-light.svg',
  darkSrc: '/model-logos/openai-dark.svg',
} as const satisfies ChatModelLogo

const claudeLogo = {
  kind: 'static',
  src: '/model-logos/claude.svg',
} as const satisfies ChatModelLogo

const grokLogo = {
  kind: 'theme',
  lightSrc: '/model-logos/grok-light.svg',
  darkSrc: '/model-logos/grok-dark.svg',
} as const satisfies ChatModelLogo

export const modelMapping = {
  'openai/gpt-5.5': {
    label: 'GPT-5.5',
    maxContextTokens: 1_000_000,
    logo: openAiLogo,
    pricing: {
      inputUsdPerMillionTokens: 5,
      cachedInputUsdPerMillionTokens: 0.5,
      outputUsdPerMillionTokens: 30,
    },
  },
  'openai/gpt-5.4': {
    label: 'GPT-5.4',
    maxContextTokens: 1_050_000,
    logo: openAiLogo,
    pricing: {
      inputUsdPerMillionTokens: 2.5,
      cachedInputUsdPerMillionTokens: 0.25,
      outputUsdPerMillionTokens: 15,
    },
  },
  'openai/gpt-5.4-mini': {
    label: 'GPT-5.4 Mini',
    maxContextTokens: 400_000,
    logo: openAiLogo,
    pricing: {
      inputUsdPerMillionTokens: 0.75,
      cachedInputUsdPerMillionTokens: 0.075,
      outputUsdPerMillionTokens: 4.5,
    },
  },
  'anthropic/claude-opus-4.7': {
    label: 'Claude Opus 4.7',
    maxContextTokens: 1_000_000,
    logo: claudeLogo,
    pricing: {
      inputUsdPerMillionTokens: 5,
      cachedInputUsdPerMillionTokens: 0.5,
      outputUsdPerMillionTokens: 25,
    },
  },
  'anthropic/claude-sonnet-4.6': {
    label: 'Claude Sonnet 4.6',
    maxContextTokens: 1_000_000,
    logo: claudeLogo,
    pricing: {
      inputUsdPerMillionTokens: 3,
      cachedInputUsdPerMillionTokens: 0.3,
      outputUsdPerMillionTokens: 15,
    },
  },
  'anthropic/claude-haiku-4.5': {
    label: 'Claude Haiku 4.5',
    maxContextTokens: 200_000,
    logo: claudeLogo,
    pricing: {
      inputUsdPerMillionTokens: 1,
      cachedInputUsdPerMillionTokens: 0.1,
      outputUsdPerMillionTokens: 5,
    },
  },
  'xai/grok-4.3': {
    label: 'Grok 4.3',
    maxContextTokens: 1_000_000,
    logo: grokLogo,
    pricing: {
      inputUsdPerMillionTokens: 1.25,
      cachedInputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 2.5,
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
