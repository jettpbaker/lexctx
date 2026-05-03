import { gunzipAsync, LexMessage } from '~/app/api/chat/route'
import { getChatById } from '~/server/actions/sources'

import Chat from '../chat'

type ChatPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ query?: string }>
}

async function loadChat(id: string): Promise<{ messages: LexMessage[] }> {
  const [chat] = await getChatById(id)

  if (!chat) {
    // Todo: handle this
    throw new Error(`Chat not found: ${id}`)
  }

  const messagesGzip = Buffer.from(chat.messagesGzipBase64, 'base64')
  const messagesString = await gunzipAsync(messagesGzip)
  const messages = JSON.parse(messagesString)

  return { messages }
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { id } = await params
  const { query } = await searchParams

  if (query) {
    return <Chat id={id} initialMessages={[]} initialQuery={query} />
  }

  const { messages } = await loadChat(id)

  return <Chat id={id} initialMessages={messages} />
}
