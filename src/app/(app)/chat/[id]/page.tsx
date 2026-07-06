import { gunzipAsync, LexMessage } from '~/app/api/chat/route'
import { getChatById } from '~/db/queries/chats' 
import { parseChatModelId, type ChatModelId } from '~/server/ai/modelMapping'

import Chat from '../chat'

type ChatPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ query?: string; model?: string }>
}

async function loadChat(id: string): Promise<{ messages: LexMessage[]; modelId: ChatModelId } | null> {
  const [chat] = await getChatById(id)

  if (!chat) {
    return null
  }

  const modelId = parseChatModelId(chat.modelId)

  if (!chat.messagesGzipBase64) {
    return { messages: [], modelId }
  }

  const messagesGzip = Buffer.from(chat.messagesGzipBase64, 'base64')
  const messagesString = await gunzipAsync(messagesGzip)
  const messages = JSON.parse(messagesString)

  return { messages, modelId }
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { id } = await params
  const { query, model } = await searchParams
  const chat = await loadChat(id)
  const initialModelId = query ? parseChatModelId(model ?? chat?.modelId) : parseChatModelId(chat?.modelId)

  if (query) {
    return (
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialQuery={query}
        initialModelId={initialModelId}
      />
    )
  }

  return (
    <Chat key={id} id={id} initialMessages={chat?.messages ?? []} initialModelId={initialModelId} />
  )
}
