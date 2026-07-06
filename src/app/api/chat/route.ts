import type { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai'
import type { XaiLanguageModelResponsesOptions } from '@ai-sdk/xai'
import type { ChatUsage } from '~/lib/types/chat'

import {
  gateway,
  streamText,
  convertToModelMessages,
  stepCountIs,
  validateUIMessages,
  createIdGenerator,
  consumeStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type StreamTextResult,
} from 'ai'
import { z } from 'zod'
import { withDbRetry } from '~/lib/db/withDbRetry'
import {
  addLanguageModelUsages,
  calculateChatUsage,
  emptyLanguageModelUsage,
} from '~/server/ai/calculateChatUsage'
import { chatTools } from '~/server/ai/tools'
import { parseChatModelId, type ChatModelId } from '~/server/ai/modelMapping'
import { loadChat, persistChat, type LexMessage } from '~/server/chat/store'

const CHAT_MAX_STEPS = 12
const chatPostSchema = z.object({
  id: z.string().min(1).max(64),
  message: z.object({}).passthrough(),
  locale: z.string().optional(),
  timeZone: z.string().optional(),
  modelId: z.string().optional(),
})

type ChatProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>
type OpenAIReasoningEffort = NonNullable<OpenAILanguageModelResponsesOptions['reasoningEffort']>
type XaiReasoningEffort = NonNullable<XaiLanguageModelResponsesOptions['reasoningEffort']>
type AnthropicLanguageModelOptions = {
  thinking?:
    | {
        type: 'adaptive'
        display?: 'summarized' | 'omitted'
      }
    | {
        type: 'enabled'
        budgetTokens: number
      }
  effort?: 'low' | 'medium' | 'high'
}

const OPENAI_REASONING_EFFORT_BY_MODEL: Partial<Record<ChatModelId, OpenAIReasoningEffort>> = {
  'openai/gpt-5.5': 'low',
  'openai/gpt-5.4': 'medium',
  'openai/gpt-5.4-mini': 'high',
} as const

const XAI_REASONING_EFFORT_BY_MODEL: Partial<Record<ChatModelId, XaiReasoningEffort>> = {
  'xai/grok-4.3': 'high',
} as const

const ANTHROPIC_REASONING_BY_MODEL: Partial<Record<ChatModelId, AnthropicLanguageModelOptions>> = {
  'anthropic/claude-opus-4.7': {
    thinking: { type: 'adaptive', display: 'summarized' },
    effort: 'low',
  },
  'anthropic/claude-sonnet-4.6': {
    thinking: { type: 'adaptive', display: 'summarized' },
    effort: 'medium',
  },
  'anthropic/claude-haiku-4.5': {
    thinking: { type: 'enabled', budgetTokens: 12_000 },
  },
} as const

function getChatProviderOptions(modelId: ChatModelId, chatId: string): ChatProviderOptions | undefined {
  if (modelId.startsWith('anthropic/')) {
    const reasoningOptions = ANTHROPIC_REASONING_BY_MODEL[modelId]

    return {
      gateway: {
        caching: 'auto',
      },
      ...(reasoningOptions && {
        anthropic: reasoningOptions,
      }),
    }
  }

  if (modelId.startsWith('openai/')) {
    const reasoningEffort = OPENAI_REASONING_EFFORT_BY_MODEL[modelId] ?? 'medium'

    return {
      openai: {
        reasoningEffort,
        reasoningSummary: 'auto',
        promptCacheKey: chatId,
        textVerbosity: 'low',
      } satisfies OpenAILanguageModelResponsesOptions,
    }
  }

  if (modelId.startsWith('xai/')) {
    const reasoningEffort = XAI_REASONING_EFFORT_BY_MODEL[modelId] ?? 'medium'

    return {
      xai: {
        reasoningEffort,
      } satisfies XaiLanguageModelResponsesOptions,
    }
  }

  return undefined
}

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
- The user may include inline source links like [Week 3 Lecture](#source-uuid) or collection links like [CS50](#collection-uuid). These are hints to prioritize that scope. When present and relevant, pass the sourceId in sourceSearch sourceIds or the collectionId in collectionIds instead of searching globally.
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

export async function POST(req: Request) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsedBody = chatPostSchema.safeParse(body)
  if (!parsedBody.success) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { message: rawMessage, id, locale, timeZone, modelId: requestedModelId } = parsedBody.data
  const message = rawMessage as unknown as LexMessage
  const modelId = parseChatModelId(requestedModelId)

  const chat = await loadChat(id)

  const messages: LexMessage[] = chat.exists ? [...chat.messages, message] : [message]

  const validatedMessages = await validateUIMessages<LexMessage>({
    messages,
  })

  const checkpointPersistPromise = withDbRetry(() =>
    persistChat(id, validatedMessages, modelId)
  ).catch((error) => {
    console.error('Error persisting chat checkpoint: ', error)
  })

  const modelMessages = await convertToModelMessages(validatedMessages)

  const generateMessageId = createIdGenerator({
    prefix: 'msg',
    size: 16,
  })

  let streamResult: StreamTextResult<typeof chatTools, never> | undefined

  const stream = createUIMessageStream<LexMessage>({
    originalMessages: messages,
    generateId: generateMessageId,
    execute: ({ writer }) => {
      let turnUsage = emptyLanguageModelUsage()

      streamResult = streamText({
        model: gateway(modelId),
        providerOptions: getChatProviderOptions(modelId, id),
        tools: chatTools,
        system: getSystemPrompt(timeZone, locale),
        messages: modelMessages,
        stopWhen: stepCountIs(CHAT_MAX_STEPS),
        abortSignal: req.signal,
        onStepFinish: ({ usage }) => {
          turnUsage = addLanguageModelUsages(turnUsage, usage)
          writer.write({
            type: 'data-usage',
            data: calculateChatUsage(turnUsage, usage.inputTokens ?? 0, modelId),
            transient: true,
          })
        },
      })

      writer.merge(
        streamResult.toUIMessageStream({
          originalMessages: messages,
          generateMessageId,
        })
      )
    },
    onFinish: async ({ messages, isAborted }) => {
      await checkpointPersistPromise

      if (!streamResult) {
        return
      }

      let usage: ChatUsage | undefined

      if (!isAborted) {
        try {
          const [billingUsage, finalStepUsage] = await Promise.all([
            streamResult.totalUsage,
            streamResult.usage,
          ])
          usage = calculateChatUsage(
            billingUsage,
            finalStepUsage.inputTokens ?? 0,
            modelId
          )
        } catch (error) {
          console.error('Error resolving chat usage: ', error)
        }
      }

      try {
        await withDbRetry(() => persistChat(id, messages, modelId, usage))
      } catch (error) {
        console.error('Error persisting chat: ', error)
      }
    },
  })

  return createUIMessageStreamResponse({
    stream,
    consumeSseStream: consumeStream,
  })
}
