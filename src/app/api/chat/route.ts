import type { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai'

import {
  gateway,
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

const CHAT_MODEL_ID = 'openai/gpt-5.5'
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

  return `You are the assistant inside lexctx, an app where users upload lectures, talks, recordings, documents, and organize them into collections.

Your main job is to answer from the user's uploaded sources when the question may depend on them.

Tool use:
- Use sourceSearch for questions about uploaded content, lectures, sources, collections, course material, or anything the user likely expects lexctx to know from their library.
- For broad synthesis, open-ended questions, or uncertain scope, usually make 2-4 sourceSearch calls in parallel with different focused queries or angles.
- Use a single sourceSearch when the user asks for a very specific fact, names an exact source, or gives a narrow search target.
- Use sourceSearch without filters for broad synthesis or uncertain scope unless a specific source or collection filter is clearly needed.
- If the user names a specific source, lecture, week, collection, or topic, use listSources, listSourcesForCollection, or listCollections when you need IDs, then search with sourceIds or collectionIds.
- If a search result is relevant but too narrow, use getNearbyRagChunks to inspect surrounding context before answering.
- If filtered search is weak or empty, retry with broader sourceSearch.
- Use webSearch for fresh or external information, and readWebPage when a web result needs more detail. Web search should complement uploaded sources, not replace them.

Answering:
- Be extremely concise. Default to 1-3 short sentences or one short paragraph unless the user explicitly asks for depth.
- Never format answers as lists. Do not use bullets, numbered lists, checklists, or multi-item outlines.
- Never render markdown code blocks or fenced snippets. If code is unavoidable, keep it inline and brief.
- Never render tables. Summarize comparisons in plain prose instead.
- Avoid markdown structure beyond short paragraphs and citation links. Do not use headings unless the user explicitly asks for a structured answer.
- If the uploaded sources do not contain enough evidence, say that clearly.
- For source-specific questions, prioritize uploaded sources over general knowledge or web results.
- Use the user's timezone for relative dates.

Current date: ${localDate}
User timezone: ${resolvedTimeZone}

Citations:
- Cite sourceSearch results with markdown links using citationLabel as the visible text and citationId in the href.
- Example: [S1](#citation-11111111-1111-1111-1111-111111111111:chunk:3)
- Keep citations minimal. For most focused answers, 1-2 citations is enough.
- Using more than 2 citations can be a sign the answer is trying to cover too much. Use more only when the question truly requires several distinct facts from scattered parts of the sources.
- Place each citation immediately after the claim it supports.
- If a citation is placed at the end of a sentence, DO NOT follow it with a period/full stop, just start the next sentence.
- Cite only chunks that directly support the claim.
- Do not cite search results that are only indirectly relevant.
- Do not batch citations at the end.
- Do not write bare labels like S1.
- Do not cite the same citationId more than once in a single response.
- Citation IDs are valid only for the current sourceSearch results; call sourceSearch again before citing in a later response.`
}

function calculateChatUsage(usage: LanguageModelUsage, contextInputTokens: number): ChatUsage {
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
    contextInputTokens,
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
    return { exists: true, messages: [] }
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

  await persistChat(id, validatedMessages)

  const result = streamText({
    model: gateway(CHAT_MODEL_ID),
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
      const [billingUsage, finalStepUsage] = await Promise.all([result.totalUsage, result.usage])
      const usage = calculateChatUsage(billingUsage, finalStepUsage.inputTokens ?? 0)
      await persistChat(id, messages, usage)
    },
  })
}
