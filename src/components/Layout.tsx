import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Euro,
  Dumbbell,
  BarChart2,
  Minimize2,
  Crosshair,
  Minus,
  Maximize2,
  X,
  Settings,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { SettingsModal } from './SettingsModal'
import type { ActiveTab } from '../types'

// ─── Electron helpers ────────────────────────────────────────

const isElectron = typeof window !== 'undefined' && !!window.electron

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const drag    = isElectron ? ({ WebkitAppRegion: 'drag' }    as any) : {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noDrag  = isElectron ? ({ WebkitAppRegion: 'no-drag' } as any) : {}

function WindowControls() {
  if (!isElectron) return null
  const btn = (onClick: () => void, hoverColor: string, children: React.ReactNode) => (
    <button
      onClick={onClick}
      style={{
        ...noDrag,
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', borderRadius: 6,
        color: '#555', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverColor; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none';     e.currentTarget.style.color = '#555' }}
    >
      {children}
    </button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8, ...noDrag }}>
      {btn(() => window.electron!.minimize(), 'rgba(255,255,255,0.1)', <Minus size={12}    />)}
      {btn(() => window.electron!.maximize(), 'rgba(255,255,255,0.1)', <Maximize2 size={11} />)}
      {btn(() => window.electron!.close(),    'rgba(239,68,68,0.7)',   <X size={12}         />)}
    </div>
  )
}

// ─── Nav items ────────────────────────────────────────────────

interface NavItem {
  tab: ActiveTab
  label: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  shortcut: string
}

const NAV: NavItem[] = [
  { tab: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, shortcut: 'D' },
  { tab: 'tasks',     label: 'Tasks',     Icon: CheckSquare,     shortcut: 'T' },
  { tab: 'goals',     label: 'Objectifs', Icon: Target,          shortcut: 'G' },
  { tab: 'finance',   label: 'Finance',   Icon: Euro,            shortcut: 'E' },
  { tab: 'workout',   label: 'Training',  Icon: Dumbbell,        shortcut: 'W' },
  { tab: 'stats',     label: 'Stats',     Icon: BarChart2,       shortcut: 'S' },
]

// ─── Clock ────────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, '0') }

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const dateStr = useMemo(
    () => now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now.toDateString()],
  )

  return (
    <div className="text-right shrink-0">
      <div
        className="font-mono font-bold tabular-nums glow-text-green leading-none"
        style={{ fontSize: 18, color: '#ffffff' }}
      >
        {timeStr}
      </div>
      <div className="mt-0.5 capitalize font-mono" style={{ fontSize: 12, color: '#888' }}>
        {dateStr}
      </div>
    </div>
  )
}

// ─── Tab slide direction ──────────────────────────────────────

const TAB_ORDER: ActiveTab[] = ['dashboard', 'tasks', 'goals', 'finance', 'workout', 'stats']

// ─── Layout ───────────────────────────────────────────────────

const NAV_H = 52

const contentVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir * 36, y: 0 }),
  center: { opacity: 1, x: 0, y: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir * -36, y: 0 }),
}

export function Layout({ children }: { children: React.ReactNode }) {
  const activeTab       = useAppStore((s) => s.activeTab)
  const setActiveTab    = useAppStore((s) => s.setActiveTab)
  const focusMode       = useAppStore((s) => s.focusMode)
  const toggleFocusMode = useAppStore((s) => s.toggleFocusMode)
  const [showSettings, setShowSettings] = useState(false)
  const [slideDir, setSlideDir]         = useState(1)
  const prevTabRef                      = useRef<ActiveTab>(activeTab)

  useEffect(() => {
    const prevIdx = TAB_ORDER.indexOf(prevTabRef.current)
    const newIdx  = TAB_ORDER.indexOf(activeTab)
    setSlideDir(newIdx >= prevIdx ? 1 : -1)
    prevTabRef.current = activeTab
  }, [activeTab])

  useKeyboardShortcuts()

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Top Nav ── */}
      <AnimatePresence initial={false}>
        {!focusMode && (
          <motion.header
            key="topnav"
            initial={{ y: -NAV_H, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -NAV_H, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 flex items-center border-b shrink-0"
            style={{
              ...drag,
              height: NAV_H,
              background: 'rgba(15,15,15,0.92)',
              backdropFilter: 'blur(16px)',
              borderColor: 'var(--border)',
              zIndex: 50,
              paddingInline: '40px',
              gap: '24px',
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0 mr-4">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at center, var(--accent-33) 0%, transparent 70%)' }}
                />
                <span
                  className="relative font-mono tracking-tighter glow-text-green px-1"
                  style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)' }}
                >
                  ZENITH
                </span>
              </div>
              <span className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                v1.0
              </span>
            </div>

            {/* Center tabs */}
            <nav className="flex-1 flex items-center justify-center gap-1" style={noDrag}>
              {NAV.map(({ tab, label, Icon }) => {
                const isActive = activeTab === tab
                return (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex items-center gap-2 cursor-pointer transition-all duration-150"
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: '0.3px',
                      padding: '10px 20px',
                      borderRadius: 8,
                      color:      isActive ? '#ffffff' : '#888888',
                      background: isActive ? 'var(--accent)' : 'transparent',
                      border:     'none',
                      boxShadow:  isActive ? 'var(--glow-green)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#ffffff'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#888888'
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{label}</span>
                  </motion.button>
                )
              })}
            </nav>

            {/* Right: Clock + Focus Mode + Window controls */}
            <div className="flex items-center gap-5 shrink-0" style={noDrag}>
              <Clock />
              <motion.button
                onClick={toggleFocusMode}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 font-mono cursor-pointer transition-all duration-150"
                style={{
                  fontSize: 13,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #333',
                  ...(focusMode
                    ? { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' }
                    : { color: '#888', background: 'transparent' }),
                }}
                title="Focus Mode (F)"
              >
                {focusMode ? <Minimize2 size={13} /> : <Crosshair size={13} />}
                {focusMode ? 'Exit' : 'Focus'}
              </motion.button>

              <motion.button
                onClick={() => setShowSettings(true)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34,
                  borderRadius: 8,
                  border: '1px solid #333',
                  background: 'transparent',
                  color: '#888',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.background = 'var(--accent-dim)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#888'
                  e.currentTarget.style.borderColor = '#333'
                  e.currentTarget.style.background = 'transparent'
                }}
                title="Paramètres"
              >
                <Settings size={14} />
              </motion.button>

              <WindowControls />
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Focus mode exit button */}
      <AnimatePresence>
        {focusMode && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={toggleFocusMode}
            className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border cursor-pointer"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-08)' }}
          >
            <Minimize2 size={11} />
            Exit Focus
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <main
        className="flex-1 overflow-hidden relative"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <AnimatePresence mode="wait" initial={false} custom={slideDir}>
          <motion.div
            key={activeTab}
            custom={slideDir}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 overflow-y-auto"
            style={{ top: NAV_H }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Settings modal ── */}
      <AnimatePresence>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  )
}
