export const SOURCE_LINK_HREF_PREFIX = '#source-'
export const COLLECTION_LINK_HREF_PREFIX = '#collection-'

export function sourceLinkHref(sourceId: string) {
  return `${SOURCE_LINK_HREF_PREFIX}${sourceId}`
}

export function collectionLinkHref(collectionId: string) {
  return `${COLLECTION_LINK_HREF_PREFIX}${collectionId}`
}

export function escapeMarkdownLinkLabel(label: string) {
  return label.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

export function formatSourceLinkMarkdown(sourceName: string, sourceId: string) {
  return `[${escapeMarkdownLinkLabel(sourceName)}](${sourceLinkHref(sourceId)})`
}

export function formatCollectionLinkMarkdown(collectionName: string, collectionId: string) {
  return `[${escapeMarkdownLinkLabel(collectionName)}](${collectionLinkHref(collectionId)})`
}

export function isSourceLinkHref(href: string | undefined): href is string {
  return typeof href === 'string' && href.startsWith(SOURCE_LINK_HREF_PREFIX)
}

export function isCollectionLinkHref(href: string | undefined): href is string {
  return typeof href === 'string' && href.startsWith(COLLECTION_LINK_HREF_PREFIX)
}

export function sourceIdFromHref(href: string) {
  return href.slice(SOURCE_LINK_HREF_PREFIX.length)
}

export function parseSourceIdsFromMarkdown(text: string) {
  const ids: string[] = []
  const sourceHrefRegex = /\]\(#source-([^)]+)\)/g

  for (const match of text.matchAll(sourceHrefRegex)) {
    ids.push(match[1])
  }

  return ids
}
