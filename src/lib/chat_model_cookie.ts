import {
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
  parseChatModelId,
  type ChatModelId,
} from '~/server/ai/modelMapping'

/** Cookie value is the last-used gateway model id, e.g. `openai/gpt-5.5`. */
export const LAST_USED_CHAT_MODEL_COOKIE_NAME = 'last_used_chat_model_id'
export const LAST_USED_CHAT_MODEL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function parseLastUsedChatModelCookieValue(value: string | undefined): ChatModelId {
  if (!value) {
    return DEFAULT_CHAT_MODEL_ID
  }

  try {
    const decoded = decodeURIComponent(value)
    if (isChatModelId(decoded)) {
      return decoded
    }
  } catch {
    // Malformed encoding — fall through to default.
  }

  return parseChatModelId(value)
}

export function lastUsedChatModelClientCookieString(modelId: ChatModelId): string {
  return `${LAST_USED_CHAT_MODEL_COOKIE_NAME}=${encodeURIComponent(modelId)}; path=/; max-age=${LAST_USED_CHAT_MODEL_COOKIE_MAX_AGE}; samesite=lax`
}
