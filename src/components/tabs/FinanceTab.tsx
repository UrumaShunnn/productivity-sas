import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, TrendingUp, TrendingDown, Minus as MinusIcon } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '../../store/useAppStore'
import type { Sale } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function monthStr(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

function fmtEur(n: number, decimals = 2) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtDateLabel(dateStr: string) {
  try {
    const label = format(parseISO(dateStr), 'EEEE d MMMM', { locale: fr })
    return label.charAt(0).toUpperCase() + label.slice(1)
  } catch {
    return dateStr
  }
}

// ─── Source Badge ─────────────────────────────────────────────

function SourceBadge({ source }: { source: Sale['source'] }) {
  const cfg = source === 'Vinted'
    ? { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' }
    : { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' }
  return (
    <span
      className="shrink-0 font-mono font-bold rounded"
      style={{ fontSize: 10, color: cfg.color, background: cfg.bg, padding: '3px 7px' }}
    >
      {source}
    </span>
  )
}

// ─── Goal Ring ────────────────────────────────────────────────

const GOAL_RING_R = 22
const GOAL_RING_C = 2 * Math.PI * GOAL_RING_R

function GoalRing({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const dash = GOAL_RING_C * (clamped / 100)
  const gap  = GOAL_RING_C - dash
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={GOAL_RING_R} fill="none" stroke="#2a2a2a" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={GOAL_RING_R}
          fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  )
}

// ─── Revenue Bar Chart ────────────────────────────────────────

const CHART_W    = 900
const CHART_H    = 180
const PAD_TOP    = 28
const PAD_RIGHT  = 40
const PAD_BOTTOM = 36
const PAD_LEFT   = 8
const INNER_W    = CHART_W - PAD_LEFT - PAD_RIGHT
const INNER_H    = CHART_H - PAD_TOP - PAD_BOTTOM
const DAYS       = 30

function RevenueChart({ sales }: { sales: Sale[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const days = useMemo(() => {
    const arr: { date: string; label: string; total: number }[] = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d       = subDays(new Date(), i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const total   = sales.filter((s) => s.date === dateStr).reduce((sum, s) => sum + s.amount, 0)
      arr.push({ date: dateStr, label: format(d, 'd MMM', { locale: fr }), total })
    }
    return arr
  }, [sales])

  const maxVal = Math.max(...days.map((d) => d.total), 1)
  const avgVal = days.reduce((sum, d) => sum + d.total, 0) / DAYS
  const bestIdx = days.reduce((best, d, i) => (d.total > days[best].total ? i : best), 0)

  const slotW = INNER_W / DAYS
  const barW  = Math.max(slotW * 0.62, 4)

  const yFor = (val: number) => PAD_TOP + INNER_H - (val / maxVal) * INNER_H
  const avgY = yFor(avgVal)

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, border: '1px solid #222' }}>
      <div className="card-title">Revenus des 30 derniers jours</div>

      <div style={{ position: 'relative' }} onMouseLeave={() => setHovered(null)}>
        <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: 'block', overflow: 'visible' }}>
          {/* Average dashed line */}
          {avgVal > 0 && (
            <>
              <line
                x1={PAD_LEFT} y1={avgY}
                x2={CHART_W - PAD_RIGHT} y2={avgY}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="6 4"
              />
              <text
                x={CHART_W - PAD_RIGHT + 6} y={avgY + 4}
                fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="monospace"
              >
                moy
              </text>
            </>
          )}

          {/* Bars */}
          {days.map((d, i) => {
            const barH  = d.total === 0 ? 2 : Math.max(4, (d.total / maxVal) * INNER_H)
            const x     = PAD_LEFT + i * slotW + (slotW - barW) / 2
            const y     = PAD_TOP + INNER_H - barH
            const isBest = i === bestIdx && d.total > 0
            const isHov  = hovered === i

            return (
              <g key={d.date}>
                {/* Invisible wide hit area */}
                <rect
                  x={PAD_LEFT + i * slotW} y={PAD_TOP}
                  width={slotW} height={INNER_H}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                />
                {/* Bar */}
                <rect
                  x={x} y={y} width={barW} height={barH} rx="3"
                  fill={
                    isBest   ? '#ffaa00' :
                    isHov    ? '#ff8c44' :
                    d.total === 0 ? '#252525' :
                    'var(--accent)'
                  }
                  style={{ transition: 'fill 0.12s ease' }}
                />
                {/* Amount above hovered bar */}
                {isHov && d.total > 0 && (
                  <text
                    x={x + barW / 2} y={y - 7}
                    textAnchor="middle" fill="#fff"
                    fontSize="11" fontFamily="monospace" fontWeight="700"
                  >
                    {fmtEur(d.total, 0)}€
                  </text>
                )}
              </g>
            )
          })}

          {/* X axis labels every 5 days + last day */}
          {days.map((d, i) => {
            if (i % 5 !== 0 && i !== DAYS - 1) return null
            return (
              <text
                key={d.date}
                x={PAD_LEFT + i * slotW + slotW / 2}
                y={CHART_H - 6}
                textAnchor="middle"
                fill="#444" fontSize="10" fontFamily="monospace"
              >
                {d.label}
              </text>
            )
          })}
        </svg>

        {/* Floating tooltip */}
        {hovered !== null && days[hovered].total > 0 && (
          <div style={{
            position: 'absolute', top: 0,
            left: `${((hovered + 0.5) / DAYS) * 100}%`,
            transform: 'translateX(-50%)',
            background: '#111', border: '1px solid #333',
            borderRadius: 8, padding: '6px 12px',
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
          }}>
            <div style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', marginBottom: 2 }}>
              {days[hovered].date === todayStr() ? "Aujourd'hui" : fmtDateLabel(days[hovered].date)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>
              {fmtEur(days[hovered].total)}€
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
        {[
          { dot: 'var(--accent)', label: 'Revenus' },
          { dot: '#ffaa00', label: 'Meilleur jour' },
        ].map(({ dot, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: dot }} />
            <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>Moyenne / jour</span>
        </div>
      </div>
    </div>
  )
}

// ─── Add Sale Form ────────────────────────────────────────────

function AddSaleForm() {
  const addSale = useAppStore((s) => s.addSale)
  const [amount, setAmount]   = useState('')
  const [source, setSource]   = useState<Sale['source']>('Vinted')
  const [description, setDesc] = useState('')
  const [date, setDate]       = useState(todayStr())
  const [focused, setFocused] = useState<string | null>(null)

  const canSubmit = !!amount && parseFloat(amount) > 0

  const submit = () => {
    if (!canSubmit) return
    addSale({ amount: parseFloat(amount), source, description: description.trim(), date })
    setAmount('')
    setDesc('')
    setDate(todayStr())
  }

  const fieldStyle = (key: string): React.CSSProperties => ({
    background: '#141414',
    border: `1px solid ${focused === key ? 'var(--accent)' : '#2a2a2a'}`,
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    padding: '0 12px',
    height: 40,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: focused === key ? '0 0 0 1px rgba(255,107,0,0.15)' : 'none',
  })

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, border: '1px solid #222', marginBottom: 20 }}>
      <div className="card-title">Ajouter une vente</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Amount + source */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="number" placeholder="Montant"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              onFocus={() => setFocused('amount')} onBlur={() => setFocused(null)}
              step="0.01" min="0"
              style={{ ...fieldStyle('amount'), paddingRight: 28 }}
            />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#555', fontFamily: 'monospace', fontSize: 14 }}>€</span>
          </div>
          <select
            value={source} onChange={(e) => setSource(e.target.value as Sale['source'])}
            onFocus={() => setFocused('source')} onBlur={() => setFocused(null)}
            style={{ ...fieldStyle('source'), width: 120, cursor: 'pointer' }}
          >
            <option value="Vinted">Vinted</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        {/* Description + date */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text" placeholder="Description (optionnel)"
            value={description} onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            onFocus={() => setFocused('desc')} onBlur={() => setFocused(null)}
            style={{ ...fieldStyle('desc'), flex: 1 }}
          />
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            onFocus={() => setFocused('date')} onBlur={() => setFocused(null)}
            style={{ ...fieldStyle('date'), width: 152, colorScheme: 'dark' }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={submit} disabled={!canSubmit}
          style={{
            height: 44, background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.background = '#e55f00' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Ajouter une vente
        </button>
      </div>
    </div>
  )
}

// ─── Sale Row ─────────────────────────────────────────────────

function SaleRow({ sale, onDelete }: { sale: Sale; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: '#141414', borderRadius: 10,
        border: `1px solid ${hovered ? 'rgba(255,107,0,0.2)' : '#1e1e1e'}`,
        transition: 'border-color 0.15s',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: 'var(--accent)', flexShrink: 0 }}>
        +{fmtEur(sale.amount)}€
      </span>
      <SourceBadge source={sale.source} />
      {sale.description ? (
        <span style={{ flex: 1, fontSize: 13, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sale.description}
        </span>
      ) : (
        <div style={{ flex: 1 }} />
      )}
      <motion.button
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        onClick={onDelete}
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          padding: 4, cursor: 'pointer', color: 'var(--text-faint)',
          display: 'flex', alignItems: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)' }}
      >
        <Trash2 size={13} />
      </motion.button>
    </motion.div>
  )
}

// ─── Sales List ───────────────────────────────────────────────

function SalesList({ sales }: { sales: Sale[] }) {
  const deleteSale = useAppStore((s) => s.deleteSale)

  const grouped = useMemo(() => {
    const map: Record<string, Sale[]> = {}
    for (const s of sales) { (map[s.date] ??= []).push(s) }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [sales])

  if (sales.length === 0) {
    return (
      <div
        className="font-mono text-center py-12"
        style={{ fontSize: 13, color: 'var(--text-faint)', border: '1px dashed #222', borderRadius: 12 }}
      >
        Aucune vente — ajoutez-en une ci-dessus.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {grouped.map(([date, dateSales]) => {
        const dayTotal = dateSales.reduce((sum, s) => sum + s.amount, 0)
        const isToday  = date === todayStr()
        return (
          <div key={date}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #1e1e1e',
            }}>
              <span style={{
                fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                color: isToday ? 'var(--accent)' : '#555',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {isToday ? "Aujourd'hui" : fmtDateLabel(date)}
              </span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
                {fmtEur(dayTotal)}€
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <AnimatePresence initial={false}>
                {dateSales.map((sale) => (
                  <SaleRow key={sale.id} sale={sale} onDelete={() => deleteSale(sale.id)} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Monthly Goal Card ────────────────────────────────────────

function MonthlyGoalCard() {
  const monthlyGoal    = useAppStore((s) => s.monthlyGoal)
  const setMonthlyGoal = useAppStore((s) => s.setMonthlyGoal)
  const [input, setInput] = useState(monthlyGoal > 0 ? String(monthlyGoal) : '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    const val = parseFloat(input)
    if (!val || val <= 0) return
    setMonthlyGoal(val)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, border: '1px solid #222' }}>
      <div className="card-title">Objectif mensuel</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="number" value={input} placeholder="Ex : 2000"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            step="50" min="0"
            style={{
              width: '100%', height: 40,
              background: '#141414', color: '#fff',
              border: '1px solid #2a2a2a', borderRadius: 8,
              fontSize: 14, padding: '0 32px 0 12px', outline: 'none',
            }}
          />
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            color: '#555', fontFamily: 'monospace', fontSize: 14, pointerEvents: 'none',
          }}>€</span>
        </div>
        <button
          onClick={save}
          style={{
            height: 40, padding: '0 16px', flexShrink: 0,
            background: saved ? '#22c55e' : 'var(--accent)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Enregistré' : 'Enregistrer'}
        </button>
      </div>
      {monthlyGoal > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#444', fontFamily: 'monospace' }}>
          Objectif actuel : {fmtEur(monthlyGoal, 0)}€ / mois
        </div>
      )}
    </div>
  )
}

// ─── Month Comparison ─────────────────────────────────────────

function MonthComparison({ sales }: { sales: Sale[] }) {
  const current  = useMemo(
    () => sales.filter((s) => s.date.startsWith(monthStr(0))).reduce((sum, s) => sum + s.amount, 0),
    [sales],
  )
  const previous = useMemo(
    () => sales.filter((s) => s.date.startsWith(monthStr(-1))).reduce((sum, s) => sum + s.amount, 0),
    [sales],
  )

  const diff = current - previous
  const pct  = previous > 0 ? Math.abs(diff / previous) * 100 : null
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : MinusIcon
  const trendColor = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#888'

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 24, border: '1px solid #222' }}>
      <div className="card-title">Ce mois vs mois dernier</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Ce mois
          </div>
          <motion.div
            key={current}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', lineHeight: 1 }}
          >
            {fmtEur(current, 0)}<span style={{ fontSize: 16, marginLeft: 2 }}>€</span>
          </motion.div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mois dernier
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#666', fontFamily: 'monospace', lineHeight: 1 }}>
            {fmtEur(previous, 0)}<span style={{ fontSize: 16, marginLeft: 2 }}>€</span>
          </div>
        </div>
      </div>
      <div style={{
        paddingTop: 14, borderTop: '1px solid #222',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <TrendIcon size={16} style={{ color: trendColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: trendColor }}>
          {diff >= 0 ? '+' : ''}{fmtEur(diff, 0)}€
          {pct != null && ` (${Math.round(pct)}%)`}
        </span>
        <span style={{ fontSize: 12, color: '#444' }}>vs mois précédent</span>
      </div>
    </div>
  )
}

// ─── FinanceTab ───────────────────────────────────────────────

export function FinanceTab() {
  const sales       = useAppStore((s) => s.sales)
  const monthlyGoal = useAppStore((s) => s.monthlyGoal)

  const todaySales     = useMemo(() => sales.filter((s) => s.date === todayStr()), [sales])
  const todayRevenue   = useMemo(() => todaySales.reduce((sum, s) => sum + s.amount, 0), [todaySales])
  const monthlyRevenue = useMemo(
    () => sales.filter((s) => s.date.startsWith(monthStr(0))).reduce((sum, s) => sum + s.amount, 0),
    [sales],
  )
  const goalPct = monthlyGoal > 0 ? (monthlyRevenue / monthlyGoal) * 100 : 0

  const cardBase: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid #222',
    borderRadius: 16,
    padding: 28,
  }

  return (
    <div style={{ padding: '32px 40px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Finance</h1>
        <p style={{ fontSize: 16, color: '#888', marginTop: 6 }}>Suivi de tes revenus</p>
        <div style={{ marginTop: 20, height: 1, background: 'linear-gradient(90deg, rgba(255,107,0,0.6) 0%, rgba(255,107,0,0.08) 60%, transparent 100%)' }} />
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>

        {/* Card 1 — Today */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={cardBase}
        >
          <div className="card-title">Revenus du jour</div>
          <div style={{ fontSize: 52, fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent)', lineHeight: 1, letterSpacing: '-2px' }}>
            {fmtEur(todayRevenue, 0)}
            <span style={{ fontSize: 26, marginLeft: 4 }}>€</span>
          </div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', marginTop: 10 }}>
            {todaySales.length} vente{todaySales.length !== 1 ? 's' : ''} aujourd&apos;hui
          </div>
        </motion.div>

        {/* Card 2 — Monthly */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={cardBase}
        >
          <div className="card-title">Revenus du mois</div>
          <div style={{ fontSize: 44, fontWeight: 800, fontFamily: 'monospace', color: '#fff', lineHeight: 1, letterSpacing: '-1px', marginBottom: 16 }}>
            {fmtEur(monthlyRevenue, 0)}<span style={{ fontSize: 22, marginLeft: 3 }}>€</span>
          </div>
          {monthlyGoal > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>
                  Objectif : {fmtEur(monthlyGoal, 0)}€
                </span>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>
                  {Math.min(100, Math.round(goalPct))}%
                </span>
              </div>
              <div style={{ height: 5, background: '#2a2a2a', borderRadius: 9999, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), #ffaa00)', borderRadius: 9999 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, goalPct)}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#333', fontFamily: 'monospace' }}>
              Définis un objectif →
            </div>
          )}
        </motion.div>

        {/* Card 3 — Goal % */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={cardBase}
        >
          <div className="card-title">Objectif mensuel</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <GoalRing pct={goalPct} />
            <div>
              {monthlyGoal > 0 ? (
                <>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'monospace', color: '#fff', lineHeight: 1 }}>
                    {Math.round(goalPct)}<span style={{ fontSize: 18 }}>%</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', marginTop: 5 }}>
                    {monthlyRevenue >= monthlyGoal
                      ? '✓ Objectif atteint !'
                      : `${fmtEur(monthlyGoal - monthlyRevenue, 0)}€ restants`}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#333', fontFamily: 'monospace' }}>
                  Aucun objectif défini
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Middle: 2 columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 24, marginBottom: 32 }}>
        {/* Left: form + list */}
        <div>
          <AddSaleForm />
          <SalesList sales={sales} />
        </div>

        {/* Right: goal setter + comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MonthlyGoalCard />
          <MonthComparison sales={sales} />
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <RevenueChart sales={sales} />
    </div>
  )
}
