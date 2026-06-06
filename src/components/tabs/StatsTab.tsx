import { useRef, useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckSquare, Target, Dumbbell } from 'lucide-react'
import { subDays, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTasks } from '../../hooks/useTasks'
import { useGoals } from '../../hooks/useGoals'
import { useTraining } from '../../hooks/useTraining'
import { useAppStore } from '../../store/useAppStore'
import type { MuscleGroup, DailyHistoryEntry } from '../../types'

// ─── Constants ───────────────────────────────────────────────

const RADAR_AXES: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
const RADAR_N  = RADAR_AXES.length
const RADAR_CX = 110; const RADAR_CY = 110; const RADAR_R = 80
const RADAR_RINGS = [0.25, 0.5, 0.75, 1]

// ─── Helpers ──────────────────────────────────────────────────

function todayKey() { return format(new Date(), 'yyyy-MM-dd') }
function dayKey(daysAgo: number) { return format(subDays(new Date(), daysAgo), 'yyyy-MM-dd') }

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length === 1 ? `M${pts[0][0]},${pts[0][1]}` : ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)]; const p1 = pts[i - 1]
    const p2 = pts[i]; const p3 = pts[Math.min(pts.length - 1, i + 1)]
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6; const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6; const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0]},${p2[1]}`
  }
  return d
}

function radarPt(i: number, ratio: number): [number, number] {
  const angle = -Math.PI / 2 + i * ((2 * Math.PI) / RADAR_N)
  return [RADAR_CX + RADAR_R * ratio * Math.cos(angle), RADAR_CY + RADAR_R * ratio * Math.sin(angle)]
}

function radarPolygon(ratios: number[]) {
  return ratios.map((r, i) => radarPt(i, r)).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

function heatColor(intensity: number): string {
  if (intensity === 0) return 'rgba(255,107,0,0.07)'
  if (intensity === 1) return 'rgba(255,107,0,0.22)'
  if (intensity === 2) return 'rgba(255,107,0,0.42)'
  if (intensity === 3) return 'rgba(255,107,0,0.65)'
  return 'rgba(255,170,0,0.88)'
}

// ─── Data hook ────────────────────────────────────────────────

function useStats() {
  const { tasks }    = useTasks()
  const { goals }    = useGoals()
  const { sessions } = useTraining()

  return useMemo(() => {
    const today   = todayKey()
    const weekAgo = dayKey(7)

    const tasksCompletedToday = tasks.filter((t) => t.completed && t.createdAt.startsWith(today)).length
    const activeGoals         = goals.filter((g) => g.progress < 100).length
    const workoutsThisWeek    = sessions.filter((s) => s.date >= weekAgo).length

    const lineData = Array.from({ length: 7 }, (_, i) => {
      const k = dayKey(6 - i)
      return tasks.filter((t) => t.completed && t.createdAt.startsWith(k)).length
    })

    const heatData = Array.from({ length: 30 }, (_, i) => {
      const k          = dayKey(29 - i)
      const taskCount  = tasks.filter((t) => t.createdAt.startsWith(k)).length
      const hasSession = sessions.some((s) => s.date.startsWith(k))
      const goalAct    = goals.filter((g) => g.streak > 0 && g.progress > 0).length > 0 ? 1 : 0
      return {
        key: k,
        label: format(subDays(new Date(), 29 - i), 'd MMM', { locale: fr }),
        intensity: Math.min(4, taskCount + (hasSession ? 2 : 0) + goalAct),
        isToday: k === today,
      }
    })

    const maxVol = Math.max(1, ...RADAR_AXES.map((mg) =>
      sessions.flatMap((s) => s.exercises).filter((e) => e.muscleGroup === mg)
        .reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0),
    ))
    const radarRatios = RADAR_AXES.map((mg) =>
      sessions.flatMap((s) => s.exercises).filter((e) => e.muscleGroup === mg)
        .reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0) / maxVol,
    )

    // Weekly volume
    const weeklyVol = Array.from({ length: 7 }, (_, i) => {
      const d   = subDays(new Date(), 6 - i)
      const key = format(d, 'yyyy-MM-dd')
      return {
        label:   format(d, 'EEE', { locale: fr }),
        volume:  sessions.filter((s) => s.date.startsWith(key)).flatMap((s) => s.exercises).reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0),
        isToday: key === today,
      }
    })

    return { tasksCompletedToday, activeGoals, workoutsThisWeek, lineData, heatData, radarRatios, weeklyVol }
  }, [tasks, goals, sessions])
}

// ─── Animated count ───────────────────────────────────────────

function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const steps = 24; const dur = 900; let step = 0
    const id = setInterval(() => {
      step++
      setDisplay(Math.round((step / steps) * value))
      if (step >= steps) clearInterval(id)
    }, dur / steps)
    return () => clearInterval(id)
  }, [value])
  return <>{display}</>
}

// ─── KPI card ─────────────────────────────────────────────────

function KPICard({ label, value, Icon, accentColor, delay = 0 }: {
  label: string; value: number; Icon: React.ComponentType<{ size?: number }>; accentColor: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className="card flex-1 min-w-0"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ background: accentColor + '18', color: accentColor }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="font-mono font-bold tabular-nums mb-1.5" style={{ fontSize: 44, color: '#fff', lineHeight: 1 }}>
        <AnimatedCount value={value} />
      </div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </motion.div>
  )
}

// ─── Line chart ───────────────────────────────────────────────

const LC_W = 420; const LC_H = 140
const LC_PAD = { top: 18, right: 18, bottom: 28, left: 32 }
const LC_PW = LC_W - LC_PAD.left - LC_PAD.right
const LC_PH = LC_H - LC_PAD.top - LC_PAD.bottom

function CompletionLineChart({ data }: { data: number[] }) {
  const pathRef  = useRef<SVGPathElement>(null)
  const [dashLen, setDashLen] = useState(800)
  const max      = Math.max(...data, 1)

  const pts: [number, number][] = data.map((v, i) => [
    LC_PAD.left + (i / (data.length - 1)) * LC_PW,
    LC_PAD.top + LC_PH - (v / max) * LC_PH,
  ])
  const linePath = smoothPath(pts)
  const lastPt = pts[pts.length - 1]; const firstPt = pts[0]
  const areaPath = linePath + ` L${lastPt[0]},${LC_PAD.top + LC_PH} L${firstPt[0]},${LC_PAD.top + LC_PH} Z`

  useEffect(() => {
    if (pathRef.current) setDashLen(pathRef.current.getTotalLength())
  }, [linePath])

  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), 'EEE', { locale: fr }),
  )

  return (
    <svg viewBox={`0 0 ${LC_W} ${LC_H}`} width="100%" preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1].map((t) => {
        const y = LC_PAD.top + LC_PH * (1 - t)
        return (
          <g key={t}>
            <line x1={LC_PAD.left} x2={LC_W - LC_PAD.right} y1={y} y2={y}
              stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
            {t > 0 && (
              <text x={LC_PAD.left - 5} y={y + 3} textAnchor="end"
                fill="var(--text-faint)" fontSize="8" fontFamily="'Space Mono', monospace">
                {Math.round(max * t)}
              </text>
            )}
          </g>
        )
      })}
      <path d={areaPath} fill="url(#lineGrad)" opacity={0.2} />
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity={1} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        ref={pathRef} d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={dashLen}
        initial={{ strokeDashoffset: dashLen }} animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{ filter: 'drop-shadow(0 0 4px var(--accent-66))' }}
      />
      {pts.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={3.5} fill="var(--bg)" stroke="var(--accent)" strokeWidth={2}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 + i * 0.06, duration: 0.2 }} />
      ))}
      {pts.map(([x], i) => (
        <text key={i} x={x} y={LC_H - 2} textAnchor="middle"
          fill="var(--text-faint)" fontSize="8" fontFamily="'Space Mono', monospace">
          {dayLabels[i]}
        </text>
      ))}
    </svg>
  )
}

// ─── Radar chart ──────────────────────────────────────────────

function MuscleRadar({ ratios }: { ratios: number[] }) {
  const polyRef = useRef<SVGPolygonElement>(null)
  const [dashLen, setDashLen] = useState(600)
  const dataPoints = radarPolygon(ratios)
  const hasData    = ratios.some((r) => r > 0)

  useEffect(() => {
    const pts = ratios.map((r, i) => radarPt(i, r))
    let len = 0
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]; const b = pts[(i + 1) % pts.length]
      len += Math.hypot(b[0] - a[0], b[1] - a[1])
    }
    setDashLen(Math.ceil(len) + 10)
  }, [ratios])

  return (
    <svg viewBox="0 0 220 240" width="100%" preserveAspectRatio="xMidYMid meet">
      {RADAR_RINGS.map((t) => (
        <polygon key={t} points={radarPolygon(Array(RADAR_N).fill(t))}
          fill="none" stroke="var(--border)" strokeWidth={0.75} strokeDasharray={t < 1 ? '3 3' : 'none'} />
      ))}
      {RADAR_AXES.map((_, i) => {
        const [x, y] = radarPt(i, 1)
        return <line key={i} x1={RADAR_CX} y1={RADAR_CY} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.75} />
      })}
      {RADAR_AXES.map((label, i) => {
        const [x, y] = radarPt(i, 1.26)
        return (
          <text key={label} x={x} y={y + 3} textAnchor="middle"
            fill="var(--text-muted)" fontSize="9" fontFamily="'Space Mono', monospace" fontWeight="700">
            {label}
          </text>
        )
      })}
      {hasData && (
        <motion.polygon points={dataPoints} fill="var(--accent)" fillOpacity={0}
          stroke="none" animate={{ fillOpacity: 0.18 }} transition={{ duration: 0.8, delay: 0.8 }} />
      )}
      {hasData && (
        <motion.polygon ref={polyRef} points={dataPoints} fill="none"
          stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round"
          strokeDasharray={dashLen}
          initial={{ strokeDashoffset: dashLen }} animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }} />
      )}
      {hasData && ratios.map((r, i) => {
        const [x, y] = radarPt(i, r)
        return (
          <motion.circle key={i} cx={x} cy={y} r={3.5} fill="var(--bg)"
            stroke="var(--accent)" strokeWidth={2}
            initial={{ opacity: 0 }} animate={{ opacity: r > 0 ? 1 : 0 }}
            transition={{ delay: 1.0 + i * 0.08 }} />
        )
      })}
      {!hasData && (
        <text x={RADAR_CX} y={RADAR_CY + 4} textAnchor="middle"
          fill="var(--text-faint)" fontSize="10" fontFamily="'Space Mono', monospace">
          Aucune donnée
        </text>
      )}
    </svg>
  )
}

// ─── Activity heatmap ─────────────────────────────────────────

function ActivityHeatmap({ data }: { data: ReturnType<typeof useStats>['heatData'] }) {
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
        {data.map((d, i) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.018, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            title={`${d.label} — intensité: ${d.intensity}`}
            className="aspect-square rounded cursor-default"
            style={{
              background:   heatColor(d.intensity),
              outline:      d.isToday ? '2px solid var(--accent)' : 'none',
              outlineOffset: '1px',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>Moins</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <div key={lvl} className="w-3.5 h-3.5 rounded-sm" style={{ background: heatColor(lvl) }} />
        ))}
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>Plus</span>
      </div>
    </div>
  )
}

// ─── Weekly volume bar chart ──────────────────────────────────

const VW = 380; const VB = 100; const VMH = 80; const VBW = 32

function WeeklyVolumeChart({ data }: { data: { label: string; volume: number; isToday: boolean }[] }) {
  const maxVol = Math.max(...data.map((d) => d.volume), 1)
  const gap    = (VW - 7 * VBW) / 8

  return (
    <svg viewBox={`0 0 ${VW} 120`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={0} x2={VW} y1={VB - VMH * t} y2={VB - VMH * t}
          stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
      ))}
      <line x1={0} x2={VW} y1={VB} y2={VB} stroke="var(--border)" strokeWidth={1} />
      {data.map((d, i) => {
        const barH = (d.volume / maxVol) * VMH
        const bx   = gap + i * (VBW + gap)
        return (
          <g key={i}>
            <motion.rect x={bx} width={VBW} rx={4}
              fill={d.isToday ? 'url(#vBarGrad)' : '#ffaa0044'}
              initial={{ y: VB, height: 0 }}
              animate={{ y: VB - barH, height: Math.max(barH, 0) }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              style={d.isToday ? { filter: 'drop-shadow(0 0 6px #ffaa0088)' } : undefined}
            />
            {d.volume > 0 && (
              <motion.text x={bx + VBW / 2} y={VB - barH - 5} textAnchor="middle"
                fill={d.isToday ? '#ffaa00' : 'var(--text-faint)'} fontSize="7"
                fontFamily="'Space Mono', monospace"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 + 0.4 }}>
                {d.volume >= 1000 ? `${(d.volume / 1000).toFixed(1)}k` : d.volume}
              </motion.text>
            )}
            <text x={bx + VBW / 2} y={VB + 13} textAnchor="middle"
              fill={d.isToday ? '#fff' : 'var(--text-faint)'} fontSize="8"
              fontFamily="'Space Mono', monospace" fontWeight={d.isToday ? '700' : '400'}>
              {d.label}
            </text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="vBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="#ffaa00" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── 30-day history chart ─────────────────────────────────────

const H_W = 760; const H_H = 190
const H_PAD = { top: 20, right: 20, bottom: 34, left: 42 }
const H_PW = H_W - H_PAD.left - H_PAD.right
const H_PH = H_H - H_PAD.top - H_PAD.bottom
const Y_TICKS = [0, 25, 50, 75, 100]

function History30Chart({ data }: { data: DailyHistoryEntry[] }) {
  const pathRef  = useRef<SVGPathElement>(null)
  const [dashLen, setDashLen]   = useState(2400)
  const [hoveredIdx, setHovered] = useState<number | null>(null)

  const n = data.length

  const pts: [number, number][] = data.map((e, i) => [
    H_PAD.left + (n <= 1 ? H_PW / 2 : (i / (n - 1)) * H_PW),
    H_PAD.top + H_PH - (e.rate / 100) * H_PH,
  ])

  const linePath = n >= 2 ? smoothPath(pts) : (n === 1 ? `M${pts[0][0]},${pts[0][1]}` : '')
  const areaPath = n >= 2
    ? linePath + ` L${pts[n - 1][0]},${H_PAD.top + H_PH} L${pts[0][0]},${H_PAD.top + H_PH} Z`
    : ''

  useEffect(() => {
    if (pathRef.current) setDashLen(pathRef.current.getTotalLength())
  }, [linePath])

  // Show x-label every N points to avoid crowding
  const xStep = n <= 10 ? 1 : n <= 20 ? 2 : 5

  return (
    <svg
      viewBox={`0 0 ${H_W} ${H_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="h30AreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}    />
        </linearGradient>
      </defs>

      {/* Y-axis grid + labels */}
      {Y_TICKS.map((tick) => {
        const y = H_PAD.top + H_PH - (tick / 100) * H_PH
        return (
          <g key={tick}>
            <line
              x1={H_PAD.left} x2={H_W - H_PAD.right} y1={y} y2={y}
              stroke="var(--border)" strokeWidth={tick === 0 || tick === 100 ? 0.8 : 0.4}
              strokeDasharray={tick === 0 || tick === 100 ? 'none' : '3 3'}
            />
            <text
              x={H_PAD.left - 6} y={y + 3}
              textAnchor="end" fill="var(--text-faint)"
              fontSize="9" fontFamily="'Space Mono', monospace"
            >
              {tick}%
            </text>
          </g>
        )
      })}

      {/* Area fill */}
      {n >= 2 && <path d={areaPath} fill="url(#h30AreaGrad)" />}

      {/* Animated line */}
      {linePath && (
        <motion.path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashLen}
          initial={{ strokeDashoffset: dashLen }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{ filter: 'drop-shadow(0 0 4px var(--accent))' }}
        />
      )}

      {/* Data points + invisible hit areas */}
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x} cy={y} r={14}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
          <motion.circle
            cx={x} cy={y}
            r={hoveredIdx === i ? 5 : 3.5}
            fill="var(--bg)"
            stroke="var(--accent)"
            strokeWidth={hoveredIdx === i ? 2.5 : 2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 + i * 0.025, duration: 0.22 }}
            style={{ transition: 'r 0.1s ease, stroke-width 0.1s ease', pointerEvents: 'none' }}
          />
        </g>
      ))}

      {/* Tooltip */}
      {hoveredIdx !== null && (() => {
        const [x, y]  = pts[hoveredIdx]
        const entry   = data[hoveredIdx]
        const dateLbl = (() => {
          try { return format(parseISO(entry.date), 'd MMM yyyy', { locale: fr }) }
          catch { return entry.date }
        })()
        const tx = Math.min(Math.max(x, H_PAD.left + 52), H_W - H_PAD.right - 52)
        const ty = y - 44 < H_PAD.top ? y + 18 : y - 44
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={tx - 54} y={ty - 2} width={108} height={34} rx={7}
              fill="#1e1e1e" stroke="#333" strokeWidth={1} />
            <text x={tx} y={ty + 12}
              textAnchor="middle" fill="var(--text-muted)"
              fontSize="9" fontFamily="'Space Mono', monospace">
              {dateLbl}
            </text>
            <text x={tx} y={ty + 26}
              textAnchor="middle" fill="var(--accent)"
              fontSize="11" fontFamily="'Space Mono', monospace" fontWeight="700">
              {entry.rate}% ({entry.tasksCompleted}/{entry.tasksTotal})
            </text>
          </g>
        )
      })()}

      {/* X-axis date labels */}
      {pts.map(([x], i) => {
        if (i % xStep !== 0 && i !== n - 1) return null
        let lbl = data[i].date
        try { lbl = format(parseISO(data[i].date), 'd/MM', { locale: fr }) } catch { /* ok */ }
        return (
          <text key={i} x={x} y={H_H - 2}
            textAnchor="middle" fill="var(--text-faint)"
            fontSize="8" fontFamily="'Space Mono', monospace">
            {lbl}
          </text>
        )
      })}

      {/* Empty state */}
      {n === 0 && (
        <text x={H_W / 2} y={H_H / 2 + 4}
          textAnchor="middle" fill="var(--text-faint)"
          fontSize="11" fontFamily="'Space Mono', monospace">
          Aucun historique — les données s&apos;accumulent chaque jour
        </text>
      )}
    </svg>
  )
}

// ─── 30-day summary section ───────────────────────────────────

function History30DaysSection() {
  const dailyHistory = useAppStore((s) => s.dailyHistory)

  const sortedAsc = useMemo(
    () => [...dailyHistory].sort((a, b) => a.date.localeCompare(b.date)),
    [dailyHistory],
  )

  const { avgRate, bestDay, currentStreak } = useMemo(() => {
    if (dailyHistory.length === 0) return { avgRate: 0, bestDay: null, currentStreak: 0 }

    const avgRate = Math.round(
      dailyHistory.reduce((sum, e) => sum + e.rate, 0) / dailyHistory.length,
    )

    const bestDay = dailyHistory.reduce<DailyHistoryEntry | null>(
      (best, e) => (best === null || e.rate > best.rate ? e : best),
      null,
    )

    const sortedDesc = [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date))
    let currentStreak = 0
    for (const e of sortedDesc) {
      if (e.rate === 100) currentStreak++
      else break
    }

    return { avgRate, bestDay, currentStreak }
  }, [dailyHistory])

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'd MMM', { locale: fr }) } catch { return d }
  }

  const statCell = (label: string, main: string, sub?: string) => (
    <div style={{ flex: 1, padding: '16px 20px' }}>
      <div style={{
        fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--text-faint)', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>
        {main}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 5, fontFamily: 'monospace' }}>
          {sub}
        </div>
      )}
    </div>
  )

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      style={{ marginTop: 20 }}
    >
      <div className="card-title">
        Historique 30 jours
        {dailyHistory.length > 0 && (
          <span className="ml-2 font-normal" style={{ color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 'normal', fontSize: 11 }}>
            {dailyHistory.length} jour{dailyHistory.length > 1 ? 's' : ''} enregistré{dailyHistory.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'flex',
        background: 'var(--surface-2)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        {statCell(
          'Moyenne sur 30j',
          dailyHistory.length > 0 ? `${avgRate}%` : '—',
        )}
        <div style={{ width: 1, background: 'var(--border)' }} />
        {statCell(
          'Meilleur jour',
          bestDay ? fmtDate(bestDay.date) : '—',
          bestDay ? `${bestDay.rate}% (${bestDay.tasksCompleted}/${bestDay.tasksTotal} tâches)` : undefined,
        )}
        <div style={{ width: 1, background: 'var(--border)' }} />
        {statCell(
          'Série actuelle',
          currentStreak > 0 ? `${currentStreak} jour${currentStreak > 1 ? 's' : ''}` : 'Aucune',
          currentStreak > 0 ? '100% consécutifs' : undefined,
        )}
      </div>

      {/* Chart */}
      <History30Chart data={sortedAsc} />
    </motion.div>
  )
}

// ─── Badges ───────────────────────────────────────────────────

interface BadgeCtx {
  archivedCount:  number
  completedToday: number
  totalSessions:  number
  bestStreak:     number
}

const BADGE_DEFS: { id: string; emoji: string; name: string; desc: string; check: (s: BadgeCtx) => boolean }[] = [
  {
    id:    'first_task',
    emoji: '🎯',
    name:  'Première tâche',
    desc:  'Compléter sa première tâche',
    check: (s) => s.archivedCount > 0 || s.completedToday > 0,
  },
  {
    id:    'streak_3',
    emoji: '🔥',
    name:  '3 jours de suite',
    desc:  'Maintenir un streak de 3 jours',
    check: (s) => s.bestStreak >= 3,
  },
  {
    id:    'streak_7',
    emoji: '⚡',
    name:  'Semaine parfaite',
    desc:  '7 jours consécutifs de score ≥ 70',
    check: (s) => s.bestStreak >= 7,
  },
  {
    id:    'athlete',
    emoji: '💪',
    name:  'Athlète',
    desc:  "5 séances d'entraînement enregistrées",
    check: (s) => s.totalSessions >= 5,
  },
  {
    id:    'centurion',
    emoji: '🏆',
    name:  'Centurion',
    desc:  '100 tâches archivées au total',
    check: (s) => s.archivedCount >= 100,
  },
  {
    id:    'unstoppable',
    emoji: '🎖️',
    name:  'Unstoppable',
    desc:  'Streak record de 30 jours',
    check: (s) => s.bestStreak >= 30,
  },
]

function BadgesSection() {
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const tasks         = useAppStore((s) => s.tasks)
  const sessions      = useAppStore((s) => s.sessions)
  const bestStreak    = useAppStore((s) => s.bestStreak)

  const ctx: BadgeCtx = {
    archivedCount:  archivedTasks.length,
    completedToday: tasks.filter((t) => t.completed).length,
    totalSessions:  sessions.length,
    bestStreak,
  }

  const earned = BADGE_DEFS.filter((b) => b.check(ctx))
  const total  = BADGE_DEFS.length

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      style={{ marginTop: 20 }}
    >
      <div className="card-title flex items-center gap-3">
        Badges
        <span style={{
          fontSize: 11, fontWeight: 400, color: 'var(--accent)',
          fontFamily: 'monospace', letterSpacing: 'normal', textTransform: 'none',
        }}>
          {earned.length}/{total} débloqués
        </span>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {BADGE_DEFS.map((badge) => {
          const isEarned = badge.check(ctx)
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4 px-5 py-4 rounded-xl border"
              style={{
                background:   isEarned ? 'rgba(255,107,0,0.08)' : 'var(--surface-2)',
                borderColor:  isEarned ? 'rgba(255,107,0,0.3)'  : 'var(--border)',
                opacity:      isEarned ? 1 : 0.45,
                transition:   'all 0.2s ease',
              }}
            >
              <div style={{
                fontSize: 32,
                filter: isEarned ? 'none' : 'grayscale(1)',
                flexShrink: 0,
                lineHeight: 1,
              }}>
                {badge.emoji}
              </div>
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isEarned ? '#fff' : 'var(--text-muted)',
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                  {badge.desc}
                </div>
                {isEarned && (
                  <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace', marginTop: 4, fontWeight: 700 }}>
                    ✓ Débloqué
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── StatsTab ─────────────────────────────────────────────────

export function StatsTab() {
  const { tasksCompletedToday, activeGoals, workoutsThisWeek, lineData, heatData, radarRatios, weeklyVol } = useStats()
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })

  return (
    <div style={{ padding: '36px 40px 48px' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-bold" style={{ fontSize: 22, color: '#fff' }}>Stats</h1>
        <p className="text-sm capitalize mt-1" style={{ color: 'var(--text-muted)' }}>{today}</p>
      </div>

      {/* KPI row */}
      <div className="flex gap-5 mb-6">
        <KPICard label="Tâches aujourd'hui"    value={tasksCompletedToday} Icon={CheckSquare} accentColor="var(--accent)"      delay={0}    />
        <KPICard label="Objectifs actifs"       value={activeGoals}         Icon={Target}      accentColor="#c084fc"            delay={0.06} />
        <KPICard label="Séances cette semaine"  value={workoutsThisWeek}    Icon={Dumbbell}    accentColor="var(--accent-blue)" delay={0.12} />
      </div>

      {/* 2×2 chart grid */}
      <div className="grid grid-cols-2 gap-5">

        {/* Top-left: Completion line chart */}
        <div className="card">
          <div className="card-title">
            Tâches Complétées
            <span className="ml-2 font-normal" style={{ color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 'normal', fontSize: 11 }}>
              7 derniers jours
            </span>
          </div>
          <CompletionLineChart data={lineData} />
        </div>

        {/* Top-right: Radar chart */}
        <div className="card">
          <div className="card-title">
            Volume Musculaire
            <span className="ml-2 font-normal" style={{ color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 'normal', fontSize: 11 }}>
              all time
            </span>
          </div>
          <MuscleRadar ratios={radarRatios} />
        </div>

        {/* Bottom-left: Activity heatmap */}
        <div className="card">
          <div className="card-title">
            Activité
            <span className="ml-2 font-normal" style={{ color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 'normal', fontSize: 11 }}>
              30 derniers jours
            </span>
          </div>
          <ActivityHeatmap data={heatData} />
        </div>

        {/* Bottom-right: Weekly volume */}
        <div className="card">
          <div className="card-title">
            Volume Hebdomadaire
            <span className="ml-2 font-normal" style={{ color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 'normal', fontSize: 11 }}>
              (sets × reps × kg)
            </span>
          </div>
          <WeeklyVolumeChart data={weeklyVol} />
        </div>

      </div>

      {/* Full-width 30-day history */}
      <History30DaysSection />

      {/* Badges */}
      <BadgesSection />
    </div>
  )
}
