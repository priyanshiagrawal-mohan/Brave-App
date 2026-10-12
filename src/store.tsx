import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { tick } from './data/derive'
import { seedState, VERSION } from './data/seed'
import type { AppState, Scenario } from './data/types'

const KEY = 'brave-app:state'

function load(): AppState {
  try {
    if (new URLSearchParams(location.search).has('reset')) {
      localStorage.removeItem(KEY)
      history.replaceState(null, '', location.pathname + location.hash)
    }
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as AppState
      if (s.version === VERSION) return s
    }
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return seedState('mid')
}

export type Tone = 'ok' | 'warn' | 'info' | 'err'

interface Toast {
  id: number
  text: string
  tone: Tone
  action?: { label: string; run: () => void }
}

interface Store {
  state: AppState
  /** Clone-and-mutate update. Keep mutations small and synchronous. */
  mutate: (fn: (draft: AppState) => void) => void
  toast: (text: string, tone?: Tone, action?: Toast['action']) => void
  reset: (scenario?: Scenario) => void
}

const Ctx = createContext<Store | null>(null)

const ICON: Record<Tone, [string, string]> = {
  ok: ['ccheck', '#7FD39E'],
  warn: ['alert', '#EF9F27'],
  info: ['info', '#C9C4BB'],
  err: ['alert', '#F19A8E'],
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>(0)
  const latest = useRef(state)
  latest.current = state

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota exceeded (large photos): keep working in memory */
    }
  }, [state])

  const showToast = useCallback((text: string, tone: Tone = 'ok', action?: Toast['action']) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now() + Math.random(), text, tone, action })
    timer.current = window.setTimeout(() => setToast(null), action ? 5200 : 3200)
  }, [])

  // The "server": verifies payments, starts reviews, clears triggers, pays weekly XP.
  const runTick = useCallback(() => {
    const d = structuredClone(latest.current)
    const msgs = tick(d)
    if (msgs.length) {
      latest.current = d
      setState(d)
      if (d.sys.signedIn) showToast(msgs[msgs.length - 1], 'ok')
    }
  }, [showToast])

  useEffect(() => {
    const i = window.setInterval(runTick, 1500)
    return () => window.clearInterval(i)
  }, [runTick])

  const mutate = useCallback(
    (fn: (d: AppState) => void) => {
      const d = structuredClone(latest.current)
      fn(d)
      latest.current = d
      setState(d)
      // Let derived effects (triggers clearing, weekly XP) land right after the change.
      window.setTimeout(runTick, 250)
    },
    [runTick],
  )

  const reset = useCallback((scenario: Scenario = 'mid') => {
    const s = seedState(scenario)
    s.sys.signedIn = latest.current.sys.signedIn
    latest.current = s
    setState(s)
  }, [])

  return (
    <Ctx.Provider value={{ state, mutate, toast: showToast, reset }}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span className={`ic sm i-${ICON[toast.tone][0]}`} style={{ color: ICON[toast.tone][1] }} />
          <span className="f1">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-act"
              onClick={() => {
                toast.action!.run()
                setToast(null)
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
