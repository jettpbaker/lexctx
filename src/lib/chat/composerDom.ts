import type { ComposerMentionPart, ComposerPart } from '~/lib/chat/sourceMentions'
import { DEFAULT_COMPOSER_PARTS } from '~/lib/chat/sourceMentions'
import { cn } from '~/lib/utils'

export function createTextFragment(content: string): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const segments = content.split('\n')

  segments.forEach((segment, index) => {
    if (segment) fragment.appendChild(document.createTextNode(segment))
    if (index < segments.length - 1) fragment.appendChild(document.createElement('br'))
  })

  return fragment
}

export function getNodeLength(node: Node): number {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement
    if (element.tagName === 'BR') return 1
    if (element.dataset.type === 'mention') return getMentionContentLength(element)
  }
  return (node.textContent ?? '').replace(/\u200B/g, '').length
}

function getMentionContentLength(element: HTMLElement) {
  const name = element.dataset.mentionName ?? element.textContent?.replace(/^@/, '') ?? ''
  return `@${name}`.length
}

function getTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\u200B/g, '').length
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement
    if (element.tagName === 'BR') return 1
    if (element.dataset.type === 'mention') return getMentionContentLength(element)
  }

  let length = 0
  for (const child of Array.from(node.childNodes)) {
    length += getTextLength(child)
  }
  return length
}

export function getCursorPosition(parent: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0

  const range = selection.getRangeAt(0)
  if (!parent.contains(range.startContainer)) return 0

  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(parent)
  preCaretRange.setEnd(range.startContainer, range.startOffset)
  return getTextLength(preCaretRange.cloneContents())
}

export function setCursorPosition(parent: HTMLElement, position: number) {
  let remaining = position
  let node = parent.firstChild

  while (node) {
    const length = getNodeLength(node)
    const isText = node.nodeType === Node.TEXT_NODE
    const isMention =
      node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset.type === 'mention'
    const isBreak = node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR'

    if (isText && remaining <= length) {
      const range = document.createRange()
      const selection = window.getSelection()
      range.setStart(node, remaining)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
      return
    }

    if ((isMention || isBreak) && remaining <= length) {
      const range = document.createRange()
      const selection = window.getSelection()
      if (remaining === 0) range.setStartBefore(node)
      if (remaining > 0 && isMention) range.setStartAfter(node)
      if (remaining > 0 && isBreak) {
        const next = node.nextSibling
        if (next?.nodeType === Node.TEXT_NODE) range.setStart(next, 0)
        else range.setStartAfter(node)
      }
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
      return
    }

    remaining -= length
    node = node.nextSibling
  }

  const fallbackRange = document.createRange()
  const fallbackSelection = window.getSelection()
  const last = parent.lastChild
  if (last?.nodeType === Node.TEXT_NODE) {
    fallbackRange.setStart(last, last.textContent?.length ?? 0)
  } else {
    fallbackRange.selectNodeContents(parent)
  }
  fallbackRange.collapse(false)
  fallbackSelection?.removeAllRanges()
  fallbackSelection?.addRange(fallbackRange)
}

export function setRangeEdge(parent: HTMLElement, range: Range, edge: 'start' | 'end', offset: number) {
  let remaining = offset

  for (const node of Array.from(parent.childNodes)) {
    const length = getNodeLength(node)
    const isText = node.nodeType === Node.TEXT_NODE
    const isMention =
      node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset.type === 'mention'
    const isBreak = node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR'

    if (isText && remaining <= length) {
      if (edge === 'start') range.setStart(node, remaining)
      else range.setEnd(node, remaining)
      return
    }

    if ((isMention || isBreak) && remaining <= length) {
      if (edge === 'start' && remaining === 0) range.setStartBefore(node)
      if (edge === 'start' && remaining > 0) range.setStartAfter(node)
      if (edge === 'end' && remaining === 0) range.setEndBefore(node)
      if (edge === 'end' && remaining > 0) range.setEndAfter(node)
      return
    }

    remaining -= length
  }
}

export function getOffsetRect(parent: HTMLElement, offset: number): DOMRect | null {
  const range = document.createRange()
  setRangeEdge(parent, range, 'start', offset)
  range.collapse(true)

  const rects = range.getClientRects()
  if (rects.length > 0) return rects[0]

  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) return null
  return rect
}

const PLAY_ICON_PATH =
  'M18.8906 12.846C18.5371 14.189 16.8667 15.138 13.5257 17.0361C10.296 18.8709 8.6812 19.7884 7.37983 19.4196C6.8418 19.2671 6.35159 18.9776 5.95624 18.5787C5 17.6139 5 15.7426 5 12C5 8.2574 5 6.3861 5.95624 5.42132C6.35159 5.02245 6.8418 4.73288 7.37983 4.58042C8.6812 4.21165 10.296 5.12907 13.5257 6.96393C16.8667 8.86197 18.5371 9.811 18.8906 11.154C19.0365 11.7084 19.0365 12.2916 18.8906 12.846Z'

const FOLDER_ICON_PATH =
  'M8 7H16.75C18.8567 7 19.91 7 20.6667 7.50559C20.9943 7.72447 21.2755 8.00572 21.4944 8.33329C22 9.08996 22 10.1433 22 12.25C22 15.7612 22 17.5167 21.1573 18.7779C20.7926 19.3238 20.3238 19.7926 19.7779 20.1573C18.5167 21 16.7612 21 13.25 21H12C7.28595 21 4.92893 21 3.46447 19.5355C2 18.0711 2 15.714 2 11V7.94427C2 6.1278 2 5.21956 2.38032 4.53806C2.65142 4.05227 3.05227 3.65142 3.53806 3.38032C4.21956 3 5.1278 3 6.94427 3C8.10802 3 8.6899 3 9.19926 3.19101C10.3622 3.62712 10.8418 4.68358 11.3666 5.73313L12 7'

const CANCEL_ICON_PATH = 'M18 6L6.00081 17.9992M17.9992 18L6 6.00085'

function createMentionSvg(pathD: string, options?: { strokeLinejoin?: string }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('size-3')

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathD)
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-width', '1.5')
  if (options?.strokeLinejoin) path.setAttribute('stroke-linejoin', options.strokeLinejoin)
  svg.appendChild(path)

  return svg
}

function createMentionIconButton(kind: 'source' | 'collection', label: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.mentionRemove = 'true'
  button.setAttribute('aria-label', label)
  button.className =
    'inline-flex shrink-0 cursor-default rounded-sm p-0 text-citation group-hover:cursor-pointer group-hover:text-citation/70 hover:text-citation'

  const defaultIcon = document.createElement('span')
  defaultIcon.className = cn(
    'inline-flex group-hover:hidden',
    kind === 'collection' ? 'text-muted-foreground' : 'text-citation'
  )
  defaultIcon.appendChild(
    createMentionSvg(kind === 'collection' ? FOLDER_ICON_PATH : PLAY_ICON_PATH, {
      strokeLinejoin: kind === 'source' ? 'round' : undefined,
    })
  )

  const removeIcon = document.createElement('span')
  removeIcon.className = 'hidden group-hover:inline-flex'
  removeIcon.appendChild(createMentionSvg(CANCEL_ICON_PATH, { strokeLinejoin: 'round' }))

  button.appendChild(defaultIcon)
  button.appendChild(removeIcon)

  return button
}

function createInlineMentionPill(part: ComposerMentionPart) {
  const pill = document.createElement('span')
  pill.dataset.type = 'mention'
  pill.dataset.mentionKind = part.kind
  pill.dataset.mentionId = part.id
  pill.dataset.mentionName = part.name
  pill.contentEditable = 'false'
  pill.className =
    'group mx-0.5 inline-flex max-w-[12rem] cursor-default items-center gap-0.5 align-baseline text-xs font-medium text-citation'

  const label = document.createElement('span')
  label.dataset.mentionLabel = 'true'
  label.textContent = part.name
  label.className = 'min-w-0 cursor-default truncate underline-offset-2 hover:underline'

  pill.appendChild(createMentionIconButton(part.kind, `Remove ${part.name}`))
  pill.appendChild(label)
  return pill
}

export function createMentionPill(part: ComposerMentionPart) {
  return createInlineMentionPill(part)
}

export function parseComposerFromDom(parent: HTMLElement): ComposerPart[] {
  const parts: ComposerPart[] = []
  let position = 0
  let buffer = ''

  const flushText = () => {
    let content = buffer
    if (content.includes('\r')) content = content.replace(/\r\n?/g, '\n')
    if (content.includes('\u200B')) content = content.replace(/\u200B/g, '')
    buffer = ''
    if (!content) return
    parts.push({ type: 'text', content, start: position, end: position + content.length })
    position += content.length
  }

  const pushMention = (mention: HTMLElement) => {
    const kind =
      mention.dataset.mentionKind === 'collection' || mention.dataset.mentionKind === 'source'
        ? mention.dataset.mentionKind
        : 'source'
    const name =
      mention.dataset.mentionName ??
      mention.dataset.sourceName ??
      mention.textContent?.replace(/^@/, '') ??
      ''
    const content = `@${name.replace(/^@/, '')}`
    parts.push({
      type: 'mention',
      kind,
      id: mention.dataset.mentionId ?? mention.dataset.sourceId ?? '',
      name: name.replace(/^@/, ''),
      content,
      start: position,
      end: position + content.length,
    })
    position += content.length
  }

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      buffer += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const element = node as HTMLElement
    if (element.dataset.type === 'mention') {
      flushText()
      pushMention(element)
      return
    }
    if (element.tagName === 'BR') {
      buffer += '\n'
      return
    }

    for (const child of Array.from(element.childNodes)) {
      visit(child)
    }
  }

  const children = Array.from(parent.childNodes)
  children.forEach((child, index) => {
    const isBlock =
      child.nodeType === Node.ELEMENT_NODE && ['DIV', 'P'].includes((child as HTMLElement).tagName)
    visit(child)
    if (isBlock && index < children.length - 1) buffer += '\n'
  })

  flushText()
  if (parts.length === 0) return [...DEFAULT_COMPOSER_PARTS]
  return parts
}

export function renderComposerEditor(parent: HTMLElement, parts: ComposerPart[]) {
  parent.replaceChildren()

  for (const part of parts) {
    if (part.type === 'text') {
      parent.appendChild(createTextFragment(part.content))
      continue
    }
    parent.appendChild(createMentionPill(part))
  }

  const last = parent.lastChild
  if (last?.nodeType === Node.ELEMENT_NODE && (last as HTMLElement).tagName === 'BR') {
    parent.appendChild(document.createTextNode('\u200B'))
  }
}
