import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QUOTES } from '../../data/quotes'

export function MotivationalBanner() {
  const [idx, setIdx] = useState(() => {
    const start = new Date(new Date().getFullYear(), 0, 1)
    return Math.floor((Date.now() - start.getTime()) / 86_400_000) % QUOTES.length
  })

  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % QUOTES.length),
      10_000,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative flex-1 min-w-0 h-5 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 text-sm italic truncate leading-5"
          style={{ color: 'var(--text-muted)' }}
        >
          <span style={{ color: 'var(--text-faint)' }} className="font-mono not-italic mr-1">
            &ldquo;
          </span>
          {QUOTES[idx]}
          <span style={{ color: 'var(--text-faint)' }} className="font-mono not-italic ml-1">
            &rdquo;
          </span>
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
