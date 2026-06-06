import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getTasks } from '../api/tasks'

export function useTasks() {
  const tasks   = useAppStore((s) => s.tasks)
  const setTasks = useAppStore((s) => s.setTasks)
  const addTask     = useAppStore((s) => s.addTask)
  const toggleTask  = useAppStore((s) => s.toggleTask)
  const deleteTask  = useAppStore((s) => s.deleteTask)
  const updateTask  = useAppStore((s) => s.updateTask)
  const reorderTasks = useAppStore((s) => s.reorderTasks)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    // Only fetch from API when localStorage has no persisted tasks.
    // If tasks already exist (hydrated by Zustand persist), skip the fetch to
    // avoid overwriting local data with a potentially stale or empty server response.
    if (tasks.length > 0) {
      setLoading(false)
      return
    }
    getTasks()
      .then(setTasks)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load tasks'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { tasks, loading, error, addTask, toggleTask, deleteTask, updateTask, reorderTasks }
}
