'use client'

import { generateId } from 'ai'
import { useRouter } from 'next/navigation'

export default function NewChatForm() {
  const router = useRouter()

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()

        const formData = new FormData(e.currentTarget)
        const query = formData.get('message')
        if (!query || typeof query !== 'string') {
          return
        }

        const chatId = generateId()

        const params = new URLSearchParams({ query })
        router.push(`/chat/${chatId}?${params.toString()}`)
      }}
    >
      <input type='text' name='message' placeholder='Enter your message' />
      <button type='submit'>Send</button>
    </form>
  )
}
