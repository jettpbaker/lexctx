import type { ChatUsage } from '~/lib/types/chat'

import { UIMessage } from 'ai'
import { getChatById, upsertChat } from '~/db/queries/chats'
import { gunzipAsync, gzipAsync } from '~/lib/gzip'
import { parseChatModelId, type ChatModelId } from '~/server/ai/modelMapping'

export type LexUIDataTypes = {
  usage: ChatUsage
}

export type LexMessage = UIMessage<unknown, LexUIDataTypes>

export async function persistChat(
  chatId: string,
  messages: UIMessage[],
  modelId: ChatModelId,
  usage?: ChatUsage
) {
  const messageCount = messages.filter((message) => message.role !== 'system').length
  const messagesString = JSON.stringify(messages)
  const messagesGzip = await gzipAsync(messagesString)
  const messagesGzipBase64 = messagesGzip.toString('base64')

  await upsertChat(chatId, messagesGzipBase64, messageCount, usage, modelId)
}

export async function loadChat(
  id: string
): Promise<{ exists: boolean; messages: LexMessage[]; modelId: ChatModelId }> {
  const [chat] = await getChatById(id)

  if (!chat) {
    // Chat not found, this is expected to be a new chat.
    return { exists: false, messages: [], modelId: parseChatModelId(undefined) }
  }

  const modelId = parseChatModelId(chat.modelId)

  if (!chat.messagesGzipBase64) {
    return { exists: true, messages: [], modelId }
  }

  const messagesGzip = Buffer.from(chat.messagesGzipBase64, 'base64')
  const messagesString = await gunzipAsync(messagesGzip)
  const messages = JSON.parse(messagesString)

  return { exists: true, messages, modelId }
}
