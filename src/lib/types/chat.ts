export type ChatType = {
  id: string
  title: string | null
}

export type ChatUsage = {
  totalInputTokens: number
  totalCachedInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  contextInputTokens: number
  totalCostMicroUsd: number
}

export type PersistedChatUsage = {
  totalInputTokens: number | null
  totalCachedInputTokens: number | null
  totalOutputTokens: number | null
  totalTokens: number | null
  contextInputTokens: number | null
  totalCostMicroUsd: number | null
}

export type ChatUsageSummary = PersistedChatUsage | null

export type ChatSidebarItem = ChatType & {
  titleLoading: boolean
}
