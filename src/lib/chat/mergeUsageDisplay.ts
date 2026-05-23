import type { ChatUsage } from '~/server/actions/sources'
import type { ChatUsageSummary } from '~/server/actions/sources'

export function mergeUsageForDisplay(
  persisted: ChatUsageSummary | null | undefined,
  streamingTurn: ChatUsage | null
): ChatUsageSummary | null {
  if (!streamingTurn) {
    return persisted ?? null
  }

  const persistedCostMicroUsd = persisted?.totalCostMicroUsd ?? 0

  return {
    totalInputTokens: streamingTurn.totalInputTokens,
    totalCachedInputTokens: streamingTurn.totalCachedInputTokens,
    totalOutputTokens: streamingTurn.totalOutputTokens,
    totalTokens: streamingTurn.totalTokens,
    contextInputTokens: streamingTurn.contextInputTokens,
    totalCostMicroUsd: persistedCostMicroUsd + streamingTurn.totalCostMicroUsd,
  }
}
