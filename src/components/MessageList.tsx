import { motion } from 'framer-motion'
import type { Message } from '../types'
import { MessageItem } from './MessageItem'

interface Props {
  messages: Message[]
  containerRef: React.RefObject<HTMLDivElement | null>
  spacerRef: React.RefObject<HTMLDivElement | null>
  registerMessage: (index: number, el: HTMLDivElement | null) => void
}

export const MessageList = ({ messages, containerRef, spacerRef, registerMessage }: Props) => (
  <motion.div
    key="messages-wrapper"
    className="messages-wrapper"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, delay: 0.2 }}
  >
    <div ref={containerRef} className="messages-scroll">
      {messages.map((msg, i) => (
        <MessageItem
          key={i}
          message={msg}
          registerRef={(el) => registerMessage(i, el)}
        />
      ))}
      <div ref={spacerRef} className="messages-bottom-spacer" />
    </div>
  </motion.div>
)
