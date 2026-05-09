import { openai, OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai'
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  validateUIMessages,
  UIDataTypes,
  createIdGenerator,
  consumeStream,
  LanguageModelUsage,
} from 'ai'
import { gzip, gunzip } from 'zlib'
import { ChatUsage, getChatById, upsertChat } from '~/server/actions/sources'
import { modelPriceMapping } from '~/server/ai/modelPriceMapping'
import { chatTools } from '~/server/ai/tools'

// TODO: Swap back to GPT-5.5
// const CHAT_MODEL_ID = 'gpt-5.4-nano'
const CHAT_MODEL_ID = 'gpt-5.5-2026-04-23'
const CHAT_MODEL_PRICE = modelPriceMapping['GPT-5.5']

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

async function persistChat(chatId: string, messages: UIMessage[], usage?: ChatUsage) {
  const messageCount = messages.filter((message) => message.role !== 'system').length
  const messagesString = JSON.stringify(messages)
  const messagesGzip = await gzipAsync(messagesString)
  const messagesGzipBase64 = messagesGzip.toString('base64')

  await upsertChat(chatId, messagesGzipBase64, messageCount, usage)
}

export type LexMessage = UIMessage<unknown, UIDataTypes>

function getTemporalContext(timeZone: unknown, locale: unknown) {
  const now = new Date()
  const resolvedTimeZone = typeof timeZone === 'string' && timeZone.length > 0 ? timeZone : 'UTC'
  const resolvedLocale = typeof locale === 'string' && locale.length > 0 ? locale : 'en-AU'

  const localDate = new Intl.DateTimeFormat(resolvedLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: resolvedTimeZone,
  }).format(now)

  return `Current date: ${localDate}
User timezone: ${resolvedTimeZone}

Use the user's timezone when interpreting relative dates like today, tomorrow, yesterday, this week, or next lecture.`
}

function calculateChatUsage(usage: LanguageModelUsage): ChatUsage {
  const totalInputTokens = usage.inputTokens ?? 0
  const cachedInputTokens = usage.inputTokenDetails.cacheReadTokens ?? 0
  const uncachedInputTokens = Math.max(totalInputTokens - cachedInputTokens, 0)
  const totalOutputTokens = usage.outputTokens ?? 0
  const totalTokens = usage.totalTokens ?? totalInputTokens + totalOutputTokens

  return {
    totalInputTokens,
    totalCachedInputTokens: cachedInputTokens,
    totalOutputTokens,
    totalTokens,
    totalCostMicroUsd: Math.round(
      uncachedInputTokens * CHAT_MODEL_PRICE.inputUsdPerMillionTokens +
        cachedInputTokens * CHAT_MODEL_PRICE.cachedInputUsdPerMillionTokens +
        totalOutputTokens * CHAT_MODEL_PRICE.outputUsdPerMillionTokens
    ),
  }
}

export async function loadChat(id: string): Promise<{ exists: boolean; messages: LexMessage[] }> {
  const [chat] = await getChatById(id)

  if (!chat) {
    // Chat not found, this is expected to be a new chat.
    return { exists: false, messages: [] }
  }

  const messagesGzip = Buffer.from(chat.messagesGzipBase64, 'base64')
  const messagesString = await gunzipAsync(messagesGzip)
  const messages = JSON.parse(messagesString)

  return { exists: true, messages }
}

export async function POST(req: Request) {
  const { message, id, locale, timeZone } = await req.json()

  const chat = await loadChat(id)

  const messages: LexMessage[] = chat.exists ? [...chat.messages, message] : [message]

  const validatedMessages = await validateUIMessages<LexMessage>({
    messages,
  })

  const result = streamText({
    model: openai(CHAT_MODEL_ID),
    providerOptions: {
      openai: {
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        promptCacheKey: id,
      } satisfies OpenAILanguageModelResponsesOptions,
    },
    tools: chatTools,
    system: getTemporalContext(timeZone, locale),
    messages: await convertToModelMessages(validatedMessages),
    stopWhen: stepCountIs(5),
  })

  void (async () => {
    try {
      const usage = await result.usage
      const inputTokens = usage.inputTokens ?? 0
      const cacheReadTokens = usage.inputTokenDetails.cacheReadTokens ?? 0
      const cacheWriteTokens = usage.inputTokenDetails.cacheWriteTokens ?? 0
      const cacheReadRatio = inputTokens > 0 ? cacheReadTokens / inputTokens : 0

      console.info('[chat usage]', {
        chatId: id,
        messageCount: messages.length,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cacheReadTokens,
        cacheWriteTokens,
        cacheReadRatio: Number(cacheReadRatio.toFixed(4)),
        raw: usage.raw,
      })
    } catch (error) {
      console.error('[chat usage] failed to read usage', error)
    }
  })()

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({
      prefix: 'msg',
      size: 16,
    }),
    consumeSseStream: consumeStream,
    onFinish: async ({ messages, isAborted }) => {
      if (isAborted) {
        // This is expected to be partial.
        // For now, maybe don't persist it as final history.
        return
      }
      const usage = calculateChatUsage(await result.usage)
      await persistChat(id, messages, usage)
    },
  })
}
