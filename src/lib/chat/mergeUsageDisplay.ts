import type { ChatUsage, ChatUsageSummary, PersistedChatUsage } from '~/lib/types/chat'

export function mergeUsageForDisplay(
  persisted: ChatUsageSummary | null | undefined,
  streamingTurn: ChatUsage | null
): ChatUsage | PersistedChatUsage | null {
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
