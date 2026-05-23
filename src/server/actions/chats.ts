'use server'

import { getAllChats as getAllChatsQuery } from '~/db/queries/chats'

export async function getAllChats() {
  return getAllChatsQuery()
}
