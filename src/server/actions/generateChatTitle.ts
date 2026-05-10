'use server'

import { generateText } from 'ai'

import { upsertChatTitle } from './sources'

export async function generateChatTitle(chatId: string, message: string) {
  const response = await generateText({
    model: 'google/gemini-3.1-flash-lite',
    prompt: `Generate a concise title in plain text (no markdown, no html) for the following chat message: "${message}"`,
  })

  void upsertChatTitle(chatId, response.text)
  return response.text
}
