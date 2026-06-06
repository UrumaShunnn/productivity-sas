import { useAppStore } from '../store/useAppStore'

function ctx(): AudioContext | null {
  try { return new AudioContext() } catch { return null }
}

function ifEnabled(fn: (ac: AudioContext) => void) {
  if (!useAppStore.getState().soundEnabled) return
  const ac = ctx()
  if (ac) fn(ac)
}

export function playTaskComplete() {
  ifEnabled((ac) => {
    const now = ac.currentTime
    // Soft two-tone click: high blip + gentle sub
    const freqs = [1200, 600] as const
    freqs.forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.04
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(i === 0 ? 0.22 : 0.12, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.start(t); osc.stop(t + 0.18)
    })
  })
}

export function playPomodoroDone() {
  ifEnabled((ac) => {
    const now = ac.currentTime
    ;([880, 1108, 1320] as const).forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.1
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18 - i * 0.05, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
      osc.start(t); osc.stop(t + 1.4)
    })
  })
}

export function playBadgeUnlock() {
  ifEnabled((ac) => {
    const now = ac.currentTime
    // Ascending arpeggio: C5 E5 G5 C6
    ;([523, 659, 784, 1047] as const).forEach((freq, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = now + i * 0.12
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22 - i * 0.04, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.start(t); osc.stop(t + 0.5)
    })
  })
}
