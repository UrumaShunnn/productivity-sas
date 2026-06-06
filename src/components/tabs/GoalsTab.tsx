import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Flame, Trash2, X, Calendar, Target } from 'lucide-react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { useGoals } from '../../hooks/useGoals'
import type { Goal, GoalCategory, GoalType } from '../../types'

// ─── Config ───────────────────────────────────────────────────

const CATEGORY_CFG = {
  Business: { color: '#38bdf8', bg: 'rgba(56,189,248,0.14)'   },
  Finance:  { color: '#22c55e', bg: 'rgba(34,197,94,0.14)'    },
  Personal: { color: '#c084fc', bg: 'rgba(192,132,252,0.14)'  },
  Health:   { color: '#ef4444', bg: 'rgba(239,68,68,0.14)'    },
} satisfies Record<GoalCategory, { color: string; bg: string }>

const CATEGORIES = Object.keys(CATEGORY_CFG) as GoalCategory[]

// ─── Injected CSS ─────────────────────────────────────────────

const INJECTED_CSS = `
.goal-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 9999px;
  outline: none;
  cursor: pointer;
  background: #2a2a2a;
}
.goal-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-50), 0 0 20px var(--accent-20);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.goal-slider::-webkit-slider-thumb:hover {
  transform: scale(1.25);
  box-shadow: 0 0 16px var(--accent-66), 0 0 32px var(--accent-33);
}
.goal-slider::-moz-range-thumb {
  width: 18px; height: 18px;
  border: none; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-50);
  cursor: pointer;
}
@keyframes urgent-pulse {
  0%, 100% { border-color: #f97316; box-shadow: 0 0 8px rgba(249,115,22,0.25); }
  50%       { border-color: #ef4444; box-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.12); }
}
.goal-urgent { animation: urgent-pulse 1.6s ease-in-out infinite; }
input[type="date"].goal-date { color-scheme: dark; }
select.goal-select { color-scheme: dark; }
`

// ─── SVG circular ring (64px) ────────────────────────────────

const RING_SIZE = 64
const RING_CX   = RING_SIZE / 2
const RING_R    = 26
const CIRC      = 2 * Math.PI * RING_R

function CircularRing({ progress }: { progress: number }) {
  const clamped = Math.min(100, Math.max(0, progress))
  const offset  = CIRC * (1 - clamped / 100)
  return (
    <svg
      width={RING_SIZE} height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="shrink-0" aria-hidden
    >
      <circle
        cx={RING_CX} cy={RING_CX} r={RING_R}
        fill="none" stroke="#2a2a2a" strokeWidth={5}
      />
      <motion.circle
        cx={RING_CX} cy={RING_CX} r={RING_R}
        fill="none" stroke="var(--accent)" strokeWidth={5} strokeLinecap="round"
        strokeDasharray={CIRC}
        initial={{ strokeDashoffset: CIRC }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        transform={`rotate(-90 ${RING_CX} ${RING_CX})`}
        style={{ filter: 'drop-shadow(0 0 4px var(--accent-66))' }}
      />
    </svg>
  )
}

// ─── Goal card ────────────────────────────────────────────────

function GoalCard({ goal }: { goal: Goal }) {
  const updateGoalProgress = useAppStore((s) => s.updateGoalProgress)
  const deleteGoal         = useAppStore((s) => s.deleteGoal)
  const [hovered, setHovered] = useState(false)

  const { color, bg } = CATEGORY_CFG[goal.category]

  let daysLeft = 0, dateLabel = goal.deadline, isUrgent = false, isExpired = false
  try {
    const d  = parseISO(goal.deadline)
    daysLeft  = differenceInCalendarDays(d, new Date())
    dateLabel = format(d, 'd MMM yyyy', { locale: fr })
    isUrgent  = daysLeft >= 0 && daysLeft < 3
    isExpired = daysLeft < 0
  } catch { /* malformed date */ }

  const deadlineColor = isExpired ? '#ef4444' : isUrgent ? '#f97316' : '#888'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1,  y: 0  }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={isUrgent ? 'goal-urgent' : ''}
      style={{
        position: 'relative',
        background: '#1a1a1a',
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${hovered ? 'var(--accent)' : isUrgent ? '#f97316' : isExpired ? 'rgba(239,68,68,0.35)' : '#222'}`,
        boxShadow: hovered ? '0 0 20px rgba(255,107,0,0.12)' : 'none',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1,  scale: 1    }}
            exit={{ opacity: 0,     scale: 0.75 }}
            transition={{ duration: 0.12 }}
            onClick={() => deleteGoal(goal.id)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none',
              color: '#555', cursor: 'pointer',
              padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555' }}
          >
            <Trash2 size={14} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Top row: ring + progress% | title area */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        {/* Ring with % overlay */}
        <div style={{ position: 'relative', flexShrink: 0, width: RING_SIZE, height: RING_SIZE }}>
          <CircularRing progress={goal.progress} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', lineHeight: 1 }}>
              {goal.progress}%
            </span>
          </div>
        </div>

        {/* Title + badges */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: hovered ? 24 : 0 }}>
          <h3 style={{
            fontSize: 18, fontWeight: 600, color: '#fff',
            lineHeight: 1.3, marginBottom: 8,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {goal.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '3px 10px',
              borderRadius: 20, color, background: bg,
            }}>
              {goal.category}
            </span>
            {goal.streak > 0 && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, padding: '3px 10px',
                borderRadius: 20, color: '#f59e0b', background: 'rgba(245,158,11,0.14)',
              }}>
                <Flame size={11} />
                {goal.streak}j
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Deadline */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: deadlineColor, marginBottom: 14,
      }}>
        <Calendar size={13} />
        {dateLabel}
        {!isExpired && daysLeft >= 0 && (
          <span style={{ color: isUrgent ? '#f97316' : '#555', marginLeft: 2 }}>
            ({daysLeft}j restants)
          </span>
        )}
        {isExpired && <span style={{ color: '#ef4444' }}> — expiré</span>}
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: 8, background: '#2a2a2a',
        borderRadius: 9999, overflow: 'hidden', marginBottom: 12,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${goal.progress}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          style={{
            height: '100%', borderRadius: 9999,
            background: 'linear-gradient(90deg, var(--accent), #ff9500)',
            boxShadow: '0 0 8px rgba(255,107,0,0.4)',
          }}
        />
      </div>

      {/* Slider */}
      <input
        type="range" min={0} max={100} value={goal.progress}
        onChange={(e) => updateGoalProgress(goal.id, Number(e.target.value))}
        className="goal-slider"
        style={{ marginTop: 4 }}
      />
    </motion.div>
  )
}

// ─── Add goal modal ───────────────────────────────────────────

function AddGoalModal({ goalType, onClose }: { goalType: GoalType; onClose: () => void }) {
  const addGoal = useAppStore((s) => s.addGoal)
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState<GoalCategory>('Personal')
  const [deadline, setDeadline] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState('')

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose],
  )
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const submit = () => {
    if (!title.trim()) { setError('Le titre est requis.');     return }
    if (!deadline)     { setError("L'échéance est requise."); return }
    addGoal(title.trim(), goalType, category, deadline, progress)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 16px',
    background: '#111', border: '1px solid #2a2a2a',
    borderRadius: 10, color: '#fff', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1,  y: 0,  scale: 1    }}
        exit={{ opacity: 0,    y: 16, scale: 0.96  }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 480,
          background: '#1a1a1a', borderRadius: 20,
          border: '1px solid #2a2a2a', padding: 32,
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
            {goalType === 'weekly' ? 'Objectif Court Terme' : 'Objectif Long Terme'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 500 }}>
              Titre
            </label>
            <input
              type="text" value={title} autoFocus
              onChange={(e) => { setTitle(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Décrivez votre objectif…"
              style={{ ...inputStyle, caretColor: 'var(--accent)' }}
              onFocus={(e)  => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e)   => { e.currentTarget.style.borderColor = '#2a2a2a' }}
            />
          </div>

          {/* Category + Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 500 }}>
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="goal-select"
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = '#2a2a2a' }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 500 }}>
                Échéance
              </label>
              <input
                type="date" value={deadline}
                onChange={(e) => { setDeadline(e.target.value); setError('') }}
                className="goal-date"
                style={{ ...inputStyle, color: deadline ? '#fff' : '#555', cursor: 'pointer' }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = '#2a2a2a' }}
              />
            </div>
          </div>

          {/* Progression initiale */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
                Progression initiale
              </label>
              <motion.span
                key={progress}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}
              >
                {progress}%
              </motion.span>
            </div>
            <input
              type="range" min={0} max={100} value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="goal-slider"
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ fontSize: 13, color: '#ef4444', margin: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={submit}
            style={{
              width: '100%', height: 52, borderRadius: 12,
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
              marginTop: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.boxShadow = '0 0 24px rgba(255,107,0,0.4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.boxShadow = 'none' }}
          >
            Ajouter l&apos;objectif
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Goals section column ─────────────────────────────────────

function GoalsSection({ title, goals, goalType }: { title: string; goals: Goal[]; goalType: GoalType }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
            {title}
          </h2>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 10px',
            borderRadius: 20, background: 'var(--accent)', color: '#fff',
          }}>
            {goals.length}
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 600, padding: '8px 16px',
            borderRadius: 8, border: '1px solid var(--accent)',
            color: 'var(--accent)', background: 'transparent',
            cursor: 'pointer', transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--accent)'
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Ajouter
        </button>
      </div>

      {/* Cards or empty state */}
      {goals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 200, gap: 16,
            border: '2px dashed #2a2a2a', borderRadius: 16,
          }}
        >
          <Target size={32} color="#333" strokeWidth={1.5} />
          <span style={{ fontSize: 16, color: '#555' }}>Aucun objectif</span>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 48, padding: '0 24px',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Ajouter un objectif
          </button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AnimatePresence initial={false}>
            {goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && <AddGoalModal goalType={goalType} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ─── GoalsTab ─────────────────────────────────────────────────

export function GoalsTab() {
  const { goals } = useGoals()
  const weekly    = goals.filter((g) => g.type === 'weekly')
  const longterm  = goals.filter((g) => g.type === 'longterm')
  const activeCount = goals.filter((g) => g.progress < 100).length

  return (
    <>
      <style>{INJECTED_CSS}</style>
      <div style={{ padding: '32px 40px 48px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.15 }}>
            Objectifs
          </h1>
          <p style={{ fontSize: 16, color: '#888', margin: '6px 0 0' }}>
            {activeCount} objectif{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Orange divider */}
        <div style={{
          width: '100%', height: 2,
          background: 'linear-gradient(90deg, var(--accent), rgba(255,107,0,0))',
          borderRadius: 1, marginBottom: 32,
        }} />

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          <GoalsSection title="Objectifs Court Terme" goals={weekly}   goalType="weekly"   />
          <GoalsSection title="Objectifs Long Terme" goals={longterm} goalType="longterm" />
        </div>
      </div>
    </>
  )
}
