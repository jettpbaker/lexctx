'use client'

import { useEffect, useState, type RefObject } from 'react'

const EDGE_THRESHOLD_PX = 1

export type ScrollEdges = { atTop: boolean; atBottom: boolean }

export type HorizontalScrollEdges = { atLeft: boolean; atRight: boolean }

/**
 * Tracks whether a scroll container is currently flush against its top and/or
 * bottom edge. Re-measures on scroll and on size changes (content or viewport).
 *
 * When content fits and isn't scrollable, both `atTop` and `atBottom` are `true`.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>({ atTop: true, atBottom: true })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const atTop = el.scrollTop <= EDGE_THRESHOLD_PX
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= EDGE_THRESHOLD_PX
      setEdges((prev) =>
        prev.atTop === atTop && prev.atBottom === atBottom ? prev : { atTop, atBottom }
      )
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [ref])

  return edges
}

/**
 * Builds a `mask-image` value that fades the top and/or bottom of a scroll
 * container. An edge that is currently flush (atTop / atBottom) is left
 * un-faded so content sits crisply against it instead of being washed out.
 *
 * Returns `undefined` when both edges are flush (no scroll), so callers can
 * skip applying a mask entirely in that common case.
 */
/**
 * Horizontal counterpart of {@link useScrollEdges}. Tracks whether a scroll
 * container is flush against its left and/or right edge. Re-measures on scroll
 * and size changes.
 *
 * When content fits and isn't scrollable, both `atLeft` and `atRight` are `true`.
 */
export function useHorizontalScrollEdges(
  ref: RefObject<HTMLElement | null>
): HorizontalScrollEdges {
  const [edges, setEdges] = useState<HorizontalScrollEdges>({ atLeft: true, atRight: true })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const atLeft = el.scrollLeft <= EDGE_THRESHOLD_PX
      const atRight = el.scrollWidth - el.scrollLeft - el.clientWidth <= EDGE_THRESHOLD_PX
      setEdges((prev) =>
        prev.atLeft === atLeft && prev.atRight === atRight ? prev : { atLeft, atRight }
      )
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [ref])

  return edges
}

export function buildScrollFadeMask({
  atTop,
  atBottom,
  topPx,
  bottomPx,
}: ScrollEdges & { topPx: number; bottomPx: number }): string | undefined {
  if (atTop && atBottom) return undefined
  const top = atTop ? 'black 0' : `transparent 0, black ${topPx}px`
  const bottom = atBottom ? 'black 100%' : `black calc(100% - ${bottomPx}px), transparent 100%`
  return `linear-gradient(to bottom, ${top}, ${bottom})`
}
