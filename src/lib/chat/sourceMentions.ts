import type { CollectionsWithSources } from '~/lib/types/collections'

import {
  formatCollectionLinkMarkdown,
  formatSourceLinkMarkdown,
} from '~/lib/chat/sourceLinks'

export type MentionSourceOption = {
  kind: 'source'
  id: string
  name: string
  collectionName: string
}

export type MentionCollectionOption = {
  kind: 'collection'
  id: string
  name: string
}

export type MentionOption = MentionSourceOption | MentionCollectionOption

export type ComposerMentionPart = {
  type: 'mention'
  kind: 'source' | 'collection'
  id: string
  name: string
  content: string
  start: number
  end: number
}

export type ComposerTextPart = {
  type: 'text'
  content: string
  start: number
  end: number
}

export type ComposerPart = ComposerTextPart | ComposerMentionPart

export const DEFAULT_COMPOSER_PARTS: ComposerPart[] = [{ type: 'text', content: '', start: 0, end: 0 }]

export function mentionOptionsFromCollections(
  collections: CollectionsWithSources | undefined
): MentionOption[] {
  if (!collections) return []

  const options: MentionOption[] = []
  for (const collection of collections) {
    options.push({
      kind: 'collection',
      id: collection.id,
      name: collection.name,
    })

    for (const source of collection.sources) {
      if (source.status !== 'ready') continue
      options.push({
        kind: 'source',
        id: source.id,
        name: source.name,
        collectionName: collection.name,
      })
    }
  }

  return options.sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name)
    if (nameCmp !== 0) return nameCmp
    if (a.kind === b.kind) return 0
    return a.kind === 'collection' ? -1 : 1
  })
}

export function collectionsHaveInFlightSources(collections: CollectionsWithSources | undefined) {
  if (!collections) return false

  return collections.some((collection) =>
    collection.sources.some((source) => source.status !== 'ready' && source.status !== 'failed')
  )
}

export function partsToDisplayText(parts: ComposerPart[]): string {
  return parts.map((part) => part.content).join('')
}

export function serializeComposerForModel(parts: ComposerPart[]): string {
  return parts
    .map((part) => {
      if (part.type === 'text') return part.content
      if (part.kind === 'collection') return formatCollectionLinkMarkdown(part.name, part.id)
      return formatSourceLinkMarkdown(part.name, part.id)
    })
    .join('')
}

export function getAtMentionContext(textBeforeCursor: string): { query: string; atOffset: number } | null {
  const match = textBeforeCursor.match(/@(\S*)$/)
  if (!match || match.index === undefined) return null
  return { query: match[1], atOffset: match.index }
}

export function isComposerEmpty(parts: ComposerPart[]): boolean {
  const text = partsToDisplayText(parts).replace(/\u200B/g, '').trim()
  return text.length === 0
}

export function filterMentionOptions(options: MentionOption[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return options.slice(0, 10)

  return options
    .filter((option) => {
      if (option.kind === 'collection') {
        return option.name.toLowerCase().includes(normalized)
      }

      return (
        option.name.toLowerCase().includes(normalized) ||
        option.collectionName.toLowerCase().includes(normalized)
      )
    })
    .slice(0, 10)
}

export function createMentionPart(option: MentionOption): ComposerMentionPart {
  const content = `@${option.name}`
  return {
    type: 'mention',
    kind: option.kind,
    id: option.id,
    name: option.name,
    content,
    start: 0,
    end: content.length,
  }
}
