import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './index.css'
import { Layout }             from './components/Layout'
import { DashboardTab }       from './components/tabs/DashboardTab'
import { TasksTab }           from './components/tabs/TasksTab'
import { GoalsTab }           from './components/tabs/GoalsTab'
import { FinanceTab }         from './components/tabs/FinanceTab'
import { TrainingTab }        from './components/tabs/TrainingTab'
import { StatsTab }           from './components/tabs/StatsTab'
import { WelcomeOnboarding }  from './components/WelcomeOnboarding'
import { BackgroundEffects }  from './components/BackgroundEffects'
import { LoginPage }          from './pages/LoginPage'
import { RegisterPage }       from './pages/RegisterPage'
import { useAppStore, applyAccentColor } from './store/useAppStore'
import { useAuthStore }       from './store/useAuthStore'
import { getMe }              from './api/auth'

// ─── Tab content ──────────────────────────────────────────────

function PageContent() {
  const activeTab = useAppStore((s) => s.activeTab)
  if (activeTab === 'dashboard') return <DashboardTab />
  if (activeTab === 'tasks')     return <TasksTab />
  if (activeTab === 'goals')     return <GoalsTab />
  if (activeTab === 'finance')   return <FinanceTab />
  if (activeTab === 'workout')   return <TrainingTab />
  if (activeTab === 'stats')     return <StatsTab />
  return null
}

// ─── Intro splash ─────────────────────────────────────────────

function IntroSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 820)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--bg)', zIndex: 9999 }}
    >
      <motion.div
        initial={{ scale: 0.78, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <span
          className="font-mono text-7xl font-bold tracking-tighter glow-text-green select-none"
          style={{ color: 'var(--accent)' }}
        >
          ZENITH
        </span>
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-xs font-mono uppercase tracking-[0.3em]"
          style={{ color: 'var(--text-faint)' }}
        >
          productivity suite
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

// ─── Verification screen ──────────────────────────────────────

function VerifyingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--bg)', zIndex: 9999 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: 28, height: 28,
            border: '2px solid #2a2a2a',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555', letterSpacing: '0.1em' }}>
          Vérification…
        </span>
      </div>
    </motion.div>
  )
}

// ─── Root ─────────────────────────────────────────────────────

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authLogout      = useAuthStore((s) => s.logout)

  const [authPage,   setAuthPage]   = useState<'login' | 'register'>('login')
  const [verifying,  setVerifying]  = useState(isAuthenticated) // only verify if we have stored tokens
  const [ready,      setReady]      = useState(false)

  const onboardingDone   = useAppStore((s) => s.onboardingDone)
  const backgroundPreset = useAppStore((s) => s.backgroundPreset)
  const accentColor      = useAppStore((s) => s.accentColor)

  // Listen for background auth failures (token refresh failed during API calls)
  useEffect(() => {
    const handler = () => authLogout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [authLogout])

  // Verify stored token is still valid on app load
  useEffect(() => {
    if (!isAuthenticated) return
    getMe()
      .then(({ user }) => useAuthStore.getState().setUser(user))
      .catch(() => authLogout())
      .finally(() => setVerifying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply accent color + run daily reset once authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    const { accentColor: saved, performDailyReset: reset } = useAppStore.getState()
    applyAccentColor(saved)
    reset()
  }, [isAuthenticated])

  useEffect(() => {
    applyAccentColor(accentColor)
  }, [accentColor])

  useEffect(() => {
    document.body.dataset.preset = backgroundPreset
  }, [backgroundPreset])

  // ── Auth guard ──
  if (verifying) {
    return (
      <>
        <BackgroundEffects />
        <AnimatePresence><VerifyingScreen /></AnimatePresence>
      </>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <BackgroundEffects />
        <AnimatePresence mode="wait">
          {authPage === 'login' ? (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoginPage onNavigate={() => setAuthPage('register')} />
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RegisterPage onNavigate={() => setAuthPage('login')} />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── Authenticated app ──
  return (
    <>
      <BackgroundEffects />

      <AnimatePresence>
        {!onboardingDone && (
          <WelcomeOnboarding key="onboarding" onDone={() => setReady(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {onboardingDone && !ready && (
          <IntroSplash key="intro" onDone={() => setReady(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ready && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            style={{ height: '100svh' }}
          >
            <Layout>
              <PageContent />
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
