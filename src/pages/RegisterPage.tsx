import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'

interface Props {
  onNavigate: (page: 'login') => void
}

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)           score++
  if (pw.length >= 12)          score++
  if (/[A-Z]/.test(pw))         score++
  if (/[0-9]/.test(pw))         score++
  if (/[^A-Za-z0-9]/.test(pw))  score++
  if (score <= 1) return { score, label: 'Faible',    color: '#ef4444' }
  if (score <= 2) return { score, label: 'Moyen',     color: '#f59e0b' }
  if (score <= 3) return { score, label: 'Bien',      color: '#3b82f6' }
  return              { score, label: 'Fort',        color: '#22c55e' }
}

export function RegisterPage({ onNavigate }: Props) {
  const register = useAuthStore((s) => s.register)

  const [username,        setUsername]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState<string | null>(null)
  const [loading,         setLoading]         = useState(false)

  const strength = password ? getStrength(password) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs'); return
    }
    if (username.trim().length < 2) {
      setError('Le nom d\'utilisateur doit contenir au moins 2 caractères'); return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères'); return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas'); return
    }
    setError(null)
    setLoading(true)
    try {
      await register({ username: username.trim(), email: email.trim().toLowerCase(), password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(26,26,26,0.92)',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          padding: '40px 36px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-12px -20px',
                background: 'radial-gradient(ellipse at center, var(--accent-20) 0%, transparent 70%)',
                borderRadius: 16,
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position: 'relative',
                fontFamily: 'var(--font-mono)',
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: '-2px',
                color: 'var(--accent)',
                textShadow: 'var(--glow-green)',
                display: 'block',
              }}
            >
              ZENITH
            </span>
          </div>
          <p
            style={{
              marginTop: 10,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.3em',
              color: '#555',
              textTransform: 'uppercase',
            }}
          >
            créer un compte
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { void handleSubmit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field
            label="Nom d'utilisateur"
            type="text"
            value={username}
            onChange={setUsername}
            placeholder="Dylan"
            autoComplete="username"
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />

          {/* Password with strength indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: '#888',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 caractères"
              autoComplete="new-password"
              style={{
                padding: '12px 14px',
                background: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                width: '100%',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)'
                e.target.style.boxShadow = '0 0 0 3px var(--accent-08)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#2a2a2a'
                e.target.style.boxShadow = 'none'
              }}
            />
            {/* Strength bar */}
            {strength && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: '#222',
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(strength.score / 5) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '100%', background: strength.color, borderRadius: 99 }}
                  />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: strength.color, minWidth: 36 }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <Field
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                color: '#ef4444',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.02 }}
            whileTap={loading  ? {} : { scale: 0.98 }}
            style={{
              marginTop: 4,
              padding: '14px 0',
              background: loading ? '#333' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : 'var(--glow-green)',
              transition: 'background 0.15s ease, box-shadow 0.15s ease',
              letterSpacing: '0.02em',
            }}
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </motion.button>
        </form>

        {/* Login link */}
        <p
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            color: '#555',
          }}
        >
          Déjà un compte ?{' '}
          <button
            onClick={() => onNavigate('login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              textDecorationColor: 'var(--accent-50)',
              padding: 0,
            }}
          >
            Se connecter
          </button>
        </p>
      </motion.div>
    </div>
  )
}

// ─── Shared input field ───────────────────────────────────────

interface FieldProps {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}

function Field({ label, type, value, onChange, placeholder, autoComplete }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: '#888',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          padding: '12px 14px',
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          color: '#fff',
          fontSize: 14,
          fontFamily: 'var(--font-mono)',
          outline: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          width: '100%',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)'
          e.target.style.boxShadow = '0 0 0 3px var(--accent-08)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#2a2a2a'
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
