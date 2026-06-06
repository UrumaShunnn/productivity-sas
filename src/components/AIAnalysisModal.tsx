import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

// ─── Types ────────────────────────────────────────────────────

export interface AIData {
  userName: string
  completed: number
  total: number
  rate: number
  tasks: Array<{ title: string; completed: boolean }>
  goals: Array<{ title: string; progress: number; category: string }>
  todaySession: boolean
  dailyScore: number
  currentStreak: number
}

interface Props {
  data: AIData
  onClose: () => void
}

type Status = 'loading' | 'success' | 'error' | 'no-key'

interface Section { header: string; body: string }

// ─── Helpers ──────────────────────────────────────────────────

function buildPrompt(d: AIData): string {
  const taskList = d.tasks.length > 0
    ? d.tasks.map((t) => `  - ${t.title}${t.completed ? ' ✓' : ''}`).join('\n')
    : '  (aucune tâche)'

  const activeGoals = d.goals.filter((g) => g.progress < 100)
  const goalList = activeGoals.length > 0
    ? activeGoals.map((g) => `  - ${g.title} : ${g.progress}% (${g.category})`).join('\n')
    : '  (aucun objectif actif)'

  return `Tu es un coach de productivité personnel. Voici les données de la journée de ${d.userName} :
- Tâches : ${d.completed}/${d.total} complétées, dont :
${taskList}
- Taux de réussite : ${d.rate}%
- Objectifs actifs :
${goalList}
- Entraînement : ${d.todaySession ? "Séance effectuée aujourd'hui" : "Aucune séance aujourd'hui"}
- Score du jour : ${d.dailyScore}/100
- Streak actuel : ${d.currentStreak} jour${d.currentStreak !== 1 ? 's' : ''}

Donne une analyse bienveillante et motivante en français en 4 parties :
1. 🎯 Bilan de la journée (2-3 phrases)
2. 💪 Points forts (ce qui s'est bien passé)
3. 🚀 Axes d'amélioration (concret et actionnable)
4. ⚡ Objectif prioritaire pour demain

Sois direct, motivant, comme un vrai coach. Max 200 mots.`
}

function parseSections(text: string): Section[] {
  const EMOJIS = ['🎯', '💪', '🚀', '⚡']
  const lines = text.split('\n')
  const sections: Section[] = []
  let current: Section | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (EMOJIS.some((e) => line.includes(e))) {
      if (current) sections.push(current)
      current = { header: line.replace(/^\d+\.\s*/, ''), body: '' }
    } else if (current) {
      current.body += (current.body ? ' ' : '') + line
    }
  }
  if (current) sections.push(current)
  return sections
}

// ─── Spinner CSS ──────────────────────────────────────────────

const SPIN_CSS = `@keyframes ai-spin { to { transform: rotate(360deg); } }`

// ─── Component ────────────────────────────────────────────────

export function AIAnalysisModal({ data, onClose }: Props) {
  const anthropicApiKey = useAppStore((s) => s.anthropicApiKey)
  const [status, setStatus]     = useState<Status>('loading')
  const [sections, setSections] = useState<Section[]>([])
  const [rawText, setRawText]   = useState('')
  const [copied, setCopied]     = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Capture initial values so the effect truly runs only once
  const dataRef = useRef(data)
  const keyRef  = useRef(anthropicApiKey)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    const apiKey = keyRef.current
    if (!apiKey) { setStatus('no-key'); return }

    const prompt = buildPrompt(dataRef.current)

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body: { error?: { message?: string } }) => {
            throw new Error(body?.error?.message ?? `Erreur HTTP ${res.status}`)
          })
        }
        return res.json()
      })
      .then((body: { content?: Array<{ text?: string }> }) => {
        const text = body.content?.[0]?.text ?? ''
        setRawText(text)
        setSections(parseSections(text))
        setStatus('success')
      })
      .catch((err: Error) => {
        setErrorMsg(err.message)
        setStatus('error')
      })
  }, []) // intentionally runs once on mount

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <style>{SPIN_CSS}</style>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{ opacity: 0,   y: 16, scale: 0.96  }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 600,
          background: '#1a1a1a',
          borderRadius: 20,
          border: '1px solid #2a2a2a',
          padding: 32,
          boxSizing: 'border-box',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>
            ✨ Analyse de votre journée
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading */}
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '48px 0' }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '3px solid rgba(255,107,0,0.2)',
                borderTopColor: 'var(--accent)',
                animation: 'ai-spin 0.85s linear infinite',
              }} />
              <p style={{ color: '#888', fontSize: 14, margin: 0 }}>L&apos;IA analyse vos données...</p>
            </motion.div>
          )}

          {/* No API key */}
          {status === 'no-key' && (
            <motion.div
              key="no-key"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 0', textAlign: 'center' }}
            >
              <div style={{ fontSize: 44 }}>⚙️</div>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Clé API manquante</p>
              <p style={{ color: '#888', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Configurez votre clé API dans les paramètres ⚙️
              </p>
            </motion.div>
          )}

          {/* Error */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 0', textAlign: 'center' }}
            >
              <div style={{ fontSize: 44 }}>⚠️</div>
              <p style={{ color: '#ef4444', fontSize: 15, fontWeight: 700, margin: 0 }}>Erreur lors de l&apos;analyse</p>
              <p style={{ color: '#888', fontSize: 13, margin: 0, maxWidth: 380, lineHeight: 1.6 }}>
                {errorMsg || 'Vérifiez votre clé API et votre connexion internet.'}
              </p>
            </motion.div>
          )}

          {/* Success */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                {sections.map((sec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      border: '1px solid var(--accent-20)',
                      background: 'var(--accent-08)',
                    }}
                  >
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--accent)',
                      marginBottom: 8, lineHeight: 1.4,
                    }}>
                      {sec.header}
                    </div>
                    <p style={{ fontSize: 14, color: '#ccc', margin: 0, lineHeight: 1.7 }}>
                      {sec.body}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1, height: 44, borderRadius: 10,
                    border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : '#2a2a2a'}`,
                    background: copied ? 'rgba(34,197,94,0.1)' : 'transparent',
                    color: copied ? '#22c55e' : '#888',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' } }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copié !' : "Copier l'analyse"}
                </button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, height: 44, borderRadius: 10,
                    border: 'none', background: 'var(--accent)',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
