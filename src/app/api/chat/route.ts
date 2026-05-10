import type { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai'

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

const CHAT_MODEL_ID = 'openai/gpt-5.4-mini'
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

function getSystemPrompt(timeZone: unknown, locale: unknown) {
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

  return `You are the assistant inside lexctx, an app where the user uploads sources — lectures, talks, recordings, documents, etc. — and organizes them into collections. You can search across their sources with the sourceSearch tool, list their collections and sources, and look things up on the web.

When a question might depend on what's in the user's uploaded sources, sourceSearch is usually the right way to answer it. For general questions that don't rely on their content, answer directly.

Use webSearch proactively when fresh or external information would genuinely help — recent context, references their sources wouldn't cover, things worth verifying. It's best as a complement to the user's sources rather than a replacement, and there's no need to search for the sake of searching.

Write to be read quickly. Favor short paragraphs and clear markdown headings over long bulleted lists — a list is often a symptom of details that could be consolidated into a sentence or two. Aim for information density, not word count.

Current date: ${localDate}
User timezone: ${resolvedTimeZone}

Use the user's timezone when interpreting relative dates like today, tomorrow, yesterday, this week, or next lecture.

When citing a result returned by the sourceSearch tool, cite it in the same response with an explicit markdown link. Use the result's citationLabel as the visible link text and the result's exact citationId in the href. For example, if citationLabel is S1 and citationId is 11111111-1111-1111-1111-111111111111:chunk:3, write [S1](#citation-11111111-1111-1111-1111-111111111111:chunk:3). Attach a citation **only** when that chunk directly answers the user's question—you may summarize, aggregate, or reason from search results that are only indirectly relevant, without citing those parts. Place each citation immediately after the sentence or claim it supports (or after a quoted span if you use one)—not batched together at the end of a paragraph. You do not need to phrase supported information as a literal quotation. Do not write bare citation labels like S1; they will not render as citations. Never cite the same chunk twice in one assistant message, and never repeat the same citationId link anywhere in that message. Citing different chunks from the same underlying source is fine. Citation IDs are scoped to the current sourceSearch results, so call sourceSearch again before citing sources in a later response.`
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

  if (!chat.messagesGzipBase64) {
    // TODO Handle this case
    console.error('[loadChat] chat has no messagesGzipBase64', chat)
    throw new Error('Chat has no messagesGzipBase64')
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
    model: CHAT_MODEL_ID,
    providerOptions: {
      openai: {
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        promptCacheKey: id,
        textVerbosity: 'low',
      } satisfies OpenAILanguageModelResponsesOptions,
    },
    tools: chatTools,
    system: getSystemPrompt(timeZone, locale),
    messages: await convertToModelMessages(validatedMessages),
    stopWhen: stepCountIs(5),
    abortSignal: req.signal,
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
