import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { Plus, Trophy, Play, Square, X, Dumbbell } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { useTraining } from '../../hooks/useTraining'
import type { Exercise, MuscleGroup, WorkoutSession } from '../../types'

// ─── Config ───────────────────────────────────────────────────

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body',
]

const MUSCLE_COLOR: Record<MuscleGroup, string> = {
  Chest:       '#ef4444',
  Back:        '#3b82f6',
  Legs:        '#a855f7',
  Shoulders:   '#f59e0b',
  Arms:        '#ec4899',
  Core:        '#14b8a6',
  Cardio:      '#f97316',
  'Full Body': '#ff6b00',
}

const MUSCLE_BG: Record<MuscleGroup, string> = {
  Chest:       'rgba(239,68,68,0.12)',
  Back:        'rgba(59,130,246,0.12)',
  Legs:        'rgba(168,85,247,0.12)',
  Shoulders:   'rgba(245,158,11,0.12)',
  Arms:        'rgba(236,72,153,0.12)',
  Core:        'rgba(20,184,166,0.12)',
  Cardio:      'rgba(249,115,22,0.12)',
  'Full Body': 'rgba(255,107,0,0.12)',
}

// ─── Helpers ─────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, '0') }
function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function getPersonalBest(sessions: WorkoutSession[], name: string, excludeId: string): number {
  return sessions
    .filter((s) => s.id !== excludeId)
    .flatMap((s) => s.exercises)
    .filter((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase() && e.weight > 0)
    .reduce((max, e) => Math.max(max, e.weight), 0)
}

function getWeeklyVolume(sessions: WorkoutSession[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d   = subDays(new Date(), 6 - i)
    const key = format(d, 'yyyy-MM-dd')
    return {
      label:   format(d, 'EEE', { locale: fr }),
      volume:  sessions.filter((s) => s.date.startsWith(key)).flatMap((s) => s.exercises).reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0),
      isToday: key === todayStr(),
    }
  })
}

// ─── Session timer ─────────────────────────────────────────────

function SessionTimer() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60

  return (
    <div
      className="card flex items-center gap-6"
      style={{
        background:   running ? 'rgba(255,107,0,0.06)' : 'var(--surface)',
        borderColor:  running ? 'var(--accent)' : 'var(--border)',
        boxShadow:    running ? 'var(--glow-green)' : 'none',
        padding:      '20px 24px',
        transition:   'all 0.3s ease',
      }}
    >
      <span
        className="font-mono text-3xl font-bold tracking-widest tabular-nums"
        style={{ color: running ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
      <div className="flex-1" />
      <motion.button
        onClick={() => { if (running) { setRunning(false); setElapsed(0) } else setRunning(true) }}
        className="flex items-center gap-2 text-sm font-mono px-5 py-2.5 rounded-xl border cursor-pointer font-bold"
        style={
          running
            ? { color: '#ef4444', borderColor: '#ef4444', background: 'rgba(239,68,68,0.1)' }
            : { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' }
        }
        whileTap={{ scale: 0.95 }}
      >
        {running ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
        {running ? 'Arrêter' : 'Démarrer la séance'}
      </motion.button>
    </div>
  )
}

// ─── Exercise card ────────────────────────────────────────────

const SWIPE_THRESHOLD = 72

function ExerciseCard({ exercise, sessionId, isPR }: { exercise: Exercise; sessionId: string; isPR: boolean }) {
  const toggleExerciseDone = useAppStore((s) => s.toggleExerciseDone)
  const x     = useMotionValue(0)
  const color = MUSCLE_COLOR[exercise.muscleGroup]
  const bg    = MUSCLE_BG[exercise.muscleGroup]

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 400) toggleExerciseDone(sessionId, exercise.id)
  }

  const detail = exercise.muscleGroup === 'Cardio'
    ? `${exercise.duration}s`
    : `${exercise.sets} × ${exercise.reps} × ${exercise.weight}kg`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 200, transition: { duration: 0.22 } }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.35 }}
      style={{ x, background: exercise.isDone ? 'var(--surface)' : 'var(--surface-2)', borderColor: exercise.isDone ? 'var(--border)' : color + '44', opacity: exercise.isDone ? 0.5 : 1 }}
      onDragEnd={handleDragEnd}
      className="relative flex items-center gap-3 px-5 py-3.5 rounded-xl border select-none cursor-grab active:cursor-grabbing overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,0,0.18) 100%)', opacity: x }}
      />
      <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: exercise.isDone ? 'var(--accent)' : color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate" style={{ color: exercise.isDone ? 'var(--text-muted)' : '#fff' }}>
            {exercise.name}
          </span>
          {isPR && !exercise.isDone && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.14)' }}
            >
              <Trophy size={9} />
              PR
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color, background: bg }}>
            {exercise.muscleGroup}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{detail}</span>
        </div>
      </div>
      {!exercise.isDone && (
        <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-faint)' }}>→</span>
      )}
    </motion.div>
  )
}

// ─── Add exercise form ────────────────────────────────────────

const EMPTY_FORM = { name: '', muscleGroup: 'Chest' as MuscleGroup, sets: 3, reps: 10, weight: 0, duration: 0 }

function AddExerciseForm({ onAdd }: { onAdd: (ex: Omit<Exercise, 'id' | 'isDone' | 'pr'>) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const isCardio = form.muscleGroup === 'Cardio'

  const submit = () => {
    if (!form.name.trim()) return
    onAdd({ name: form.name.trim(), muscleGroup: form.muscleGroup, sets: isCardio ? 1 : form.sets, reps: isCardio ? 1 : form.reps, weight: isCardio ? 0 : form.weight, duration: isCardio ? form.duration : 0 })
    setForm(EMPTY_FORM)
    setOpen(false)
  }

  return (
    <div className="mb-4">
      <AnimatePresence>
        {!open ? (
          <motion.button
            key="open-btn"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm font-mono cursor-pointer transition-all duration-150"
            style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Plus size={14} />
            Ajouter un exercice
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex gap-2 mb-4">
              <input
                type="text" value={form.name} autoFocus
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Nom de l'exercice…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: '#fff', caretColor: 'var(--accent)' }}
              />
              <button onClick={() => setOpen(false)} className="cursor-pointer" style={{ color: 'var(--text-faint)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {MUSCLE_GROUPS.map((mg) => {
                const active = form.muscleGroup === mg
                return (
                  <button
                    key={mg}
                    onClick={() => setForm((f) => ({ ...f, muscleGroup: mg }))}
                    className="text-[10px] font-mono font-bold px-2 py-1 rounded cursor-pointer transition-all duration-100"
                    style={{ color: active ? MUSCLE_COLOR[mg] : 'var(--text-faint)', background: active ? MUSCLE_BG[mg] : 'transparent', border: `1px solid ${active ? MUSCLE_COLOR[mg] : 'var(--border)'}` }}
                  >
                    {mg}
                  </button>
                )
              })}
            </div>

            {isCardio ? (
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Durée (s)</label>
                <input
                  type="number" min={0} value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                  className="w-20 bg-transparent text-sm font-mono text-center outline-none px-2 py-1 rounded border"
                  style={{ color: '#fff', borderColor: 'var(--border)' }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4">
                {([['Sets', 'sets'], ['Reps', 'reps'], ['kg', 'weight']] as const).map(([label, key]) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <label className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{label}</label>
                    <input
                      type="number" min={0} value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                      className="w-16 bg-transparent text-sm font-mono text-center outline-none px-2 py-1.5 rounded border"
                      style={{ color: '#fff', borderColor: 'var(--border)' }}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!form.name.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-mono font-bold border cursor-pointer disabled:opacity-25"
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}
            >
              Ajouter à la séance
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Volume chart ─────────────────────────────────────────────

const CW = 480; const CB = 100; const MH = 80; const BW = 36

function VolumeChart({ sessions }: { sessions: WorkoutSession[] }) {
  const data   = useMemo(() => getWeeklyVolume(sessions), [sessions])
  const maxVol = Math.max(...data.map((d) => d.volume), 1)
  const gap    = (CW - 7 * BW) / 8

  return (
    <div className="card mt-6">
      <div className="card-title">
        Volume Hebdomadaire
        <span className="ml-2 font-normal" style={{ color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 'normal', fontSize: 11 }}>
          (sets × reps × kg)
        </span>
      </div>
      <svg viewBox={`0 0 ${CW} 120`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={CW} y1={CB - MH * t} y2={CB - MH * t}
            stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
        ))}
        <line x1={0} x2={CW} y1={CB} y2={CB} stroke="var(--border)" strokeWidth={1} />
        {data.map((d, i) => {
          const barH = (d.volume / maxVol) * MH
          const bx   = gap + i * (BW + gap)
          return (
            <g key={i}>
              <motion.rect x={bx} width={BW} rx={5}
                fill={d.isToday ? 'url(#barGrad)' : '#ffaa0044'}
                initial={{ y: CB, height: 0 }}
                animate={{ y: CB - barH, height: Math.max(barH, 0) }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                style={d.isToday ? { filter: 'drop-shadow(0 0 8px #ffaa0088)' } : undefined}
              />
              {d.volume > 0 && (
                <motion.text x={bx + BW / 2} y={CB - barH - 6} textAnchor="middle"
                  fill={d.isToday ? '#ffaa00' : 'var(--text-faint)'} fontSize="8"
                  fontFamily="'Space Mono', monospace"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 + 0.4 }}>
                  {d.volume >= 1000 ? `${(d.volume / 1000).toFixed(1)}k` : d.volume}
                </motion.text>
              )}
              <text x={bx + BW / 2} y={CB + 13} textAnchor="middle"
                fill={d.isToday ? '#fff' : 'var(--text-faint)'} fontSize="9"
                fontFamily="'Space Mono', monospace" fontWeight={d.isToday ? '700' : '400'}>
                {d.label}
              </text>
            </g>
          )
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#ffaa00" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ─── TrainingTab ───────────────────────────────────────────────

export function TrainingTab() {
  const { sessions, addSession, addExerciseToSession } = useTraining()

  const today        = todayStr()
  const todaySession = sessions.find((s) => s.date.startsWith(today)) ?? null

  const handleAddExercise = (ex: Omit<Exercise, 'id' | 'isDone' | 'pr'>) => {
    let sid = todaySession?.id
    if (!sid) sid = addSession(today)
    addExerciseToSession(sid, ex)
  }

  const prMap = useMemo(() => {
    if (!todaySession) return {} as Record<string, boolean>
    return Object.fromEntries(
      todaySession.exercises.map((ex) => {
        const pb = getPersonalBest(sessions, ex.name, todaySession.id)
        return [ex.id, ex.weight > 0 && ex.weight > pb]
      }),
    )
  }, [sessions, todaySession])

  return (
    <div style={{ padding: '36px 40px 48px' }}>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Dumbbell size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="font-bold" style={{ fontSize: 22, color: '#fff' }}>Training</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </p>
        </div>
      </div>

      {/* Timer */}
      <SessionTimer />

      {/* Exercise list + form */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Session du jour
          </span>
          {todaySession && (
            <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
              {todaySession.exercises.filter((e) => e.isDone).length}/{todaySession.exercises.length} terminés
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5 mb-3">
          <AnimatePresence initial={false}>
            {todaySession?.exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} sessionId={todaySession.id} isPR={prMap[ex.id] ?? false} />
            ))}
          </AnimatePresence>

          {(!todaySession || todaySession.exercises.length === 0) && (
            <div className="py-10 text-center text-sm font-mono rounded-xl border border-dashed"
              style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>
              Aucun exercice — ajoutez-en un ci-dessous
            </div>
          )}
        </div>

        <AddExerciseForm onAdd={handleAddExercise} />
      </div>

      <VolumeChart sessions={sessions} />
    </div>
  )
}
