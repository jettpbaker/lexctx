import type { ChatType, ChatUsage } from '~/lib/types/chat'

import { asc, desc, eq, sql } from 'drizzle-orm'
import { unstable_noStore as noStore } from 'next/cache'
import db from '~/db'
import { chats } from '~/db/schema'
import type { ChatModelId } from '~/server/ai/modelMapping'

export async function getAllChats(): Promise<ChatType[]> {
  noStore()

  return db
    .select({
      id: chats.id,
      title: chats.title,
    })
    .from(chats)
    .orderBy(desc(chats.createdAt), asc(chats.id))
}

export async function upsertChat(
  chatId: string,
  messagesGzipBase64: string,
  messageCount: number,
  usage?: ChatUsage,
  modelId?: ChatModelId
) {
  const values = {
    id: chatId,
    messagesGzipBase64,
    messageCount,
    ...(modelId && { modelId }),
    ...usage,
  }

  await db
    .insert(chats)
    .values(values)
    .onConflictDoUpdate({
      target: chats.id,
      set: {
        messagesGzipBase64,
        messageCount,
        ...(modelId && { modelId }),
        ...(usage && {
          totalInputTokens: usage.totalInputTokens,
          totalCachedInputTokens: usage.totalCachedInputTokens,
          totalOutputTokens: usage.totalOutputTokens,
          totalTokens: usage.totalTokens,
          contextInputTokens: usage.contextInputTokens,
          totalCostMicroUsd: sql`coalesce(${chats.totalCostMicroUsd}, 0) + ${usage.totalCostMicroUsd}`,
        }),
      },
    })
}

export async function updateChatModelId(chatId: string, modelId: ChatModelId) {
  await db
    .insert(chats)
    .values({ id: chatId, modelId })
    .onConflictDoUpdate({
      target: chats.id,
      set: { modelId },
    })
}

export async function upsertChatTitle(chatId: string, title: string) {
  await db.insert(chats).values({ id: chatId, title }).onConflictDoUpdate({
    target: chats.id,
    set: { title },
  })
}

export async function getChatById(chatId: string) {
  return await db.select().from(chats).where(eq(chats.id, chatId)).limit(1)
}

export async function deleteChatById(chatId: string) {
  await db.delete(chats).where(eq(chats.id, chatId))
}

export async function getChatUsageById(chatId: string) {
  noStore()

  const [chat] = await db
    .select({
      totalInputTokens: chats.totalInputTokens,
      totalCachedInputTokens: chats.totalCachedInputTokens,
      totalOutputTokens: chats.totalOutputTokens,
      totalTokens: chats.totalTokens,
      contextInputTokens: chats.contextInputTokens,
      totalCostMicroUsd: chats.totalCostMicroUsd,
    })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1)

  if (!chat) {
    return null
  }

  return chat
}
