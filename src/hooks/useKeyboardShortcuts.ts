import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useKeyboardShortcuts() {
  const setActiveTab    = useAppStore((s) => s.setActiveTab)
  const toggleFocusMode = useAppStore((s) => s.toggleFocusMode)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never fire inside text inputs
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'd': setActiveTab('dashboard'); break
        case 't': setActiveTab('tasks');    break
        case 'g': setActiveTab('goals');    break
        case 'e': setActiveTab('finance');  break
        case 'w': setActiveTab('workout');  break
        case 's': setActiveTab('stats');    break
        case 'f': toggleFocusMode();        break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveTab, toggleFocusMode])
}
