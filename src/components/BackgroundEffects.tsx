import { useRef, useEffect, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

// ── Default orbs ──────────────────────────────────────────────

function DefaultBackground() {
  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden" style={{ zIndex: -1, pointerEvents: 'none' }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
      <div className="orb orb-5" />
    </div>
  )
}

// ── Matrix ────────────────────────────────────────────────────
// 100 columns every ~1vw, bright green with glow, 1.5–3 s fall speed

const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ0123456789'

const MATRIX_CSS = `
@keyframes mfall {
  0%   { transform: translateY(-110vh); opacity: 0; }
  7%   { opacity: 1; }
  88%  { opacity: 1; }
  100% { transform: translateY(110vh);  opacity: 0; }
}
`

function MatrixBackground() {
  const N_COLS  = 100
  const N_CHARS = 22

  const cols = useMemo(
    () =>
      Array.from({ length: N_COLS }, (_, i) => ({
        id:    i,
        left:  `${i}%`,
        chars: Array.from({ length: N_CHARS }, () => KANA[Math.floor(Math.random() * KANA.length)]),
        dur:   `${(1.5 + Math.random() * 1.5).toFixed(2)}s`,
        delay: `${-(Math.random() * 4).toFixed(2)}s`,
      })),
    [],
  )

  return (
    <>
      <style>{MATRIX_CSS}</style>

      {/* Dark readability overlay — sits between matrix and app content */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.42)',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />

      {/* Matrix rain columns */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          overflow: 'hidden',
          zIndex: -1,
          pointerEvents: 'none',
          background: '#000',
        }}
      >
        {cols.map((col) => (
          <div
            key={col.id}
            style={{
              position: 'absolute',
              left: col.left,
              top: 0,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'monospace',
              fontSize: 14,
              lineHeight: '18px',
              animation: `mfall ${col.dur} ${col.delay} linear infinite`,
              willChange: 'transform',
            }}
          >
            {col.chars.map((c, j) => {
              const isHead = j === N_CHARS - 1
              const alpha  = isHead ? 1 : 0.15 + (j / (N_CHARS - 1)) * 0.65
              return (
                <span
                  key={j}
                  style={{
                    color:      isHead ? '#ccffcc' : '#00ff41',
                    opacity:    alpha,
                    textShadow: isHead
                      ? '0 0 12px #fff, 0 0 6px #00ff41'
                      : `0 0 ${4 + j * 0.3}px #00ff41`,
                  }}
                >
                  {c}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Particles ─────────────────────────────────────────────────
// 70 canvas-animated dots + connecting lines between nearby pairs

interface Dot {
  x: number; y: number
  vx: number; vy: number
  size: number
}

function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const dotsRef   = useRef<Dot[]>([])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!

    function spawn() {
      dotsRef.current = Array.from({ length: 70 }, () => ({
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height,
        vx:   (Math.random() - 0.5) * 0.7,
        vy:   (Math.random() - 0.5) * 0.7,
        size: 2 + Math.random() * 2,
      }))
    }

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      spawn()
    }
    resize()
    window.addEventListener('resize', resize)

    const LINK_DIST = 180

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dots = dotsRef.current

      // Move & bounce
      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0)             { d.x = 0;             d.vx = Math.abs(d.vx) }
        if (d.x > canvas.width)  { d.x = canvas.width;  d.vx = -Math.abs(d.vx) }
        if (d.y < 0)             { d.y = 0;             d.vy = Math.abs(d.vy) }
        if (d.y > canvas.height) { d.y = canvas.height; d.vy = -Math.abs(d.vy) }
      }

      // Connecting lines
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx   = dots[i].x - dots[j].x
          const dy   = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.5
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255,221,187,${alpha.toFixed(3)})`
            ctx.lineWidth   = 0.7
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.stroke()
          }
        }
      }

      // Dots with glow
      ctx.shadowBlur  = 10
      ctx.shadowColor = '#ffddbb'
      for (const d of dots) {
        ctx.beginPath()
        ctx.fillStyle = 'rgba(255,221,187,0.8)'
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      frameRef.current = requestAnimationFrame(frame)
    }

    frame()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  )
}

// ── Gradient / Aurora ─────────────────────────────────────────
// 4 large radial blobs — deep orange, amber, purple, dark red

const AURORA_CSS = `
@keyframes aurora-1 { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(10%,8%)  scale(1.18)} }
@keyframes aurora-2 { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(-8%,-10%) scale(0.84)} }
@keyframes aurora-3 { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(7%,-9%)  scale(1.12)} }
@keyframes aurora-4 { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(-7%,9%)  scale(0.90)} }
`

function GradientBackground() {
  return (
    <>
      <style>{AURORA_CSS}</style>
      <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: -1, pointerEvents: 'none' }}>
        {/* Deep orange — top-left */}
        <div style={{
          position: 'absolute', width: '110%', height: '110%', top: '-30%', left: '-20%',
          background: 'radial-gradient(ellipse, rgba(100,28,0,0.14) 0%, transparent 55%)',
          filter: 'blur(80px)',
          animation: 'aurora-1 8s ease-in-out infinite',
        }} />
        {/* Amber — bottom-right */}
        <div style={{
          position: 'absolute', width: '90%', height: '90%', bottom: '-30%', right: '-20%',
          background: 'radial-gradient(ellipse, rgba(90,45,0,0.13) 0%, transparent 50%)',
          filter: 'blur(90px)',
          animation: 'aurora-2 8s ease-in-out infinite',
        }} />
        {/* Purple — centre */}
        <div style={{
          position: 'absolute', width: '80%', height: '80%', top: '20%', left: '20%',
          background: 'radial-gradient(ellipse, rgba(35,0,60,0.13) 0%, transparent 55%)',
          filter: 'blur(75px)',
          animation: 'aurora-3 8s ease-in-out infinite',
        }} />
        {/* Dark crimson — bottom-left */}
        <div style={{
          position: 'absolute', width: '75%', height: '75%', bottom: '5%', left: '10%',
          background: 'radial-gradient(ellipse, rgba(70,8,0,0.11) 0%, transparent 55%)',
          filter: 'blur(85px)',
          animation: 'aurora-4 8s ease-in-out infinite',
        }} />
      </div>
    </>
  )
}

// ── Export ────────────────────────────────────────────────────

export function BackgroundEffects() {
  const preset = useAppStore((s) => s.backgroundPreset)
  if (preset === 'minimal')   return null
  if (preset === 'matrix')    return <MatrixBackground />
  if (preset === 'particles') return <ParticlesBackground />
  if (preset === 'gradient')  return <GradientBackground />
  return <DefaultBackground />
}
