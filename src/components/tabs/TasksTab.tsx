import { useState, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, GripVertical, Check, Plus, ChevronDown, ChevronRight, Archive } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { useTasks } from '../../hooks/useTasks'
import { playTaskComplete } from '../../utils/sounds'
import type { Priority, Task } from '../../types'

// ─── Priority config ──────────────────────────────────────────

const PRIORITY_CFG = {
  HIGH: { label: 'HIGH', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  MED:  { label: 'MED',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  LOW:  { label: 'LOW',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
} satisfies Record<Priority, { label: string; color: string; bg: string }>

const PRIORITIES = Object.keys(PRIORITY_CFG) as Priority[]

// ─── Confetti ─────────────────────────────────────────────────

const CONFETTI_COLORS = ['var(--accent)', '#ffaa00', '#f59e0b', '#ef4444', '#c084fc', '#ffffff']

const CONFETTI_CSS = `
@keyframes confetti-fall {
  0%   { opacity: 1; transform: translateY(0px) rotate(0deg); }
  85%  { opacity: 0.9; }
  100% { opacity: 0;   transform: translateY(100vh) rotate(var(--spin)); }
}
@keyframes confetti-sway {
  0%, 100% { margin-left: 0; }
  25%       { margin-left: var(--sway); }
  75%       { margin-left: calc(var(--sway) * -1); }
}
`

function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 52 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${(i * 1.96) % 100}%`,
        fallDelay: `${(i * 0.055) % 2.8}s`,
        fallDur: `${2.4 + (i % 8) * 0.22}s`,
        swayDur: `${1.2 + (i % 5) * 0.3}s`,
        w: `${5 + (i % 5) * 2}px`,
        h: i % 3 === 0 ? `${5 + (i % 5) * 2}px` : `${8 + (i % 4) * 3}px`,
        radius: i % 4 === 0 ? '50%' : '2px',
        spin: `${(i % 2 === 0 ? 1 : -1) * (360 + (i % 4) * 180)}deg`,
        sway: `${10 + (i % 20)}px`,
      })),
    [],
  )

  return (
    <>
      <style>{CONFETTI_CSS}</style>
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9998 }}>
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.left,
              top: '-16px',
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              borderRadius: p.radius,
              '--spin': p.spin,
              '--sway': p.sway,
              animation: [
                `confetti-fall ${p.fallDur} ${p.fallDelay} ease-in forwards`,
                `confetti-sway ${p.swayDur} ${p.fallDelay} ease-in-out infinite`,
              ].join(', '),
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  )
}

// ─── Priority badge ───────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CFG[priority]
  return (
    <span
      className="shrink-0 font-mono font-bold rounded"
      style={{
        fontSize: 11,
        color: cfg.color,
        background: cfg.bg,
        padding: '4px 8px',
      }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Task card ────────────────────────────────────────────────

interface CardProps {
  task: Task
  index: number
  isDragOver: boolean
  isDragging: boolean
  onDragStart: (i: number) => void
  onDragOver: (e: React.DragEvent, i: number) => void
  onDrop: (e: React.DragEvent, i: number) => void
  onDragEnd: () => void
}

function TaskCard({ task, index, isDragOver, isDragging, onDragStart, onDragOver, onDrop, onDragEnd }: CardProps) {
  const toggleTask  = useAppStore((s) => s.toggleTask)
  const deleteTask  = useAppStore((s) => s.deleteTask)
  const accentColor = useAppStore((s) => s.accentColor)
  const [hovered, setHovered]   = useState(false)
  const [pulsing, setPulsing]   = useState(false)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!task.completed) {
      playTaskComplete()
      setPulsing(true)
      setTimeout(() => setPulsing(false), 400)
    }
    toggleTask(task.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.4 : task.completed ? 0.5 : 1, y: 0, scale: isDragging ? 0.98 : 1 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 select-none"
      style={{
        minHeight: 64,
        padding: '16px 20px',
        background:  isDragOver ? '#222' : '#1a1a1a',
        borderRadius: 12,
        border: `1px solid ${isDragOver ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: isDragOver ? 'var(--glow-green)' : 'none',
        cursor: 'grab',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
      }}
    >
      <GripVertical size={14} className="shrink-0" style={{ color: 'var(--text-faint)', opacity: hovered ? 1 : 0.4, transition: 'opacity 0.15s' }} />

      <motion.button
        onClick={handleToggle}
        className="shrink-0 rounded flex items-center justify-center cursor-pointer border-2"
        style={{
          width: 22,
          height: 22,
          borderColor: task.completed ? 'var(--accent)' : 'var(--border-2)',
          background:  task.completed ? 'var(--accent-dim)' : 'transparent',
        }}
        animate={
          pulsing
            ? { scale: [1, 1.18, 1], boxShadow: ['0 0 0px #0000', `0 0 18px ${accentColor}cc`, `0 0 6px ${accentColor}33`] }
            : task.completed
              ? { boxShadow: ['0 0 0px #0000', `0 0 16px ${accentColor}99`, `0 0 6px ${accentColor}33`] }
              : { boxShadow: '0 0 0px #0000' }
        }
        transition={{ duration: 0.4 }}
        whileTap={{ scale: 0.8 }}
      >
        <AnimatePresence>
          {task.completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15, ease: 'backOut' }}
            >
              <Check size={12} strokeWidth={3} style={{ color: 'var(--accent)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <div className="flex-1 relative min-w-0">
        <motion.span
          className="block truncate"
          animate={{ opacity: task.completed ? 0.5 : 1 }}
          transition={{ duration: 0.25 }}
          style={{ fontSize: 16, color: '#fff' }}
        >
          {task.title}
        </motion.span>
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ top: '50%', background: 'var(--text-muted)', originX: 0 }}
          initial={false}
          animate={{ scaleX: task.completed ? 1 : 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <PriorityBadge priority={task.priority} />

      {(task.pomodoros ?? 0) > 0 && (
        <span
          className="shrink-0"
          title={`${task.pomodoros} pomodoro${task.pomodoros! > 1 ? 's' : ''}`}
          style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
        >
          {task.pomodoros! <= 4 ? '🍅'.repeat(task.pomodoros!) : `🍅 ×${task.pomodoros}`}
        </span>
      )}

      <motion.button
        onClick={() => deleteTask(task.id)}
        className="shrink-0 p-1.5 rounded cursor-pointer transition-colors duration-150"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        style={{ color: 'var(--text-faint)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)' }}
      >
        <Trash2 size={14} />
      </motion.button>
    </motion.div>
  )
}

// ─── Add task form ────────────────────────────────────────────

function AddTaskForm() {
  const addTask = useAppStore((s) => s.addTask)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('MED')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const t = title.trim()
    if (!t) return
    addTask(t, priority)
    setTitle('')
    inputRef.current?.focus()
  }

  return (
    <div className="mb-5 flex flex-col gap-3">
      {/* Input row */}
      <div
        className="flex items-center rounded-xl border overflow-hidden"
        style={{
          height: 52,
          background: '#1a1a1a',
          borderColor: focused ? 'var(--accent)' : '#2a2a2a',
          boxShadow: focused ? '0 0 0 1px rgba(255,107,0,0.2), 0 0 16px rgba(255,107,0,0.1)' : 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Nouvelle tâche…"
          className="flex-1 bg-transparent outline-none"
          style={{ fontSize: 18, color: '#fff', caretColor: 'var(--accent)', padding: '0 20px' }}
          autoFocus
        />
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="shrink-0 flex items-center gap-2 font-mono font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            height: 52,
            padding: '0 24px',
            fontSize: 16,
            background: 'var(--accent)',
            color: '#fff',
            borderLeft: '1px solid rgba(255,107,0,0.3)',
            borderRadius: '0 12px 12px 0',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { if (title.trim()) e.currentTarget.style.background = '#e55f00' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Ajouter
        </button>
      </div>

      {/* Priority selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)', marginRight: 4 }}>Priorité :</span>
        {PRIORITIES.map((p) => {
          const cfg = PRIORITY_CFG[p]
          const active = priority === p
          return (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className="font-mono font-bold rounded-full border transition-all duration-150 cursor-pointer"
              style={{
                height: 36,
                padding: '0 16px',
                fontSize: 12,
                color:       active ? cfg.color : 'var(--text-faint)',
                borderColor: active ? cfg.color : 'var(--border)',
                background:  active ? cfg.bg : 'transparent',
                boxShadow:   active ? `0 0 8px ${cfg.color}40` : 'none',
              }}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {completed} sur {total} complétées
        </span>
        <motion.span
          key={pct}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-mono font-bold tabular-nums"
          style={{ color: 'var(--accent)' }}
        >
          {pct}%
        </motion.span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: 'var(--surface-3)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))', boxShadow: '0 0 8px var(--accent), 0 0 20px var(--accent-dim)' }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

// ─── Congrats banner ──────────────────────────────────────────

function CongratsBanner() {
  return (
    <>
      <Confetti />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full rounded-2xl border mt-4 py-12 px-8 text-center"
        style={{
          background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
          borderColor: 'var(--accent)',
          boxShadow: 'var(--glow-green-lg)',
        }}
      >
        <div className="text-5xl font-bold font-mono tracking-tighter mb-2 glow-text-green" style={{ color: 'var(--accent)' }}>
          ALL DONE
        </div>
        <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Toutes les tâches complétées. Rien ne peut t&apos;arrêter.
        </div>
      </motion.div>
    </>
  )
}

// ─── Right stats panel ────────────────────────────────────────

function TaskStatsPanel({ tasks }: { tasks: Task[] }) {
  const completed = tasks.filter((t) => t.completed).length
  const pending   = tasks.filter((t) => !t.completed).length
  const total     = tasks.length

  const byPriority = PRIORITIES.map((p) => ({
    priority: p,
    total:    tasks.filter((t) => t.priority === p).length,
    done:     tasks.filter((t) => t.priority === p && t.completed).length,
    cfg:      PRIORITY_CFG[p],
  }))

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid #222',
    borderRadius: 16,
    padding: 28,
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overview */}
      <div style={cardStyle}>
        <div className="card-title">Aperçu</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',      value: total,     color: '#fff' },
            { label: 'Complétées', value: completed, color: '#22c55e' },
            { label: 'En attente', value: pending,   color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <motion.div
                key={value}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-bold tabular-nums font-mono"
                style={{ fontSize: 40, color, lineHeight: 1 }}
              >
                {value}
              </motion.div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority breakdown */}
      <div style={cardStyle}>
        <div className="card-title">Par priorité</div>
        <div className="flex flex-col gap-4">
          {byPriority.map(({ priority, total: t, done, cfg }) => (
            <div
              key={priority}
              className="flex flex-col justify-center"
              style={{ minHeight: 44 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="font-mono font-bold rounded"
                  style={{ fontSize: 14, color: cfg.color, background: cfg.bg, padding: '3px 8px' }}
                >
                  {cfg.label}
                </span>
                <span className="font-mono" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  {done}/{t}
                </span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'var(--surface-3)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}66` }}
                  initial={{ width: 0 }}
                  animate={{ width: t === 0 ? '0%' : `${Math.round((done / t) * 100)}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {total === 0 && (
        <div
          style={{ ...cardStyle, borderStyle: 'dashed', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}
          className="font-mono py-8"
        >
          Aucune tâche — ajoutez-en une à gauche
        </div>
      )}
    </div>
  )
}

// ─── Pomodoro widget ──────────────────────────────────────────

const POMO_PRESETS = {
  '25/5':  { work: 25 * 60, break: 5 * 60 },
  '50/10': { work: 50 * 60, break: 10 * 60 },
  '90/20': { work: 90 * 60, break: 20 * 60 },
} as const
type PomoPreset = keyof typeof POMO_PRESETS

const RING_R = 46
const RING_C = 2 * Math.PI * RING_R

function playChime() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    ;([880, 1108, 1320] as const).forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.1
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18 - i * 0.05, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
      osc.start(t)
      osc.stop(t + 1.4)
    })
  } catch { /* AudioContext unavailable */ }
}

function sendNotif(body: string) {
  if (!('Notification' in window)) return
  const fire = () => new Notification('Pomodoro', { body })
  if (Notification.permission === 'granted') {
    fire()
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((p) => { if (p === 'granted') fire() })
  }
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function PomodoroWidget({ tasks }: { tasks: Task[] }) {
  const incrementTaskPomodoros  = useAppStore((s) => s.incrementTaskPomodoros)
  const incrementTodayPomodoros = useAppStore((s) => s.incrementTodayPomodoros)
  const todayPomodoros          = useAppStore((s) => s.todayPomodoros)

  const [preset, setPreset]         = useState<PomoPreset>('25/5')
  const [mode, setMode]             = useState<'work' | 'break'>('work')
  const [timeLeft, setTimeLeft]     = useState(POMO_PRESETS['25/5'].work)
  const [isRunning, setIsRunning]   = useState(false)
  const [linkedTask, setLinkedTask] = useState('')

  const totalTime    = POMO_PRESETS[preset][mode]
  const ringProgress = timeLeft / totalTime
  const ringDash     = RING_C * ringProgress
  const ringGap      = RING_C - ringDash
  const completedRef = useRef(false)
  const accent       = mode === 'work' ? 'var(--accent)' : '#22c55e'

  const activeTasks = tasks.filter((t) => !t.completed)

  // Clear linked task if it gets completed/deleted
  useEffect(() => {
    if (linkedTask && !activeTasks.find((t) => t.id === linkedTask)) setLinkedTask('')
  }, [activeTasks, linkedTask])

  // Tick every second
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { completedRef.current = true; return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // Handle session completion
  useEffect(() => {
    if (timeLeft !== 0 || !completedRef.current) return
    completedRef.current = false
    setIsRunning(false)
    playChime()
    if (mode === 'work') {
      if (linkedTask) incrementTaskPomodoros(linkedTask)
      incrementTodayPomodoros()
      sendNotif('Session terminée ! Prends une pause 🍅')
      setMode('break')
      setTimeLeft(POMO_PRESETS[preset].break)
    } else {
      sendNotif('Pause terminée ! Reprends le travail 💪')
      setMode('work')
      setTimeLeft(POMO_PRESETS[preset].work)
    }
  }, [timeLeft, mode, preset, linkedTask, incrementTaskPomodoros, incrementTodayPomodoros])

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(POMO_PRESETS[preset][mode])
  }

  const handlePreset = (p: PomoPreset) => {
    setPreset(p)
    setIsRunning(false)
    setMode('work')
    setTimeLeft(POMO_PRESETS[p].work)
  }

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, border: '1px solid #222' }}>
      <div className="card-title">Pomodoro</div>

      {/* Timer ring */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r={RING_R} fill="none" stroke="#2a2a2a" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={RING_R}
              fill="none"
              stroke={accent}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${ringDash} ${ringGap}`}
              style={{ transition: isRunning ? 'stroke-dasharray 0.9s linear, stroke 0.3s ease' : 'stroke 0.3s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 28, fontWeight: 800, color: '#fff',
              fontFamily: 'monospace', letterSpacing: '-1px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtTime(timeLeft)}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.12em', color: accent }}>
          {mode === 'work' ? 'TRAVAIL' : 'PAUSE'}
        </span>
      </div>

      {/* Start / Pause */}
      <button
        onClick={() => setIsRunning((v) => !v)}
        style={{
          width: '100%', height: 48, marginBottom: 8,
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 10, fontSize: 15, fontWeight: 700,
          cursor: 'pointer', transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#e55f00' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
      >
        {isRunning ? 'Pause' : timeLeft < totalTime ? 'Reprendre' : 'Démarrer'}
      </button>

      {/* Reset */}
      <button
        onClick={handleReset}
        style={{
          width: '100%', height: 34, marginBottom: 16,
          background: 'transparent', color: 'var(--text-faint)',
          border: '1px solid var(--border)', borderRadius: 8,
          fontSize: 12, fontFamily: 'monospace', cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        Réinitialiser
      </button>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(Object.keys(POMO_PRESETS) as PomoPreset[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            style={{
              flex: 1, height: 32,
              background: preset === p ? 'rgba(255,107,0,0.12)' : 'transparent',
              color:       preset === p ? 'var(--accent)' : 'var(--text-faint)',
              border:      `1px solid ${preset === p ? 'var(--accent-50)' : 'var(--border)'}`,
              borderRadius: 7, fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Task link */}
      <select
        value={linkedTask}
        onChange={(e) => setLinkedTask(e.target.value)}
        style={{
          width: '100%', height: 36, marginBottom: 16,
          background: '#141414',
          color: linkedTask ? '#fff' : 'var(--text-faint)',
          border: '1px solid var(--border)', borderRadius: 8,
          fontSize: 12, padding: '0 10px', cursor: 'pointer', outline: 'none',
        }}
      >
        <option value="">Aucune tâche liée</option>
        {activeTasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title.length > 32 ? t.title.slice(0, 32) + '…' : t.title}
          </option>
        ))}
      </select>

      {/* Today counter */}
      <div style={{
        paddingTop: 14, borderTop: '1px solid #222',
        textAlign: 'center', fontFamily: 'monospace', fontSize: 13,
        color: todayPomodoros > 0 ? 'var(--text-muted)' : 'var(--text-faint)',
      }}>
        {todayPomodoros} 🍅 aujourd&apos;hui
      </div>
    </div>
  )
}

// ─── Historique section ───────────────────────────────────────

function HistoriqueSection() {
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const [open, setOpen] = useState(false)

  if (archivedTasks.length === 0) return null

  // Group by archivedDate, newest first
  const grouped = archivedTasks.reduce<Record<string, typeof archivedTasks>>((acc, t) => {
    ;(acc[t.archivedDate] ??= []).push(t)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ marginTop: 40 }}>
      {/* Section divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, var(--border) 0%, transparent 100%)', marginBottom: 16 }} />

      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full cursor-pointer"
        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
      >
        <Archive size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        <span className="font-mono font-bold" style={{ fontSize: 12, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Historique
        </span>
        <span
          className="font-mono font-bold rounded"
          style={{ fontSize: 10, color: '#888', background: '#222', padding: '2px 7px' }}
        >
          {archivedTasks.length}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="historique-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {sortedDates.map((date) => {
                let dateLabel = date
                try {
                  dateLabel = format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })
                  dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)
                } catch { /* malformed date */ }

                return (
                  <div key={date}>
                    {/* Date header */}
                    <div
                      className="flex items-center gap-2 font-mono"
                      style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                    >
                      <div style={{ width: 20, height: 1, background: 'var(--accent-33)' }} />
                      {dateLabel}
                      <div style={{ flex: 1, height: 1, background: 'var(--accent-08)' }} />
                    </div>

                    {/* Task rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {grouped[date].map((task) => {
                        const cfg = PRIORITY_CFG[task.priority]
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-3"
                            style={{
                              padding: '10px 14px',
                              background: '#141414',
                              borderRadius: 8,
                              border: '1px solid #1e1e1e',
                              opacity: 0.65,
                            }}
                          >
                            {/* Checked circle */}
                            <div
                              className="shrink-0 flex items-center justify-center rounded border-2"
                              style={{ width: 16, height: 16, borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}
                            >
                              <Check size={9} strokeWidth={3} style={{ color: 'var(--accent)' }} />
                            </div>

                            {/* Title with strikethrough */}
                            <span
                              className="flex-1 truncate"
                              style={{
                                fontSize: 13,
                                color: '#888',
                                textDecoration: 'line-through',
                                textDecorationColor: '#444',
                              }}
                            >
                              {task.title}
                            </span>

                            {/* Priority badge */}
                            <span
                              className="shrink-0 font-mono font-bold rounded"
                              style={{
                                fontSize: 10,
                                color: cfg.color,
                                background: cfg.bg,
                                padding: '2px 6px',
                              }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── TasksTab ─────────────────────────────────────────────────

export function TasksTab() {
  const { tasks, reorderTasks } = useTasks()
  const [showCompleted, setShowCompleted] = useState(true)

  const completedCount = tasks.filter((t) => t.completed).length
  const allDone        = tasks.length > 0 && completedCount === tasks.length
  const displayedTasks = showCompleted ? tasks : tasks.filter((t) => !t.completed)

  const dragFromRef                      = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const handleDragStart = (i: number) => { dragFromRef.current = i; setDraggingIndex(i) }
  const handleDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragFromRef.current !== null && dragFromRef.current !== i) setDragOverIndex(i)
  }
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragFromRef.current !== null && dragFromRef.current !== i) reorderTasks(dragFromRef.current, i)
    dragFromRef.current = null; setDragOverIndex(null); setDraggingIndex(null)
  }
  const handleDragEnd = () => { dragFromRef.current = null; setDragOverIndex(null); setDraggingIndex(null) }

  return (
    <div style={{ padding: '32px 40px 48px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Tasks</h1>
          {completedCount > 0 && (
            <button
              onClick={() => setShowCompleted((v) => !v)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'monospace',
                color: showCompleted ? 'var(--accent)' : 'var(--text-faint)',
                background: showCompleted ? 'rgba(255,107,0,0.1)' : 'transparent',
                border: `1px solid ${showCompleted ? 'rgba(255,107,0,0.35)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = showCompleted ? 'rgba(255,107,0,0.35)' : 'var(--border)'
                e.currentTarget.style.color = showCompleted ? 'var(--accent)' : 'var(--text-faint)'
              }}
            >
              {showCompleted ? `Masquer complétées (${completedCount})` : `Voir complétées (${completedCount})`}
            </button>
          )}
        </div>
        <p style={{ fontSize: 16, color: '#888', marginTop: 6 }}>
          {completedCount}/{tasks.length} complétées
        </p>
        <div style={{ marginTop: 20, height: 1, background: 'linear-gradient(90deg, rgba(255,107,0,0.6) 0%, rgba(255,107,0,0.08) 60%, transparent 100%)' }} />
      </div>

      {/* 2-column layout */}
      <div
        className="grid"
        style={{ gridTemplateColumns: '68fr 30fr', gap: 32, alignItems: 'start' }}
      >
        {/* Left: task list */}
        <div>
          {tasks.length > 0 && <ProgressBar completed={completedCount} total={tasks.length} />}
          <AddTaskForm />

          <div className="flex flex-col" style={{ gap: 12 }}>
            <AnimatePresence initial={false}>
              {displayedTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  isDragOver={dragOverIndex === index}
                  isDragging={draggingIndex === index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </AnimatePresence>
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-16 font-mono" style={{ fontSize: 14, color: 'var(--text-faint)' }}>
              Aucune tâche — ajoutez-en une ci-dessus.
            </div>
          )}

          {allDone && showCompleted && <CongratsBanner />}

          <HistoriqueSection />
        </div>

        {/* Right: stats + pomodoro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TaskStatsPanel tasks={tasks} />
          <PomodoroWidget tasks={tasks} />
        </div>
      </div>
    </div>
  )
}
