import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

interface Props {
  onDone: () => void
}

export function WelcomeOnboarding({ onDone }: Props) {
  const setUserName      = useAppStore((s) => s.setUserName)
  const setOnboardingDone = useAppStore((s) => s.setOnboardingDone)

  const [phase, setPhase]   = useState<'logo' | 'input'>('logo')
  const [name, setName]     = useState('')
  const [leaving, setLeaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('input')
      setTimeout(() => inputRef.current?.focus(), 400)
    }, 1600)
    return () => clearTimeout(t)
  }, [])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setUserName(trimmed)
    setOnboardingDone()
    setLeaving(true)
    setTimeout(onDone, 700)
  }

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: '#080808',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      {/* Glow orb behind logo */}
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        background: 'radial-gradient(ellipse, rgba(255,107,0,0.14) 0%, transparent 65%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', textAlign: 'center' }}
      >
        <span
          style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 88,
            fontWeight: 900,
            letterSpacing: '-4px',
            color: '#ff6b00',
            textShadow: '0 0 40px rgba(255,107,0,0.6), 0 0 80px rgba(255,107,0,0.25)',
            lineHeight: 1,
            display: 'block',
          }}
        >
          ZENITH
        </span>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 13,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#555',
            marginTop: 12,
          }}
        >
          Votre espace de productivité personnel
        </motion.p>
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase === 'input' ? 1 : 0, opacity: phase === 'input' ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 280, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,107,0,0.5), transparent)',
          margin: '40px 0 36px',
          transformOrigin: 'center',
        }}
      />

      {/* Input block */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase === 'input' ? 1 : 0, y: phase === 'input' ? 0 : 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 320 }}
      >
        <p style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 14,
          color: '#aaa',
          margin: 0,
          textAlign: 'center',
        }}>
          Quel est votre prénom ?
        </p>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Votre prénom…"
          style={{
            width: '100%', height: 52,
            background: '#111',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            color: '#fff',
            fontSize: 18,
            padding: '0 20px',
            outline: 'none',
            textAlign: 'center',
            caretColor: '#ff6b00',
            fontFamily: 'Syne, sans-serif',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#ff6b00' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = '#2a2a2a' }}
        />

        <button
          onClick={submit}
          disabled={!name.trim()}
          style={{
            width: '100%', height: 52,
            background: name.trim() ? '#ff6b00' : '#1e1e1e',
            border: `1px solid ${name.trim() ? '#ff6b00' : '#2a2a2a'}`,
            borderRadius: 12,
            color: name.trim() ? '#fff' : '#444',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            letterSpacing: '0.04em',
          }}
          onMouseEnter={(e) => { if (name.trim()) e.currentTarget.style.background = '#e55f00' }}
          onMouseLeave={(e) => { if (name.trim()) e.currentTarget.style.background = '#ff6b00' }}
        >
          Commencer →
        </button>
      </motion.div>
    </motion.div>
  )
}
