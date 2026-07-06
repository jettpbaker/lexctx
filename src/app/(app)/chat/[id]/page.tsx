import { parseChatModelId } from '~/server/ai/modelMapping'
import { loadChat } from '~/server/chat/store'

import Chat from '../chat'

type ChatPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ query?: string; model?: string }>
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { id } = await params
  const { query, model } = await searchParams
  const chat = await loadChat(id)
  const initialModelId = query
    ? parseChatModelId(model ?? chat.modelId)
    : parseChatModelId(chat.modelId)

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

  return <Chat key={id} id={id} initialMessages={chat.messages} initialModelId={initialModelId} />
}
