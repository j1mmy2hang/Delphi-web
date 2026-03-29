import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputBarRef = useRef<HTMLDivElement>(null)

  const scrollToLatest = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    // Scroll so the latest content is visible — push to bottom of scroll
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    })
  }, [])

  useEffect(() => {
    scrollToLatest()
  }, [messages, scrollToLatest])

  // Keep input bar above the mobile keyboard using visualViewport
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const onResize = () => {
      const bar = inputBarRef.current
      if (!bar || !chatStarted) return
      // offsetTop = how much the viewport has shifted up due to keyboard
      const offsetBottom = window.innerHeight - vv.height - vv.offsetTop
      bar.style.bottom = `${Math.max(0, offsetBottom)}px`
    }

    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
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
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    resetTextarea()

    // Blur input on mobile so keyboard collapses
    textareaRef.current?.blur()

    if (!chatStarted) {
      setChatStarted(true)
    }

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
      {/* New Chat Button — liquid glass icon */}
      <AnimatePresence>
        {chatStarted && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={handleNewChat}
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 100,
              width: 40,
              height: 40,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 100%)',
              backdropFilter: 'blur(20px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
              border: '1px solid rgba(255,255,255,0.45)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {/* pencil-square / compose icon */}
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

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
              fontSize: 42,
              fontWeight: 400,
              letterSpacing: 2,
              color: '#1a1a1a',
              marginBottom: 12,
            }}>
              Delphi
            </h1>
            <h3 style={{
              fontSize: 15,
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
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
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

            <div
              ref={messagesContainerRef}
              style={{
                height: '100%',
                overflowY: 'auto',
                padding: '72px 20px 100px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
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
                    {/* Avatar — vertically aligned to first line of text */}
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: msg.role === 'user' ? '#FFF8E7' : '#f0f0f0',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: '#888',
                      // align center of avatar with center of first text line
                      // first line height = fontSize(15.5) * lineHeight(1.65) ≈ 25.6px
                      // bubble top padding = 10px for user, 6px for assistant
                      // avatar center should be at: padding + lineHeight/2
                      // avatar is 28px, so offset = padding + lineHeight/2 - 14
                      marginTop: msg.role === 'user' ? Math.round(10 + 25.6 / 2 - 14) : Math.round(6 + 25.6 / 2 - 14),
                    }}>
                      {msg.role === 'user' ? '你' : 'δ'}
                    </div>

                    {/* Bubble */}
                    <div style={{
                      padding: msg.role === 'user' ? '10px 16px' : '6px 4px',
                      background: msg.role === 'user' ? '#FFF8E7' : 'transparent',
                      borderRadius: msg.role === 'user' ? 20 : 0,
                      fontSize: 15.5,
                      lineHeight: 1.65,
                      color: '#1a1a1a',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
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
          background: chatStarted ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: chatStarted ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: chatStarted ? 'blur(16px)' : 'none',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          background: '#f8f8f8',
          borderRadius: 24,
          padding: '10px 10px 10px 18px',
          border: '1px solid rgba(0,0,0,0.06)',
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
              fontSize: 15.5,
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
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: input.trim() ? '#FFF8E7' : '#eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#1a1a1a' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default App
