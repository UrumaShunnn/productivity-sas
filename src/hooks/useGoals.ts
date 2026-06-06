import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getGoals } from '../api/goals'

export function useGoals() {
  const goals    = useAppStore((s) => s.goals)
  const setGoals = useAppStore((s) => s.setGoals)
  const addGoal             = useAppStore((s) => s.addGoal)
  const updateGoalProgress  = useAppStore((s) => s.updateGoalProgress)
  const incrementGoalStreak = useAppStore((s) => s.incrementGoalStreak)
  const deleteGoal          = useAppStore((s) => s.deleteGoal)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (goals.length > 0) {
      setLoading(false)
      return
    }
    getGoals()
      .then(setGoals)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load goals'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { goals, loading, error, addGoal, updateGoalProgress, incrementGoalStreak, deleteGoal }
}
