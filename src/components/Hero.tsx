import { motion } from 'framer-motion'

const EASE = [0.25, 0.1, 0.25, 1] as const

export const Hero = () => (
  <motion.div
    key="hero"
    className="hero"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0, y: -30 }}
    transition={{ duration: 0.5, ease: EASE }}
  >
    <h1 className="hero-title">Delphi</h1>
    <h3 className="hero-subtitle">Think Deeper, Clearer, Better</h3>
    <p className="hero-credit">
      crafted and used by{' '}
      <a href="https://jimmyzhang.org" target="_blank" rel="noopener noreferrer">
        Jimmy Zhang
      </a>
    </p>
  </motion.div>
)
