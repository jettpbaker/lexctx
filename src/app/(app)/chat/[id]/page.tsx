import { gunzipAsync, LexMessage } from '~/app/api/chat/route'
import { GenerationStatusType } from '~/db/schema'
import { getChatById } from '~/server/actions/sources'

import Chat from '../chat'

type ChatPageProps = {
  params: Promise<{ id: string }>
}

async function loadChat(
  id: string
): Promise<{ messages: LexMessage[]; generationStatus: GenerationStatusType }> {
  const [chat] = await getChatById(id)

  if (!chat) {
    // Todo: handle this
    throw new Error(`Chat not found: ${id}`)
  }

  const messagesGzip = Buffer.from(chat.messagesGzipBase64, 'base64')
  const messagesString = await gunzipAsync(messagesGzip)
  const messages = JSON.parse(messagesString)

  return { messages, generationStatus: chat.generationStatus }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params

  const { messages, generationStatus } = await loadChat(id)

  return (
    <div className='flex min-h-0 flex-1 flex-col items-center justify-start gap-4 p-6'>
      <div>
        <h1 className='text-lg font-medium text-foreground/90'>Chat: {id}</h1>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify({ messages, generationStatus }, null, 2)}
        </pre>
      </div>
      <Chat id={id} initialMessages={messages} generationStatus={generationStatus} />
    </div>
  )
}
