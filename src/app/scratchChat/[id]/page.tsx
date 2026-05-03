import { loadChat } from '~/app/api/scratchChat/route'

import Chat from './chat'

export default async function ScratchChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const initialMessages = await loadChat(id)
  return <Chat id={id} initialMessages={initialMessages} />
}
