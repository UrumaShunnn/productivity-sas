import { useMemo, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Flame, Dumbbell, Target, Euro, ShoppingBag } from 'lucide-react'
import { subDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import { getDailyQuote } from '../../data/quotes'
import { useTasks } from '../../hooks/useTasks'
import { useGoals } from '../../hooks/useGoals'
import { useTraining } from '../../hooks/useTraining'
import { AIAnalysisModal } from '../AIAnalysisModal'
import type { MuscleGroup } from '../../types'

// ─── CountUp (integer) ────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const run = (now: number) => {
      const t     = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) frameRef.current = requestAnimationFrame(run)
    }
    frameRef.current = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}

// ─── CountUp (float, 2 decimals) ─────────────────────────────

function useCountUpFloat(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const run = (now: number) => {
      const t     = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(parseFloat((target * eased).toFixed(2)))
      if (t < 1) frameRef.current = requestAnimationFrame(run)
    }
    frameRef.current = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}

// ─── Helpers ─────────────────────────────────────────────────

function getTodayString(): string {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = String(now.getMonth() + 1).padStart(2, '0')
  const d   = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function todayKey() { return getTodayString() }
function dayKey(daysAgo: number) { return format(subDays(new Date(), daysAgo), 'yyyy-MM-dd') }
function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function fmtEuro(amount: number): string {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Muscle colors ────────────────────────────────────────────

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  Chest:       '#ef4444',
  Back:        '#3b82f6',
  Legs:        '#a855f7',
  Shoulders:   '#f59e0b',
  Arms:        '#ec4899',
  Core:        '#14b8a6',
  Cardio:      '#f97316',
  'Full Body': 'var(--accent)',
}

const PRIORITY_CFG = {
  HIGH: { label: 'HIGH', color: '#ef4444' },
  MED:  { label: 'MED',  color: '#f59e0b' },
  LOW:  { label: 'LOW',  color: '#22c55e' },
}

const CATEGORY_CFG = {
  Business: { color: '#38bdf8' },
  Finance:  { color: '#f59e0b' },
  Personal: { color: '#c084fc' },
  Health:   { color: '#22c55e' },
}

// ─── Circular ring ────────────────────────────────────────────

function MiniRing({ progress, size = 72, color = 'var(--accent)' }: { progress: number; size?: number; color?: string }) {
  const r    = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(100, Math.max(0, progress)) / 100)
  const cx   = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color + '20'} strokeWidth={size * 0.09} />
      <motion.circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke={color}
        strokeWidth={size * 0.09}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
      />
    </svg>
  )
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

// ─── KPI Cards ────────────────────────────────────────────────

function ScoreCard({ score }: { score: number }) {
  const col      = scoreColor(score)
  const animated = useCountUp(score)
  const label    = score >= 70 ? 'Excellent !' : score >= 40 ? 'En progression' : 'À améliorer'
  return (
    <div className="card flex flex-col" style={{ minHeight: 130, borderLeft: `4px solid ${col}` }}>
      <div className="card-title">Score du jour</div>
      <div className="flex items-center gap-4 mt-auto">
        <div className="relative">
          <MiniRing progress={score} size={76} color={col} />
          <div
            className="absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums"
            style={{ fontSize: 13, color: col }}
          >
            {animated}
          </div>
        </div>
        <div>
          <div className="font-bold tabular-nums leading-none" style={{ fontSize: 56, color: col, fontFamily: 'Space Mono, monospace' }}>
            {animated}
          </div>
          <div className="text-sm mt-1 font-mono font-bold" style={{ color: col }}>{label}</div>
        </div>
      </div>
    </div>
  )
}

function CompletionRateCard({ rate, completed, total }: { rate: number; completed: number; total: number }) {
  const animated = useCountUp(rate)
  return (
    <div className="card flex flex-col" style={{ minHeight: 130, borderLeft: '4px solid var(--accent)' }}>
      <div className="card-title">Taux de réussite</div>
      <div className="flex items-center gap-5 mt-auto">
        <div className="relative">
          <MiniRing progress={rate} size={76} />
          <div
            className="absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums"
            style={{ fontSize: 13, color: 'var(--accent)' }}
          >
            {animated}%
          </div>
        </div>
        <div>
          <div className="font-bold tabular-nums leading-none" style={{ fontSize: 56, color: '#fff', fontFamily: 'Space Mono, monospace' }}>
            {animated}%
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {completed}/{total} tâches
          </div>
        </div>
      </div>
    </div>
  )
}

function TasksKPICard({ completed, total }: { completed: number; total: number }) {
  const pct      = total === 0 ? 0 : Math.round((completed / total) * 100)
  const animated = useCountUp(completed)
  return (
    <div className="card flex flex-col" style={{ minHeight: 130, borderLeft: '4px solid var(--accent)' }}>
      <div className="card-title">Tâches complétées</div>
      <div className="font-bold tabular-nums leading-none mt-1" style={{ fontSize: 56, color: '#fff', fontFamily: 'Space Mono, monospace' }}>
        {animated}
        <span className="text-xl ml-1" style={{ color: 'var(--text-faint)' }}>/{total}</span>
      </div>
      <div className="mt-auto pt-4">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: 'var(--surface-3)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--accent), #ffaa00)', boxShadow: '0 0 8px var(--accent-50)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-faint)' }}>{pct}% complétées</div>
      </div>
    </div>
  )
}

function RevenueKPICard() {
  const sales = useAppStore((s) => s.sales)
  const today = getTodayString()
  const month = currentMonthKey()
  console.log('Today:', today, 'Sales dates:', sales.map((s) => s.date))

  const todayAmount = sales.filter((s) => s.date === today).reduce((sum, s) => sum + s.amount, 0)
  const todayCount  = sales.filter((s) => s.date === today).length
  const monthAmount = sales.filter((s) => s.date.startsWith(month)).reduce((sum, s) => sum + s.amount, 0)

  const animated = useCountUpFloat(todayAmount)
  return (
    <div className="card flex flex-col" style={{ minHeight: 130, borderLeft: '4px solid #f97316' }}>
      <div className="flex items-center gap-2 card-title" style={{ color: '#f97316' }}>
        <Euro size={13} />
        Revenus du jour
      </div>
      <div className="flex items-end gap-2 mt-1">
        <div className="font-bold tabular-nums leading-none" style={{ fontSize: todayAmount >= 1000 ? 38 : 48, color: '#f97316', fontFamily: 'Space Mono, monospace' }}>
          {fmtEuro(animated)}
        </div>
        <div className="mb-1.5 font-mono font-bold text-sm" style={{ color: '#f9731688' }}>€</div>
      </div>
      <div className="mt-auto pt-3 flex items-center justify-between">
        <div
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono"
          style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}
        >
          <ShoppingBag size={10} />
          {todayCount === 0 ? 'Aucune vente' : `${todayCount} vente${todayCount > 1 ? 's' : ''} aujourd'hui`}
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          Mois: <span style={{ color: '#f9731688' }}>{fmtEuro(monthAmount)}€</span>
        </div>
      </div>
    </div>
  )
}

function WorkoutsCard({ count }: { count: number }) {
  const animated = useCountUp(count)
  return (
    <div className="card flex flex-col" style={{ minHeight: 130, borderLeft: '4px solid var(--accent)' }}>
      <div className="card-title">Séances cette semaine</div>
      <div className="flex items-end gap-3 mt-1">
        <div className="font-bold tabular-nums leading-none" style={{ fontSize: 56, color: '#fff', fontFamily: 'Space Mono, monospace' }}>
          {animated}
        </div>
        <div className="mb-2" style={{ color: '#f97316' }}>
          <Flame size={22} />
        </div>
      </div>
      <div className="mt-auto pt-3">
        <div
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono"
          style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}
        >
          <Dumbbell size={10} />
          {count === 0 ? 'Pas encore cette semaine' : `${count} séance${count > 1 ? 's' : ''} / 7j`}
        </div>
      </div>
    </div>
  )
}

// ─── Tasks Preview ────────────────────────────────────────────

function TasksPreviewCard() {
  const tasks      = useAppStore((s) => s.tasks)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const pending    = tasks.filter((t) => !t.completed).slice(0, 6)
  const completed  = tasks.filter((t) => t.completed).length

  return (
    <div className="card flex flex-col" style={{ minHeight: 220 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="card-title" style={{ marginBottom: 0 }}>Tâches du jour</div>
        <button
          onClick={() => setActiveTab('tasks')}
          className="text-xs font-mono cursor-pointer"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Voir tout →
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2">
          <div style={{ fontSize: 28 }}>🎉</div>
          <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
            {tasks.length === 0 ? 'Aucune tâche — ajoutez-en une' : `${completed} tâches complétées !`}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {pending.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                <motion.button
                  onClick={() => toggleTask(task.id)}
                  whileTap={{ scale: 0.8 }}
                  className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer"
                  style={{ borderColor: 'var(--border-2)', background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)' }}
                >
                  <Check size={10} strokeWidth={3} style={{ color: 'var(--accent)', opacity: 0 }} />
                </motion.button>
                <span className="flex-1 text-sm truncate" style={{ color: '#fff' }}>{task.title}</span>
                <span
                  className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ color: PRIORITY_CFG[task.priority].color, background: PRIORITY_CFG[task.priority].color + '1a' }}
                >
                  {PRIORITY_CFG[task.priority].label}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {tasks.filter((t) => !t.completed).length > 6 && (
        <div className="mt-3 text-xs font-mono text-center" style={{ color: 'var(--text-faint)' }}>
          +{tasks.filter((t) => !t.completed).length - 6} autres tâches
        </div>
      )}
    </div>
  )
}

// ─── Goals Preview ────────────────────────────────────────────

function GoalsPreviewCard() {
  const goals      = useAppStore((s) => s.goals)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const active     = goals.filter((g) => g.progress < 100).slice(0, 4)

  return (
    <div className="card flex flex-col" style={{ minHeight: 220 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 card-title" style={{ marginBottom: 0 }}>
          <Target size={13} style={{ color: 'var(--accent)' }} />
          Objectifs
        </div>
        <button
          onClick={() => setActiveTab('goals')}
          className="text-xs font-mono cursor-pointer"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Voir tout →
        </button>
      </div>

      {active.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>Aucun objectif actif</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((goal) => {
            const col = CATEGORY_CFG[goal.category].color
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-sm truncate" style={{ color: '#fff' }}>{goal.title}</span>
                  <span className="shrink-0 font-mono text-xs font-bold" style={{ color: col }}>{goal.progress}%</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--surface-3)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: col, boxShadow: `0 0 6px ${col}66` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Finance Day Card ─────────────────────────────────────────

function FinanceDayCard() {
  const sales        = useAppStore((s) => s.sales)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const today        = getTodayString()
  const todaySales   = sales.filter((s) => s.date === today)
  const visible      = todaySales.slice(0, 3)

  return (
    <div className="card flex flex-col" style={{ minHeight: 220 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 card-title" style={{ marginBottom: 0, color: '#f97316' }}>
          <Euro size={13} />
          Finance du jour
        </div>
        <button
          onClick={() => setActiveTab('finance')}
          className="text-xs font-mono cursor-pointer"
          style={{ color: '#f97316' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Voir tout →
        </button>
      </div>

      {todaySales.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2">
          <ShoppingBag size={22} style={{ color: 'var(--text-faint)' }} />
          <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
            Aucune vente aujourd'hui
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          <AnimatePresence initial={false}>
            {visible.map((sale) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                <div className="font-mono font-bold text-sm tabular-nums" style={{ color: '#f97316', minWidth: 60 }}>
                  {fmtEuro(sale.amount)}€
                </div>
                <div
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: sale.source === 'Vinted' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)',
                    color:      sale.source === 'Vinted' ? '#22c55e' : '#94a3b8',
                  }}
                >
                  {sale.source}
                </div>
                {sale.description && (
                  <div className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                    {sale.description}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {todaySales.length > 3 && (
            <div className="text-xs font-mono text-center mt-1" style={{ color: 'var(--text-faint)' }}>
              +{todaySales.length - 3} autres ventes
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Weekly Performance Chart (with toggle) ───────────────────

type ChartView = 'tasks' | 'revenus'

interface TaskBarData    { label: string; count: number;  isToday: boolean }
interface RevenueBarData { label: string; amount: number; isToday: boolean }

function WeeklyPerformanceCard({
  taskData,
  revenueData,
}: {
  taskData:    TaskBarData[]
  revenueData: RevenueBarData[]
}) {
  const [view, setView] = useState<ChartView>('tasks')

  const taskMax    = Math.max(...taskData.map((d) => d.count), 1)
  const revenueMax = Math.max(...revenueData.map((d) => d.amount), 1)

  return (
    <div className="card" style={{ minHeight: 200 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="card-title" style={{ marginBottom: 0 }}>Performance hebdomadaire</div>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['tasks', 'revenus'] as ChartView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1 text-xs font-mono font-bold cursor-pointer transition-all"
              style={{
                background: view === v ? 'var(--accent)' : 'transparent',
                color:      view === v ? '#000' : 'var(--text-muted)',
                border:     'none',
              }}
            >
              {v === 'tasks' ? 'Tâches' : 'Revenus'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'tasks' ? (
          <motion.div
            key="tasks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-end gap-3"
            style={{ height: 130 }}
          >
            {taskData.map((d, i) => {
              const hPct = Math.max(4, (d.count / taskMax) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] font-mono tabular-nums" style={{ color: d.isToday ? 'var(--accent)' : (d.count > 0 ? '#888' : 'transparent') }}>
                    {d.count > 0 ? d.count : '·'}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      className="w-full rounded-md"
                      style={{
                        background: d.isToday
                          ? 'linear-gradient(180deg, var(--accent) 0%, #ffaa00 100%)'
                          : 'rgba(255,107,0,0.2)',
                        boxShadow: d.isToday ? '0 0 14px rgba(255,107,0,0.5)' : 'none',
                        minHeight: 4,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${hPct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="text-[10px] font-mono font-bold" style={{ color: d.isToday ? '#fff' : 'var(--text-faint)' }}>
                    {d.label}
                  </div>
                </div>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key="revenus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-end gap-3"
            style={{ height: 130 }}
          >
            {revenueData.map((d, i) => {
              const hPct = Math.max(4, (d.amount / revenueMax) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] font-mono tabular-nums" style={{ color: d.isToday ? '#f97316' : (d.amount > 0 ? '#888' : 'transparent') }}>
                    {d.amount > 0 ? `${d.amount.toFixed(0)}€` : '·'}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      className="w-full rounded-md"
                      style={{
                        background: d.isToday
                          ? 'linear-gradient(180deg, #f97316 0%, #fb923c 100%)'
                          : 'rgba(249,115,22,0.25)',
                        boxShadow: d.isToday ? '0 0 14px rgba(249,115,22,0.5)' : 'none',
                        minHeight: 4,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${hPct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="text-[10px] font-mono font-bold" style={{ color: d.isToday ? '#fff' : 'var(--text-faint)' }}>
                    {d.label}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Training Split Card ──────────────────────────────────────

function TrainingSplitCard({ muscles }: { muscles: Set<MuscleGroup> }) {
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const allGroups: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body']

  return (
    <div className="card" style={{ minHeight: 200 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="card-title" style={{ marginBottom: 0 }}>Split musculaire</div>
        <button
          onClick={() => setActiveTab('workout')}
          className="text-xs font-mono cursor-pointer"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Voir →
        </button>
      </div>

      {muscles.size === 0 ? (
        <div className="py-6 text-center text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
          Aucune séance cette semaine
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allGroups.map((mg) => {
            const hit = muscles.has(mg)
            const col = MUSCLE_COLORS[mg]
            return (
              <div
                key={mg}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold"
                style={{
                  background: hit ? col + '18' : 'var(--surface-2)',
                  color:      hit ? col : 'var(--text-faint)',
                  border:     `1px solid ${hit ? col + '44' : 'var(--border)'}`,
                  opacity:    hit ? 1 : 0.5,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: hit ? col : 'var(--text-faint)' }} />
                {mg}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Quote Card ───────────────────────────────────────────────

function QuoteCard() {
  const quote = getDailyQuote()
  return (
    <div
      className="card relative overflow-hidden"
      style={{
        minHeight: 200,
        background: 'linear-gradient(135deg, var(--accent-15) 0%, rgba(255,170,0,0.08) 60%, rgba(26,26,26,0) 100%)',
        borderColor: 'var(--accent-33)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 0% 0%, var(--accent-20) 0%, transparent 60%)' }}
      />
      <div className="card-title relative" style={{ color: '#ffaa00' }}>Inspiration du jour</div>
      <div className="relative">
        <div className="font-mono text-3xl font-bold leading-none mb-4" style={{ color: 'var(--accent-33)' }}>"</div>
        <p className="text-sm leading-relaxed" style={{ color: '#ddd' }}>{quote}</p>
      </div>
    </div>
  )
}

// ─── Motivational Banner ──────────────────────────────────────

const DAILY_QUOTES = [
  "Pendant que tu procrastines, d'autres prennent de l'avance.",
  "La discipline, c'est choisir entre ce que tu veux maintenant et ce que tu veux le plus.",
  "Chaque jour sans effort est un jour offert à la concurrence.",
  "Le succès n'est pas une destination, c'est une habitude quotidienne.",
  "Ceux qui réussissent font ce que les autres refusent de faire.",
  "Ta future version te regarde. Ne la déçois pas.",
  "Un jour ou jour 1. C'est toi qui choisis.",
]

function MotivationalBanner() {
  const quote = DAILY_QUOTES[new Date().getDay()]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, #1a0f00 0%, #0f0a00 100%)',
        borderTop: '1px solid var(--accent-20)',
        padding: '32px 48px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
        <span style={{ color: 'var(--accent)', marginRight: 10, fontStyle: 'normal', fontWeight: 400 }}>«</span>
        {quote}
        <span style={{ color: 'var(--accent)', marginLeft: 10, fontStyle: 'normal', fontWeight: 400 }}>»</span>
      </p>
      <div style={{
        width: 60, height: 2,
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        borderRadius: 1, margin: '20px auto 0',
      }} />
    </motion.div>
  )
}

// ─── DashboardTab ─────────────────────────────────────────────

export function DashboardTab() {
  const { tasks }    = useTasks()
  const { goals }    = useGoals()
  const { sessions } = useTraining()
  const sales         = useAppStore((s) => s.sales)
  const userName      = useAppStore((s) => s.userName)
  const currentStreak = useAppStore((s) => s.currentStreak)
  const [showAI, setShowAI] = useState(false)

  const stats = useMemo(() => {
    const today   = todayKey()
    const weekAgo = dayKey(7)

    // Tasks
    const completed   = tasks.filter((t) => t.completed).length
    const total       = tasks.length
    const rate        = total === 0 ? 0 : Math.round((completed / total) * 100)
    const activeGoals = goals.filter((g) => g.progress < 100).length
    const workouts    = sessions.filter((s) => s.date >= weekAgo).length

    // Daily score
    const taskScore  = total === 0 ? 0 : (completed / total) * 40
    const goalScore  = goals.some((g) => g.progress > 0) ? 30 : 0
    const trainScore = sessions.some((s) => s.date.startsWith(today)) ? 30 : 0
    const dailyScore = Math.round(taskScore + goalScore + trainScore)

    // Weekly task chart
    const weeklyData: TaskBarData[] = Array.from({ length: 7 }, (_, i) => {
      const k     = dayKey(6 - i)
      const label = format(subDays(new Date(), 6 - i), 'EEE', { locale: fr })
      const count = tasks.filter((t) => t.completed && t.createdAt.startsWith(k)).length
      return { label, count, isToday: k === today }
    })

    // Weekly revenue chart
    const weeklyRevenue: RevenueBarData[] = Array.from({ length: 7 }, (_, i) => {
      const k      = dayKey(6 - i)
      const label  = format(subDays(new Date(), 6 - i), 'EEE', { locale: fr })
      const amount = sales.filter((s) => s.date === k).reduce((sum, s) => sum + s.amount, 0)
      return { label, amount, isToday: k === today }
    })

    // Muscle split
    const thisWeekMuscles = new Set(
      sessions
        .filter((s) => s.date >= weekAgo)
        .flatMap((s) => s.exercises)
        .map((e) => e.muscleGroup),
    ) as Set<MuscleGroup>

    return {
      completed, total, rate, activeGoals, workouts,
      dailyScore, weeklyData, weeklyRevenue,
      thisWeekMuscles,
    }
  }, [tasks, goals, sessions, sales])

  const greeting  = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [])

  const dateLabel = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })

  return (
    <div>
      <div style={{ padding: '20px 48px 40px' }}>

        {/* Page header */}
        <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {greeting} {userName} 👋
            </h1>
            <p className="capitalize" style={{ fontSize: 14, color: 'var(--accent)', marginTop: 4 }}>
              {dateLabel}
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold"
            style={{
              background: currentStreak > 0 ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${currentStreak > 0 ? '#f9731644' : '#333'}`,
              color: currentStreak > 0 ? '#f97316' : '#555',
              fontSize: 14,
            }}
          >
            <Flame size={16} style={{ color: currentStreak > 0 ? '#f97316' : '#444' }} />
            {currentStreak > 0
              ? `${currentStreak} jour${currentStreak > 1 ? 's' : ''} de suite`
              : "Commence aujourd'hui !"}
          </motion.div>
        </div>

        {/* Row 1 — KPI cards (5 cols: Score | Taux | Tâches | Revenus | Séances) */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, marginBottom: 20 }}>
          <ScoreCard score={stats.dailyScore} />
          <CompletionRateCard rate={stats.rate} completed={stats.completed} total={stats.total} />
          <TasksKPICard completed={stats.completed} total={stats.total} />
          <RevenueKPICard />
          <WorkoutsCard count={stats.workouts} />
        </div>

        {/* Row 2 — Tasks preview (wide) | Goals | Finance du jour */}
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 24, marginBottom: 20 }}>
          <TasksPreviewCard />
          <GoalsPreviewCard />
          <FinanceDayCard />
        </div>

        {/* Row 3 — Performance (with toggle) | Split | Quote */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <WeeklyPerformanceCard
            taskData={stats.weeklyData}
            revenueData={stats.weeklyRevenue}
          />
          <TrainingSplitCard muscles={stats.thisWeekMuscles} />
          <QuoteCard />
        </div>
      </div>

      {/* Motivational banner */}
      <MotivationalBanner />

      {/* AI analysis button */}
      <div style={{ padding: '28px 48px 48px', display: 'flex', justifyContent: 'center' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAI(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 36px', borderRadius: 14,
            border: '1px solid var(--accent-33)',
            background: 'linear-gradient(135deg, var(--accent-15) 0%, rgba(255,170,0,0.06) 100%)',
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 0 24px var(--accent-08)',
          }}
        >
          <span style={{ fontSize: 20 }}>✨</span>
          Analyser ma journée avec l&apos;IA
        </motion.button>
      </div>

      {/* AI modal */}
      <AnimatePresence>
        {showAI && (
          <AIAnalysisModal
            key="ai-modal"
            onClose={() => setShowAI(false)}
            data={{
              userName,
              completed:    stats.completed,
              total:        stats.total,
              rate:         stats.rate,
              tasks:        tasks.map((t) => ({ title: t.title, completed: t.completed })),
              goals:        goals.map((g) => ({ title: g.title, progress: g.progress, category: g.category })),
              todaySession: sessions.some((s) => s.date.startsWith(todayKey())),
              dailyScore:   stats.dailyScore,
              currentStreak,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
