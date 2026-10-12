import { useEffect, useState, type ReactNode } from 'react'
import { myRank, openTriggers, xpTotal } from './data/derive'
import type { AppState } from './data/types'
import { plural } from './lib/format'
import { back, go } from './router'
import { useStore } from './store'
import { Avatar, Icon, Logo, Popover } from './ui'

export type BnKey = 'home' | 'pipeline' | 'ranks' | 'inbox' | 'me'
export type DeskKey = 'home' | 'leads' | 'projects' | 'brds' | 'ranks'
export type PipeKey = 'leads' | 'projects' | 'brds'

const LAST_PIPE = 'brave-app:pipe'

export function rememberPipe(k: PipeKey) {
  try {
    sessionStorage.setItem(LAST_PIPE, k)
  } catch {
    /* ignore */
  }
}

function lastPipe(): PipeKey {
  try {
    return (sessionStorage.getItem(LAST_PIPE) as PipeKey) || 'leads'
  } catch {
    return 'leads'
  }
}

const fmtXp = (n: number) => n.toLocaleString('en-IN')

/** Which bottom tab a sub-page belongs to, so the nav is always shown and lit correctly. */
function navFor(hash: string): BnKey {
  const top = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  if (['leads', 'projects', 'brds', 'offerings'].includes(top)) return 'pipeline'
  if (top === 'ranks') return 'ranks'
  if (top === 'inbox' || top === 'notifications') return 'inbox'
  if (top === 'home' || top === 'unlock' || top === 'unlocked' || top === 'brochure' || top === 'website') return 'home'
  return 'me'
}

function pendingCount(s: AppState) {
  let n = 0
  for (const l of s.leads) {
    if (l.pending) n++
    n += l.interactions.filter((x) => x.pending).length
  }
  for (const p of s.projects) {
    if (p.pendingSync) n++
    n += p.payments.filter((x) => x.pendingSync).length
  }
  return n
}

export function OfflineStrip() {
  const { state } = useStore()
  if (state.sys.online) return null
  const n = pendingCount(state)
  return (
    <div className="strip no-print" role="status">
      <Icon n="cloud" s="sm" />
      <span className="f1">{n ? `Offline · ${plural(n, 'item')} saved on this ${document.body.classList.contains('is-m') ? 'phone' : 'device'}` : 'Offline · showing what was saved earlier'}</span>
    </div>
  )
}

// ---------- Phone ----------

export function BottomNav({ active }: { active: BnKey }) {
  const { state } = useStore()
  const badge = openTriggers(state).length
  useEffect(() => {
    document.body.classList.add('has-bn')
    return () => document.body.classList.remove('has-bn')
  }, [])
  const items: { key: BnKey; label: string; icon: string; to: string }[] = [
    { key: 'home', label: 'Home', icon: 'house', to: '/home' },
    { key: 'ranks', label: 'Ranks', icon: 'trophy', to: '/ranks' },
    { key: 'pipeline', label: 'Pipeline', icon: 'kanban', to: '/' + lastPipe() },
    { key: 'inbox', label: 'Inbox', icon: 'inbox', to: '/inbox' },
    { key: 'me', label: 'Me', icon: 'user', to: '/me' },
  ]
  return (
    <nav className="bn no-print" aria-label="Main">
      {items.map((it) => (
        <button type="button" key={it.key} className={`bni ${active === it.key ? 'act' : ''} ${it.key === 'pipeline' ? 'hero' : ''}`} aria-current={active === it.key ? 'page' : undefined} onClick={() => go(it.to)}>
          <span className="bel">
            <Icon n={it.icon} />
            {it.key === 'inbox' && badge > 0 && <i className="bdg">{badge}</i>}
          </span>
          {it.label}
        </button>
      ))}
    </nav>
  )
}

/** Phone header with the BRAVE mark. Right side: XP chip or search, then the avatar. */
export function PhoneBrand({ search, onSearch, xp = true }: { search?: boolean; onSearch?: () => void; xp?: boolean }) {
  const { state } = useStore()
  return (
    <div className="mh">
      <div className="row">
        <Logo />
      </div>
      <div className="row" style={{ gap: 10 }}>
        {search && (
          <button type="button" className="btn gh sm" style={{ width: 34, height: 34, padding: 0 }} onClick={onSearch} aria-label="Search">
            <Icon n="search" className="mut" />
          </button>
        )}
        {xp && !search && (
          <button type="button" className="xp" onClick={() => go('/ranks')} aria-label="Leaderboard">
            <Icon n="zap" s="sm" />
            {fmtXp(xpTotal(state))} XP
          </button>
        )}
        <button type="button" className="navbtn" onClick={() => go('/me')} aria-label="Me">
          <Avatar name="Tanvi Kumar" />
        </button>
      </div>
    </div>
  )
}

/** Phone header with a big title (Inbox, Leaderboard, Team). */
export function PhoneTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="mh" style={{ padding: '8px 16px 10px' }}>
      <span className="h2">{title}</span>
      <span className="row" style={{ gap: 10 }}>
        {right}
      </span>
    </div>
  )
}

export function PipelineTabs({ active, dots }: { active: PipeKey; dots?: Partial<Record<PipeKey, boolean>> }) {
  useEffect(() => rememberPipe(active), [active])
  const tabs: { key: PipeKey; label: string }[] = [
    { key: 'leads', label: 'Leads' },
    { key: 'projects', label: 'Projects' },
    { key: 'brds', label: 'BRDs' },
  ]
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button type="button" role="tab" aria-selected={active === t.key} key={t.key} className={`tab ${active === t.key ? 'act' : ''}`} onClick={() => go('/' + t.key)}>
          {t.label}
          {dots?.[t.key] && <span className="dot" aria-label="needs attention" />}
        </button>
      ))}
    </div>
  )
}

/** Phone sub-page header: back or close on the left, title in the middle. */
export function SubBar({ left = 'back', title, right, onLeft, fallback = '/home' }: { left?: 'x' | 'back' | 'none'; title?: ReactNode; right?: ReactNode; onLeft?: () => void; fallback?: string }) {
  return (
    <div className="hbar">
      <span className="side">
        {left !== 'none' && (
          <button type="button" className="btn gh sm" style={{ width: 34, height: 34, padding: 0, marginLeft: -8 }} onClick={onLeft ?? (() => back(fallback))} aria-label={left === 'x' ? 'Close' : 'Back'}>
            <Icon n={left === 'x' ? 'x' : 'left'} />
          </button>
        )}
      </span>
      <span className="ttl">{title}</span>
      <span className="side r">{right}</span>
    </div>
  )
}

// ---------- Desktop ----------

function MeMenu() {
  const { state, mutate } = useStore()
  const [open, setOpen] = useState(false)
  const nav = (to: string) => {
    setOpen(false)
    go(to)
  }
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="navbtn" onClick={() => setOpen((o) => !o)} aria-label="Team menu" aria-expanded={open}>
        <Avatar name="Tanvi Kumar" />
        <span className="s13 b">{state.team.name}</span>
        <Icon n="down" s="sm" className="fnt" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} style={{ right: 0, top: 44 }}>
        <div className="col" style={{ gap: 2, padding: '8px 10px' }}>
          <span className="b s13">Tanvi Kumar</span>
          <span className="s12 mut">
            {state.team.name} · {state.team.campus} campus
          </span>
        </div>
        <div className="hr" />
        <button type="button" onClick={() => nav('/me')}>
          <Icon n="users" s="sm" />
          Team and roles
        </button>
        <button type="button" onClick={() => nav('/me/sessions')}>
          <Icon n="mega" s="sm" />
          Peer sessions
        </button>
        <button type="button" onClick={() => nav('/content')}>
          <Icon n="video" s="sm" />
          Content & reach
        </button>
        <button type="button" onClick={() => nav('/workshop')}>
          <Icon n="grad" s="sm" />
          Workshop & library
        </button>
        <button type="button" onClick={() => nav('/parent')}>
          <Icon n="shield" s="sm" />
          Parent updates
        </button>
        <button type="button" onClick={() => nav('/testimonials')}>
          <Icon n="star" s="sm" />
          Testimonials
        </button>
        <div className="hr" />
        <button type="button" onClick={() => nav('/prototype')}>
          <Icon n="filter" s="sm" />
          Prototype controls
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            mutate((d) => {
              d.sys.signedIn = false
            })
            go('/signin', { replace: true })
          }}
        >
          <Icon n="login" s="sm" />
          Sign out
        </button>
      </Popover>
    </div>
  )
}

export function DesktopNav({ active, search }: { active?: DeskKey; search?: { value: string; onChange: (v: string) => void; placeholder?: string } }) {
  const { state } = useStore()
  const badge = openTriggers(state).length
  const rank = myRank(state)
  const tabs: { key: DeskKey; label: string; to: string }[] = [
    { key: 'home', label: 'Home', to: '/home' },
    { key: 'leads', label: 'Leads', to: '/leads' },
    { key: 'projects', label: 'Projects', to: '/projects' },
    { key: 'brds', label: 'BRDs', to: '/brds' },
    { key: 'ranks', label: 'Leaderboard', to: '/ranks' },
  ]
  return (
    <>
      <div className="nav no-print">
        <a href="#/home" className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo />
          <span className="eyebrow" style={{ marginLeft: 6 }}>Season 2</span>
        </a>
        <div className="row" style={{ gap: 28 }}>
          {tabs.map((t) => (
            <a key={t.key} href={'#' + t.to} className={`ntab ${active === t.key ? 'act' : ''}`} aria-current={active === t.key ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </div>
        <div className="f1" />
        {search && (
          <div className="in" style={{ width: 240, minHeight: 38 }}>
            <Icon n="search" s="sm" className="fnt" />
            <input className="s13" placeholder={search.placeholder ?? 'Search leads and clients'} value={search.value} onChange={(e) => search.onChange(e.target.value)} aria-label="Search" />
            {search.value && (
              <button type="button" className="btn gh sm" style={{ height: 24, width: 24, padding: 0 }} onClick={() => search.onChange('')} aria-label="Clear search">
                <Icon n="x" s="sm" />
              </button>
            )}
          </div>
        )}
        <a href="#/ranks" className="xp">
          <Icon n="zap" s="sm" />
          {fmtXp(xpTotal(state))} XP · #{rank.rank}
        </a>
        <a href="#/inbox" className="bel mut" aria-label={`Inbox, ${badge} to do`} style={{ color: '#6B6760' }}>
          <Icon n="bell" />
          {badge > 0 && <i className="bdg">{badge}</i>}
        </a>
        <MeMenu />
      </div>
      <OfflineStrip />
    </>
  )
}

/**
 * One page, two shells. Phone: optional header, bottom nav. Desktop: top nav and a
 * centered column (or full width with `wide`).
 */
export function Page({
  mobile,
  bn,
  desk,
  header,
  children,
  wide,
  search,
  bare,
}: {
  mobile: boolean
  bn?: BnKey
  desk?: DeskKey
  header?: ReactNode
  children: ReactNode
  wide?: boolean
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  /** Desktop: render children without the .main wrapper */
  bare?: boolean
}) {
  if (mobile) {
    return (
      <>
        {header && (
          <div className="mtop">
            {header}
            <OfflineStrip />
          </div>
        )}
        {!header && <OfflineStrip />}
        {children}
        <BottomNav active={bn ?? navFor(location.hash)} />
      </>
    )
  }
  return (
    <>
      <DesktopNav active={desk} search={search} />
      {bare ? children : <div className={`main ${wide ? '' : 'narrow'}`}>{children}</div>}
    </>
  )
}
