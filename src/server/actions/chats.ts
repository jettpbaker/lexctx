'use server'

import {
  getAllChats as getAllChatsQuery,
  getChatUsageById as getChatUsageByIdQuery,
  updateChatModelId as updateChatModelIdQuery,
} from '~/db/queries/chats'
import { parseChatModelId, type ChatModelId } from '~/server/ai/modelMapping'

export async function getAllChats() {
  return getAllChatsQuery()
}

export async function getChatUsageById(chatId: string) {
  return getChatUsageByIdQuery(chatId)
}

export async function updateChatModelId(chatId: string, modelId: ChatModelId) {
  return updateChatModelIdQuery(chatId, parseChatModelId(modelId))
}
