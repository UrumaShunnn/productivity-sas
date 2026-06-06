import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Volume2, VolumeX } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { playTaskComplete, playPomodoroDone, playBadgeUnlock } from '../utils/sounds'
import type { BackgroundPreset } from '../types'

const ACCENT_PRESETS = [
  { color: '#ff6b00', label: 'Orange'  },
  { color: '#00d4ff', label: 'Bleu'    },
  { color: '#00ff88', label: 'Vert'    },
  { color: '#a855f7', label: 'Violet'  },
  { color: '#ef4444', label: 'Rouge'   },
]

const BG_PRESETS: { key: BackgroundPreset; label: string; preview: string }[] = [
  { key: 'default',   label: 'Défaut',    preview: '🟠' },
  { key: 'matrix',    label: 'Matrix',    preview: '🟢' },
  { key: 'particles', label: 'Particules',preview: '⚪' },
  { key: 'gradient',  label: 'Gradient',  preview: '🔶' },
  { key: 'minimal',   label: 'Minimal',   preview: '⬛' },
]

interface Props { onClose: () => void }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontFamily: 'monospace',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

export function SettingsModal({ onClose }: Props) {
  const userName            = useAppStore((s) => s.userName)
  const accentColor         = useAppStore((s) => s.accentColor)
  const backgroundPreset    = useAppStore((s) => s.backgroundPreset)
  const soundEnabled        = useAppStore((s) => s.soundEnabled)
  const anthropicApiKey     = useAppStore((s) => s.anthropicApiKey)
  const setUserName         = useAppStore((s) => s.setUserName)
  const setAccentColor      = useAppStore((s) => s.setAccentColor)
  const setBackgroundPreset = useAppStore((s) => s.setBackgroundPreset)
  const setSoundEnabled     = useAppStore((s) => s.setSoundEnabled)
  const setAnthropicApiKey  = useAppStore((s) => s.setAnthropicApiKey)

  const [nameInput, setNameInput]     = useState(userName)
  const [nameSaved, setNameSaved]     = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(anthropicApiKey)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const saveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setUserName(trimmed)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 1600)
  }

  const handleReset = () => {
    const ok = window.confirm(
      'Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.',
    )
    if (ok) { localStorage.clear(); window.location.reload() }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    height: 44,
    padding: '0 14px',
    background: '#111',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }

  const saveApiKey = () => {
    setAnthropicApiKey(apiKeyInput.trim())
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 1600)
  }

  const isNameUnchanged   = nameInput.trim() === userName || !nameInput.trim()
  const isApiKeyUnchanged = apiKeyInput.trim() === anthropicApiKey

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{ opacity: 0,   y: 16, scale: 0.96  }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 480,
          background: '#1a1a1a',
          borderRadius: 20,
          border: '1px solid #2a2a2a',
          padding: 32,
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Paramètres</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Personnalisation ── */}
          <div>
            <SectionTitle>Personnalisation</SectionTitle>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 10, fontWeight: 500 }}>
              Votre prénom
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNameSaved(false) }}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                placeholder="Votre prénom"
                style={inputStyle}
                onFocus={(e)  => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = '#2a2a2a' }}
              />
              <button
                onClick={saveName}
                disabled={isNameUnchanged}
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: nameSaved ? '#22c55e' : 'var(--accent)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isNameUnchanged ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                  opacity: isNameUnchanged ? 0.4 : 1,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {nameSaved ? '✓ Enregistré' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: '#252525' }} />

          {/* ── Apparence ── */}
          <div>
            <SectionTitle>Apparence</SectionTitle>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 14, fontWeight: 500 }}>
              Couleur d&apos;accentuation
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {ACCENT_PRESETS.map(({ color, label }) => {
                const isActive = accentColor === color
                return (
                  <button
                    key={color}
                    title={label}
                    onClick={() => setAccentColor(color)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: color,
                      border: isActive ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: isActive
                        ? `0 0 0 2px ${color}, 0 0 14px ${color}88`
                        : `0 0 0 2px transparent`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.12, ease: 'backOut' }}
                        >
                          <Check size={14} strokeWidth={3} style={{ color: '#fff' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: '#252525' }} />

          {/* ── Fond d'écran ── */}
          <div>
            <SectionTitle>Fond d&apos;écran</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {BG_PRESETS.map(({ key, label, preview }) => {
                const active = backgroundPreset === key
                return (
                  <button
                    key={key}
                    onClick={() => setBackgroundPreset(key)}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '12px 4px',
                      borderRadius: 10, border: `1px solid ${active ? 'var(--accent)' : '#2a2a2a'}`,
                      background: active ? 'var(--accent-dim)' : '#111',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: active ? '0 0 0 1px var(--accent-dim)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{preview}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: active ? 'var(--accent)' : '#666', fontWeight: 700 }}>
                      {label}
                    </span>
                    {active && (
                      <Check size={10} strokeWidth={3} style={{ color: 'var(--accent)', position: 'absolute', display: 'none' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: '#252525' }} />

          {/* ── Sons ── */}
          <div>
            <SectionTitle>Sons</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Master toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {soundEnabled ? <Volume2 size={15} style={{ color: 'var(--accent)' }} /> : <VolumeX size={15} style={{ color: '#555' }} />}
                  <span style={{ fontSize: 13, color: soundEnabled ? '#fff' : '#555', fontWeight: 500 }}>
                    Activer les sons
                  </span>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: soundEnabled ? 'var(--accent)' : '#2a2a2a',
                    border: 'none', cursor: 'pointer',
                    position: 'relative', transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, width: 18, height: 18,
                    borderRadius: '50%', background: '#fff',
                    left: soundEnabled ? 22 : 3,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              {/* Sound test buttons */}
              {soundEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Son de complétion de tâche', fn: playTaskComplete },
                    { label: 'Son Pomodoro',               fn: playPomodoroDone },
                    { label: 'Son de badge débloqué',      fn: playBadgeUnlock  },
                  ].map(({ label, fn }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
                      <button
                        onClick={fn}
                        style={{
                          height: 28, padding: '0 12px', borderRadius: 7,
                          background: 'transparent', border: '1px solid #2a2a2a',
                          color: '#888', fontSize: 11, fontFamily: 'monospace',
                          cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' }}
                      >
                        ▶ Tester
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: '#252525' }} />

          {/* ── Intégration IA ── */}
          <div>
            <SectionTitle>Intégration IA</SectionTitle>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 10, fontWeight: 500 }}>
              Clé API Anthropic
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => { setApiKeyInput(e.target.value); setApiKeySaved(false) }}
                onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
                placeholder="sk-ant-..."
                style={inputStyle}
                onFocus={(e)  => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = '#2a2a2a' }}
              />
              <button
                onClick={saveApiKey}
                disabled={isApiKeyUnchanged}
                style={{
                  height: 44, padding: '0 20px', borderRadius: 10,
                  border: 'none',
                  background: apiKeySaved ? '#22c55e' : 'var(--accent)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: isApiKeyUnchanged ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                  opacity: isApiKeyUnchanged ? 0.4 : 1,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {apiKeySaved ? '✓ Enregistrée' : 'Enregistrer'}
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
              >
                Obtenir une clé sur anthropic.com →
              </a>
            </div>
          </div>

          <div style={{ height: 1, background: '#252525' }} />

          {/* ── Données ── */}
          <div>
            <SectionTitle>Données</SectionTitle>
            <button
              onClick={handleReset}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.35)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background     = 'rgba(239,68,68,0.18)'
                e.currentTarget.style.borderColor    = 'rgba(239,68,68,0.65)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background     = 'rgba(239,68,68,0.08)'
                e.currentTarget.style.borderColor    = 'rgba(239,68,68,0.35)'
              }}
            >
              Réinitialiser toutes les données
            </button>
          </div>

        </div>
      </motion.div>
    </motion.div>
  )
}
