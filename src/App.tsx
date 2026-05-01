import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Hero } from './components/Hero'
import { InputBar } from './components/InputBar'
import { MessageList } from './components/MessageList'
import { useChatStream } from './hooks/useChatStream'
import { useChatScroll } from './hooks/useChatScroll'
import { useViewportKeyboard } from './hooks/useViewportKeyboard'

function App() {
  const [input, setInput] = useState('')
  const { messages, isStreaming, send, reset } = useChatStream()
  const chatStarted = messages.length > 0
  const inputBarRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { containerRef, registerMessage, scrollNewUserMessageToTop } =
    useChatScroll(messages, isStreaming)

  useViewportKeyboard(chatStarted, textareaRef, inputBarRef)

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    const newUserIdx = messages.length
    send(trimmed)
    scrollNewUserMessageToTop(newUserIdx)
  }

  const handleNewChat = () => {
    reset()
    setInput('')
  }

  return (
    <div className="app">
      <AnimatePresence>{!chatStarted && <Hero />}</AnimatePresence>

      <AnimatePresence>
        {chatStarted && (
          <MessageList
            messages={messages}
            containerRef={containerRef}
            registerMessage={registerMessage}
          />
        )}
      </AnimatePresence>

      <InputBar
        ref={inputBarRef}
        textareaRef={textareaRef}
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onNewChat={handleNewChat}
        chatStarted={chatStarted}
      />
    </div>
  )
}

export default App
