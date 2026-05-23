import type { LanguageModelUsage } from 'ai'
import type { ChatUsage } from '~/lib/types/chat'

import { modelPriceMapping } from '~/server/ai/modelPriceMapping'

const CHAT_MODEL_PRICE = modelPriceMapping['GPT-5.5']

function addTokenCounts(a: number | undefined, b: number | undefined) {
  return (a ?? 0) + (b ?? 0)
}

export function emptyLanguageModelUsage(): LanguageModelUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputTokenDetails: {
      noCacheTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokenDetails: {
      textTokens: 0,
      reasoningTokens: 0,
    },
  }
}

export function addLanguageModelUsages(
  usage1: LanguageModelUsage,
  usage2: LanguageModelUsage
): LanguageModelUsage {
  return {
    inputTokens: addTokenCounts(usage1.inputTokens, usage2.inputTokens),
    inputTokenDetails: {
      noCacheTokens: addTokenCounts(
        usage1.inputTokenDetails?.noCacheTokens,
        usage2.inputTokenDetails?.noCacheTokens
      ),
      cacheReadTokens: addTokenCounts(
        usage1.inputTokenDetails?.cacheReadTokens,
        usage2.inputTokenDetails?.cacheReadTokens
      ),
      cacheWriteTokens: addTokenCounts(
        usage1.inputTokenDetails?.cacheWriteTokens,
        usage2.inputTokenDetails?.cacheWriteTokens
      ),
    },
    outputTokens: addTokenCounts(usage1.outputTokens, usage2.outputTokens),
    outputTokenDetails: {
      textTokens: addTokenCounts(
        usage1.outputTokenDetails?.textTokens,
        usage2.outputTokenDetails?.textTokens
      ),
      reasoningTokens: addTokenCounts(
        usage1.outputTokenDetails?.reasoningTokens,
        usage2.outputTokenDetails?.reasoningTokens
      ),
    },
    totalTokens: addTokenCounts(usage1.totalTokens, usage2.totalTokens),
    reasoningTokens: addTokenCounts(usage1.reasoningTokens, usage2.reasoningTokens),
  }
}

export function calculateChatUsage(
  usage: LanguageModelUsage,
  contextInputTokens: number
): ChatUsage {
  const totalInputTokens = usage.inputTokens ?? 0
  const cachedInputTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0
  const uncachedInputTokens = Math.max(totalInputTokens - cachedInputTokens, 0)
  const totalOutputTokens = usage.outputTokens ?? 0
  const totalTokens = usage.totalTokens ?? totalInputTokens + totalOutputTokens

  return {
    totalInputTokens,
    totalCachedInputTokens: cachedInputTokens,
    totalOutputTokens,
    totalTokens,
    contextInputTokens,
    totalCostMicroUsd: Math.round(
      uncachedInputTokens * CHAT_MODEL_PRICE.inputUsdPerMillionTokens +
        cachedInputTokens * CHAT_MODEL_PRICE.cachedInputUsdPerMillionTokens +
        totalOutputTokens * CHAT_MODEL_PRICE.outputUsdPerMillionTokens
    ),
  }
}
