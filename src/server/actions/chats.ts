'use server'

import {
  getAllChats as getAllChatsQuery,
  getChatUsageById as getChatUsageByIdQuery,
} from '~/db/queries/chats'

export async function getAllChats() {
  return getAllChatsQuery()
}

export async function getChatUsageById(chatId: string) {
  return getChatUsageByIdQuery(chatId)
}
