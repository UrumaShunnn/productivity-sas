import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getSessions } from '../api/training'

export function useTraining() {
  const sessions    = useAppStore((s) => s.sessions)
  const setSessions = useAppStore((s) => s.setSessions)
  const addSession           = useAppStore((s) => s.addSession)
  const addExerciseToSession = useAppStore((s) => s.addExerciseToSession)
  const toggleExerciseDone   = useAppStore((s) => s.toggleExerciseDone)
  const markExercisePR       = useAppStore((s) => s.markExercisePR)
  const deleteSession        = useAppStore((s) => s.deleteSession)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (sessions.length > 0) {
      setLoading(false)
      return
    }
    getSessions()
      .then(setSessions)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load sessions'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    sessions, loading, error,
    addSession, addExerciseToSession, toggleExerciseDone, markExercisePR, deleteSession,
  }
}
