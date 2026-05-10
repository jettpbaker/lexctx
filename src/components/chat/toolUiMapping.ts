import type { chatTools } from '~/server/ai/tools'

import {
  AiSearch02Icon,
  BookOpen01Icon,
  BookOpen02Icon,
  Globe02Icon,
  Search01Icon,
  SearchList02Icon,
} from '@hugeicons/core-free-icons'

export type ToolName = keyof typeof chatTools

type ToolIcon = typeof Search01Icon

export type ToolUiMapping = {
  icon: ToolIcon | null
  text: string
  completedText: string
}

export const toolUiMapping = {
  sourceSearch: {
    icon: AiSearch02Icon,
    text: 'Searching sources',
    completedText: 'Searched sources',
  },
  getNearbyRagChunks: {
    icon: BookOpen02Icon,
    text: 'Ingesting nearby context',
    completedText: 'Ingested nearby context',
  },
  listSources: {
    icon: SearchList02Icon,
    text: 'Finding sources',
    completedText: 'Found sources',
  },
  listSourcesForCollection: {
    icon: SearchList02Icon,
    text: 'Finding sources in a collection',
    completedText: 'Found sources in a collection',
  },
  listCollections: {
    icon: SearchList02Icon,
    text: 'Finding collections',
    completedText: 'Found collections',
  },
  webSearch: {
    icon: Globe02Icon,
    text: 'Searching the web',
    completedText: 'Searched the web',
  },
  readWebPage: {
    icon: BookOpen01Icon,
    text: 'Reading web page',
    completedText: 'Read web page',
  },
} satisfies Record<ToolName, ToolUiMapping>

export function isToolName(name: string): name is ToolName {
  return Object.hasOwn(toolUiMapping, name)
}

export function getToolUiMapping(toolName: string): ToolUiMapping {
  if (isToolName(toolName)) {
    return toolUiMapping[toolName]
  }
  return {
    icon: null,
    text: toolName,
    completedText: toolName,
  }
}
