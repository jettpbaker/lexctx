'use server'

import type { UIMessage } from 'ai'

import { generateId } from 'ai'
import { redirect } from 'next/navigation'
import { upsertChat } from '~/server/actions/sources'

import { gzipAsync } from '../api/scratchChat/route'

export async function startChatFromHome(formData: FormData) {
  const message = formData.get('message')
  if (!message || typeof message !== 'string') {
    return
  }

  const messageId = generateId()

  const userMessage: UIMessage = {
    id: messageId,
    role: 'user',
    parts: [{ type: 'text', text: message }],
  }

  const userMessageRaw = JSON.stringify([userMessage])

  const chatId = generateId()

  const messagesGzip = await gzipAsync(userMessageRaw)
  const messagesGzipBase64 = messagesGzip.toString('base64')

  await upsertChat(chatId, messagesGzipBase64, 1, 'submitted')

  redirect(`/chat/${chatId}`)
}
