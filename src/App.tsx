import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Strip anything enclosed in < > (e.g. <situation 1> tags from system prompt)
const stripAngleTags = (text: string) =>
  text.replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim()

const isTouchDevice = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputBarRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const pendingScrollTarget = useRef<number | null>(null)
  const messagesRef = useRef<Message[]>([])
  const isDesktop = useIsDesktop()

  // Keep a ref in sync so scroll handler can read messages without stale closure
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Responsive sizes
  const fontSize = isDesktop ? 17 : 15.5
  const lineHeight = 1.65
  const firstLineH = fontSize * lineHeight
  // User bubble: single-line height = padding-top + firstLineH + padding-bottom
  const bubblePadY = isDesktop ? 11 : 10
  const bubbleHeight = bubblePadY + firstLineH + bubblePadY
  const avatarSize = Math.round(bubbleHeight)

  const scrollMessageToTop = useCallback((index: number) => {
    const container = messagesContainerRef.current
    const el = messageRefs.current.get(index)
    if (!container || !el) return
    const targetScroll = el.offsetTop - 80
    container.scrollTo({ top: targetScroll, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (pendingScrollTarget.current !== null) {
      const target = pendingScrollTarget.current
      pendingScrollTarget.current = null
      requestAnimationFrame(() => {
        scrollMessageToTop(target)
      })
    }
  }, [messages, scrollMessageToTop])

  // Reposition input bar above keyboard; prevent iOS from scrolling the page
  // Only active during chat — hero page doesn't need this
  useEffect(() => {
    if (!chatStarted) return

    const vv = window.visualViewport
    const resetPageScroll = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    // Catch the browser's native scroll-to-input on single tap focus
    const textarea = textareaRef.current
    const onFocus = () => {
      // Run immediately + after a short delay to catch iOS's deferred scroll
      resetPageScroll()
      setTimeout(resetPageScroll, 50)
      setTimeout(resetPageScroll, 150)
      setTimeout(resetPageScroll, 300)
    }
    textarea?.addEventListener('focus', onFocus)

    const onViewportChange = () => {
      resetPageScroll()

      const bar = inputBarRef.current
      if (!bar) return
      const offsetBottom = vv
        ? window.innerHeight - vv.height - vv.offsetTop
        : 0
      bar.style.bottom = `${Math.max(0, offsetBottom)}px`
    }

    vv?.addEventListener('resize', onViewportChange)
    vv?.addEventListener('scroll', onViewportChange)
    return () => {
      textarea?.removeEventListener('focus', onFocus)
      vv?.removeEventListener('resize', onViewportChange)
      vv?.removeEventListener('scroll', onViewportChange)
    }
  }, [chatStarted])

  // Clamp scroll: cannot scroll past the last user message being at the top
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const onScroll = () => {
      const msgs = messagesRef.current
      // Find last user message index
      let lastUserIdx = -1
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') { lastUserIdx = i; break }
      }
      if (lastUserIdx === -1) return

      const el = messageRefs.current.get(lastUserIdx)
      if (!el) return

      const maxScroll = el.offsetTop - 80
      if (container.scrollTop > maxScroll) {
        container.scrollTop = maxScroll
      }
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [chatStarted])

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setChatStarted(false)
    setIsStreaming(false)
    resetTextarea()
    messageRefs.current.clear()
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]

    setInput('')
    resetTextarea()

    if (isTouchDevice()) {
      // Collapse keyboard on mobile
      textareaRef.current?.blur()
    } else {
      // Restore focus on desktop after React re-renders
      requestAnimationFrame(() => textareaRef.current?.focus())
    }

    if (!chatStarted) {
      setChatStarted(true)
    }

    const userMsgIndex = newMessages.length - 1
    pendingScrollTarget.current = userMsgIndex

    setIsStreaming(true)
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) throw new Error('Request failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader')

      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                accumulated += content
                const current = accumulated
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: current }
                  return updated
                })
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '抱歉，出了点问题。请重新开始对话。',
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 680,
      margin: '0 auto',
      position: 'relative',
    }}>
      {/* Hero */}
      <AnimatePresence>
        {!chatStarted && (
          <motion.div
            key="hero"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              paddingBottom: 100,
            }}
          >
            <h1 style={{
              fontSize: isDesktop ? 58 : 42,
              fontWeight: 400,
              letterSpacing: 2,
              color: '#1a1a1a',
              marginBottom: 12,
            }}>
              Delphi
            </h1>
            <h3 style={{
              fontSize: isDesktop ? 27 : 15,
              fontWeight: 400,
              color: '#999',
              letterSpacing: 0.5,
            }}>
              Prompt Yourself to Think Better
            </h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages — with top fade mask */}
      <AnimatePresence>
        {chatStarted && (
          <motion.div
            key="messages-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              maxWidth: 680,
              margin: '0 auto',
            }}
          >
            {/* Top fade-out gradient mask */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 80,
              background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0) 100%)',
              zIndex: 10,
              pointerEvents: 'none',
            }} />

            {/* Bottom fade-out gradient mask */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
              background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0) 100%)',
              zIndex: 10,
              pointerEvents: 'none',
            }} />

            <div
              ref={messagesContainerRef}
              style={{
                height: '100%',
                overflowY: 'auto',
                overscrollBehavior: 'none',
                WebkitOverflowScrolling: 'touch',
                padding: '72px 20px 100px',
                display: 'flex',
                flexDirection: 'column',
                gap: 30,
              }}
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  ref={(el) => {
                    if (el) messageRefs.current.set(i, el)
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: msg.role === 'user' ? 2 : 10,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    maxWidth: '85%',
                  }}>
                    {/* Avatar — same height as a single-line user bubble */}
                    <div style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: '50%',
                      background: msg.role === 'user' ? '#FFF8E7' : '#f0f0f0',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: msg.role === 'user' ? (isDesktop ? 15 : 13) : (isDesktop ? 22 : 19),
                      color: '#888',
                    }}>
                      {msg.role === 'user' ? (
                        <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="8" r="4" fill="#1a1a1a" />
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#1a1a1a" />
                        </svg>
                      ) : 'δ'}
                    </div>

                    {/* Bubble */}
                    <div style={{
                      padding: msg.role === 'user'
                        ? `${bubblePadY}px 16px`
                        : `${bubblePadY}px 16px`,
                      background: msg.role === 'user' ? '#FFF8E7' : '#f0f0f0',
                      borderRadius: 20,
                      fontSize,
                      lineHeight,
                      color: '#1a1a1a',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.role === 'assistant' ? stripAngleTags(msg.content) : msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Bottom spacer — allows any message to be scrolled to the top */}
              <div style={{ minHeight: '80vh', flexShrink: 0 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar — Input + New Chat */}
      <motion.div
        ref={inputBarRef}
        layout
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: chatStarted ? 'fixed' : 'absolute',
          bottom: chatStarted ? 0 : '38%',
          left: 0,
          right: 0,
          maxWidth: 680,
          margin: '0 auto',
          padding: chatStarted ? '12px 16px 28px' : '0 24px',
          zIndex: 20,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
        }}>
          {/* Input field — liquid glass */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.3) 100%)',
            backdropFilter: 'blur(20px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
            borderRadius: 22,
            padding: '5px 5px 5px 16px',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="说点什么..."
              rows={1}
              style={{
                flex: 1,
                fontSize: isDesktop ? 16 : 15.5,
                lineHeight: 1.5,
                color: '#1a1a1a',
                resize: 'none',
                background: 'transparent',
                maxHeight: 120,
                padding: '4px 0',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSend}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: input.trim() ? '#FFF8E7' : 'rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#1a1a1a' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </motion.button>
          </div>

          {/* New Chat button — liquid glass, same height as input */}
          <AnimatePresence>
            {chatStarted && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                whileTap={{ scale: 0.92 }}
                onClick={handleNewChat}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.3) 100%)',
                  backdropFilter: 'blur(20px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default App
