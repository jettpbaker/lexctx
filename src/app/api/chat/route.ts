import { openai } from '@ai-sdk/openai'
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  validateUIMessages,
  UIDataTypes,
  createIdGenerator,
  consumeStream,
} from 'ai'
import { gzip, gunzip } from 'zlib'
import { GenerationStatusType } from '~/db/schema'
import {
  claimIdleChat,
  claimSubmittedChat,
  getChatById,
  upsertChat,
} from '~/server/actions/sources'

export function gzipAsync(input: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    gzip(input, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result)
    })
  })
}

export function gunzipAsync(input: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    gunzip(input, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result.toString())
    })
  })
}

async function persistChat(
  chatId: string,
  messages: UIMessage[],
  generationStatus: GenerationStatusType
) {
  const messageCount = messages.filter((message) => message.role !== 'system').length
  const messagesString = JSON.stringify(messages)
  const messagesGzip = await gzipAsync(messagesString)
  const messagesGzipBase64 = messagesGzip.toString('base64')

  await upsertChat(chatId, messagesGzipBase64, messageCount, generationStatus)
}

export type LexMessage = UIMessage<unknown, UIDataTypes>

export async function loadChat(
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

export async function POST(req: Request) {
  const { message, id } = await req.json()

  let messages: LexMessage[] = []

  const { messages: previousMessages, generationStatus } = await loadChat(id)

  if (generationStatus === 'submitted') {
    const [claimedChat] = await claimSubmittedChat(id)

    if (!claimedChat) {
      return new Response(null, { status: 409 })
    }
    messages = previousMessages
  } else if (generationStatus === 'idle') {
    const [claimedChat] = await claimIdleChat(id)

    if (!claimedChat) {
      return new Response(null, { status: 409 })
    }
    messages = [...previousMessages, message]
  } else {
    return new Response(null, { status: 409 })
  }

  const validatedMessages = await validateUIMessages<LexMessage>({
    messages,
  })

  const result = streamText({
    model: openai('gpt-5.4-nano'),
    messages: await convertToModelMessages(validatedMessages),
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({
      prefix: 'msg',
      size: 16,
    }),
    consumeSseStream: consumeStream,
    onFinish: async ({ messages, isAborted }) => {
      console.log('finish', { isAborted })
      if (isAborted) {
        // This is expected to be partial.
        // For now, maybe don't persist it as final history.
        return
      }
      await persistChat(id, messages, 'idle')
    },
  })
}
