import { useEffect, useState } from 'react'

// Minimal hash router: #/leads/abc?x=1 → { parts: ['leads','abc'], query }

export interface Route {
  path: string
  parts: string[]
  query: URLSearchParams
}

function read(): Route {
  const raw = location.hash.replace(/^#/, '') || '/home'
  const [path, qs = ''] = raw.split('?')
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) }
}

let depth = 0

export function useRoute(): Route {
  const [r, setR] = useState(read)
  useEffect(() => {
    const on = () => {
      setR(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export function go(path: string, opts: { replace?: boolean } = {}) {
  const h = '#' + path
  if (location.hash === h) return
  if (opts.replace) {
    history.replaceState(null, '', h)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    depth++
    location.hash = h
  }
}

/** Back within the app, or to `fallback` when the page was opened directly. */
export function back(fallback: string) {
  if (depth > 0) {
    depth--
    history.back()
  } else go(fallback, { replace: true })
}
