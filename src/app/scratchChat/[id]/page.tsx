import { loadChat, ScratchMessage } from '~/app/api/scratchChat/route'

import Chat from './chat'

export default async function ScratchChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let initialMessages: ScratchMessage[]
  try {
    initialMessages = await loadChat(id)
  } catch (error) {
    console.error(error)
    initialMessages = []
  }

  return <Chat id={id} initialMessages={initialMessages} />
}
