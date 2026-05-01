import { motion } from 'framer-motion'
import type { Message } from '../types'
import { renderBasicMarkdown, stripAngleTags } from '../utils/markdown'

const EASE = [0.25, 0.1, 0.25, 1] as const

interface Props {
  message: Message
  registerRef: (el: HTMLDivElement | null) => void
}

export const MessageItem = ({ message, registerRef }: Props) => {
  const isUser = message.role === 'user'
  const hasContent = message.content.trim().length > 0

  return (
    <motion.div
      ref={registerRef}
      className={`msg-row ${isUser ? 'msg-row-user' : 'msg-row-assistant'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <div className="msg-inner">
        {(isUser || hasContent) && (
          <div className={`avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
            {isUser ? <UserIcon /> : 'δ'}
          </div>
        )}

        {isUser ? (
          <div className="bubble bubble-user">{message.content}</div>
        ) : hasContent ? (
          <div className="bubble bubble-assistant">
            <span dangerouslySetInnerHTML={{
              __html: renderBasicMarkdown(stripAngleTags(message.content)),
            }} />
          </div>
        ) : (
          <LoadingDots />
        )}
      </div>
    </motion.div>
  )
}

const LoadingDots = () => (
  <div className="loading-dots" aria-label="Loading">
    <span /><span /><span />
  </div>
)

const UserIcon = () => (
  <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill="#F0EDE4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#F0EDE4" />
  </svg>
)
