export const CITATION_LINK_HREF_PREFIX = '#citation-'

export type ParsedCitationId = {
  sourceId: string
  chunkIndex: number
}

export function citationId(sourceId: string, chunkIndex: number) {
  return `${sourceId}:chunk:${chunkIndex}`
}

export function citationHref(sourceId: string, chunkIndex: number) {
  return `${CITATION_LINK_HREF_PREFIX}${citationId(sourceId, chunkIndex)}`
}

export function isCitationLinkHref(href: string | undefined): href is string {
  return href?.startsWith(CITATION_LINK_HREF_PREFIX) ?? false
}

export function citationIdFromHref(href: string) {
  return href.replace(CITATION_LINK_HREF_PREFIX, '')
}

export function parseCitationId(id: string): ParsedCitationId | null {
  const match = id.match(/^(.+):chunk:(\d+)$/)
  if (!match) return null

  return {
    sourceId: match[1],
    chunkIndex: Number(match[2]),
  }
}

export function parseCitationIdsFromMarkdown(markdown: string) {
  const ids: string[] = []
  const citationHrefRegex = /\]\(#citation-([^)]+)\)/g

  for (const match of markdown.matchAll(citationHrefRegex)) {
    ids.push(match[1])
  }

  return ids
}
