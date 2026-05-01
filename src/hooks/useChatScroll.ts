import { useCallback, useLayoutEffect, useRef } from 'react'
import type { Message } from '../types'

const TOP_OFFSET = 80   // pinned user message sits this far from the container top
const BOTTOM_PAD = 120  // ~90px input bar + breathing room
const PADDING_BOTTOM = 100 // matches .messages-scroll padding-bottom

interface UseChatScroll {
  containerRef: React.RefObject<HTMLDivElement | null>
  spacerRef: React.RefObject<HTMLDivElement | null>
  registerMessage: (index: number, el: HTMLDivElement | null) => void
  scrollNewUserMessageToTop: (index: number) => void
}

export const useChatScroll = (messages: Message[], isStreaming: boolean): UseChatScroll => {
  const containerRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const registerMessage = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) messageRefs.current.set(index, el)
    else messageRefs.current.delete(index)
  }, [])

  // Dynamic spacer: tall enough to allow pinning the latest user message to the top,
  // but at least (50vh - paddingBottom) so the last assistant message bottom can rest
  // near the vertical middle of the viewport when scrolled all the way down.
  useLayoutEffect(() => {
    const container = containerRef.current
    const spacer = spacerRef.current
    if (!container || !spacer) return

    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserIdx = i; break }
    }
    const userEl = lastUserIdx >= 0 ? messageRefs.current.get(lastUserIdx) : null

    const baseline = Math.max(0, container.clientHeight / 2 - PADDING_BOTTOM)
    let desired = baseline

    if (userEl) {
      const currentSpacer = spacer.offsetHeight
      const naturalScrollHeight = container.scrollHeight - currentSpacer
      const tailHeight = naturalScrollHeight - userEl.offsetTop
      const pinRequirement = container.clientHeight - TOP_OFFSET - tailHeight
      desired = Math.max(baseline, pinRequirement)
    }

    spacer.style.minHeight = `${Math.max(0, desired)}px`
  }, [messages])

  const scrollNewUserMessageToTop = useCallback((index: number) => {
    requestAnimationFrame(() => {
      const container = containerRef.current
      const el = messageRefs.current.get(index)
      if (!container || !el) return
      container.scrollTo({ top: el.offsetTop - TOP_OFFSET, behavior: 'smooth' })
    })
  }, [])

  // Auto-follow assistant content while streaming
  useLayoutEffect(() => {
    if (!isStreaming) return
    const container = containerRef.current
    if (!container) return

    const lastIdx = messages.length - 1
    if (lastIdx < 0 || messages[lastIdx].role !== 'assistant') return
    const aEl = messageRefs.current.get(lastIdx)
    if (!aEl || aEl.offsetHeight === 0) return

    const aBottom = aEl.offsetTop + aEl.offsetHeight
    const visibleBottom = container.scrollTop + container.clientHeight - BOTTOM_PAD
    if (aBottom > visibleBottom) {
      container.scrollTop = aBottom - container.clientHeight + BOTTOM_PAD
    }
  }, [messages, isStreaming])

  return { containerRef, spacerRef, registerMessage, scrollNewUserMessageToTop }
}
