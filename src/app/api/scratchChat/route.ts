import { openai } from '@ai-sdk/openai'
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
  validateUIMessages,
  InferUITools,
  UIDataTypes,
  createIdGenerator,
  consumeStream,
} from 'ai'
import { readFile, writeFile } from 'fs/promises'
import { z } from 'zod'
import { getChatFile } from '~/app/scratchChat/page'

function saveChat({ chatId, messages }: { chatId: string; messages: UIMessage[] }) {
  return writeFile(getChatFile(chatId), JSON.stringify(messages, null, 2))
}

const tools = {
  weather: tool({
    description: 'Get weather information',
    inputSchema: z.object({
      location: z.string(),
      units: z.enum(['celsius', 'fahrenheit']),
    }),
    execute: async ({ location, units }) => {
      const temperature = Math.round(Math.random() * (90 - 32) + 32)
      return {
        location,
        temperature: units === 'fahrenheit' ? temperature : (temperature - 32) * (5 / 9),
      }
    },
  }),
  convertFahrenheitToCelsius: tool({
    description: 'Convert a temperature in fahrenheit to celsius',
    inputSchema: z.object({
      temperature: z.number().describe('The temperature in fahrenheit to convert'),
    }),
    execute: async ({ temperature }) => {
      const celsius = Math.round((temperature - 32) * (5 / 9))
      return {
        celsius,
      }
    },
  }),
}

type ScratchTools = InferUITools<typeof tools>
export type ScratchMessage = UIMessage<unknown, UIDataTypes, ScratchTools>

export async function loadChat(id: string): Promise<ScratchMessage[]> {
  return JSON.parse(await readFile(getChatFile(id), 'utf8'))
}

export async function POST(req: Request) {
  const { message, id } = await req.json()

  const previousMessages = await loadChat(id)
  const messages = [...previousMessages, message]

  const validatedMessages = await validateUIMessages<ScratchMessage>({
    messages,
    tools, // Ensures tool calls in messages match current schemas
  })

  const result = streamText({
    model: openai('gpt-5.4-nano'),
    messages: await convertToModelMessages(validatedMessages),
    stopWhen: stepCountIs(5),
    tools,
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
      await saveChat({ chatId: id, messages })
    },
  })
}
