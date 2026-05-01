import { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCirclePlus } from 'lucide-react'
import { isTouchDevice } from '../hooks/device'

const EASE = [0.25, 0.1, 0.25, 1] as const
const TEXTAREA_MAX_HEIGHT = 120

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onNewChat: () => void
  chatStarted: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export const InputBar = forwardRef<HTMLDivElement, Props>(
  ({ value, onChange, onSend, onNewChat, chatStarted, textareaRef }, ref) => {
    const hasInput = value.trim().length > 0

    const handleSend = () => {
      if (!hasInput) return
      onSend()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      if (isTouchDevice()) {
        textareaRef.current?.blur()
      } else {
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.nativeEvent.isComposing) return
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT) + 'px'
    }

    return (
      <motion.div
        ref={ref}
        layout
        transition={{ duration: 0.5, ease: EASE }}
        className={`input-bar ${chatStarted ? 'input-bar-fixed' : 'input-bar-hero'}`}
      >
        <motion.div layout transition={{ duration: 0.3, ease: EASE }} className="input-row">
          <motion.div
            layout
            transition={{ duration: 0.3, ease: EASE }}
            className="input-field glass"
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Share anything..."
              rows={1}
              className="input-textarea"
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSend}
              className={`send-btn ${hasInput ? 'send-btn-active' : ''}`}
              aria-label="Send"
            >
              <SendIcon active={hasInput} />
            </motion.button>
          </motion.div>

          <AnimatePresence>
            {chatStarted && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: EASE }}
                whileTap={{ scale: 0.92 }}
                onClick={onNewChat}
                className="new-chat-btn glass"
                aria-label="New chat"
              >
                <MessageCirclePlus size={20} stroke="#555" strokeWidth={1.8} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    )
  }
)

InputBar.displayName = 'InputBar'

const SendIcon = ({ active }: { active: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={active ? '#F0EDE4' : '#bbb'}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
)
