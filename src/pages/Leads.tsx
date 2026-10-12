import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { SOURCE_LABEL, STAGES, STAGE_LABEL, STAGE_SHORT, STAGE_TAG } from '../data/constants'
import { activeLeads, followUp, lastInteraction, lastLabel, lostLeads, mutedLeads, unlockStatus, type FollowBucket } from '../data/derive'
import type { Lead, Source, Stage } from '../data/types'
import { fmtDate, plural } from '../lib/format'
import { go, useRoute } from '../router'
import { Page, PhoneBrand, PipelineTabs, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, Center, Chip, Icon, Popover, Seg, Skeleton, Tag } from '../ui'
import { LockedPipeline } from './Home'
import { useLeadActions } from './LeadActions'

// ---------- Loading and error (first visit per session) ----------

const seen = new Set<string>()

/** Skeleton on the first visit of a list this session; an error state when a failure is simulated. */
export function useLoad(key: string): { phase: 'loading' | 'error' | 'ready'; retry: () => void } {
  const { state, mutate } = useStore()
  const fail = state.sys.failNextLoad
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>(() => (fail ? 'loading' : seen.has(key) ? 'ready' : 'loading'))
  useEffect(() => {
    if (phase !== 'loading') return
    const t = window.setTimeout(() => {
      if (fail) setPhase('error')
      else {
        seen.add(key)
        setPhase('ready')
      }
    }, fail ? 900 : 450)
    return () => window.clearTimeout(t)
  }, [phase, fail, key])
  return {
    phase,
    retry: () => {
      mutate((d) => {
        d.sys.failNextLoad = false
      })
      setPhase('loading')
    },
  }
}

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <Center icon="warn" iconBg="#FBE9E6" iconFg="#C0392B" title={`Couldn't load your ${what}`}>
      <span className="s13 mut" style={{ lineHeight: 1.5, maxWidth: 300 }}>
        Check your connection and try again. Anything saved on this phone is safe.
      </span>
      <button type="button" className="btn drk" style={{ width: '100%', maxWidth: 320 }} onClick={onRetry}>
        <Icon n="refresh" />
        Try again
      </button>
      <span className="s12 fnt">Error LD-503</span>
    </Center>
  )
}

// ---------- Lead card ----------

export function LeadCard({ l, actions = true }: { l: Lead; actions?: boolean }) {
  const la = useLeadActions()
  const f = followUp(l)
  const last = lastInteraction(l)
  const pending = l.pending || l.interactions.some((x) => x.pending)
  const flagged = l.interactions.filter((x) => x.flagged).length
  return (
    <div className="lcard" role="link" tabIndex={0} onClick={() => go(`/leads/${l.id}`)} onKeyDown={(e) => e.key === 'Enter' && go(`/leads/${l.id}`)}>
      <div className="row jb" style={{ alignItems: 'flex-start' }}>
        <span className="lcard-name ell">{l.business}</span>
        {pending ? (
          <Tag cls="t-ter" icon="cloud">
            Waiting to sync
          </Tag>
        ) : (
          <Tag cls={STAGE_TAG[l.stage]}>{STAGE_LABEL[l.stage]}</Tag>
        )}
      </div>
      <div className="row jb s12" style={{ alignItems: 'center' }}>
        <span className="col" style={{ gap: 2, minWidth: 0 }}>
          <span className="mut ell">
            {pending && last ? `${last.mode === 'visit' ? 'Visit' : last.mode === 'call' ? 'Call' : last.mode === 'email' ? 'Email' : 'WhatsApp'} · ${new Date(last.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}` : `Last: ${lastLabel(l)}`}
          </span>
          <span className={f.cls}>{f.text}</span>
          {flagged > 0 && <span className="mut">{plural(flagged, 'log')} in review</span>}
        </span>
        {actions && (
          <button
            type="button"
            className="btn sm"
            onClick={(e) => {
              e.stopPropagation()
              la.logFor(l)
            }}
          >
            <Icon n="plus" s="sm" />
            Log
          </button>
        )}
      </div>
    </div>
  )
}

const BUCKETS: { key: FollowBucket; label: string; color?: string }[] = [
  { key: 'overdue', label: 'Overdue', color: '#C0392B' },
  { key: 'today', label: 'Today', color: '#8F5B0B' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'none', label: 'No follow-up set' },
]

type Tile = 'all' | 'today' | 'overdue' | 'none'

function sortByFollow(a: Lead, b: Lead) {
  return followUp(a).days - followUp(b).days || a.business.localeCompare(b.business)
}

// ---------- Leads page ----------

export function LeadsPage({ mobile }: { mobile: boolean }) {
  const { state } = useStore()
  const r = useRoute()
  const la = useLeadActions()
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [tile, setTile] = useState<Tile>('all')
  const [stage, setStage] = useState<Stage | 'all'>(() => (STAGES.includes(r.query.get('stage') as Stage) ? (r.query.get('stage') as Stage) : 'all'))
  const load = useLoad('leads')
  const unlocked = unlockStatus(state).unlocked

  // "Add your first lead" and Home shortcuts land on /leads?add=1
  useEffect(() => {
    if (r.query.get('add') && unlocked) {
      go('/leads', { replace: true })
      la.addLead()
    }
  }, [r, la, unlocked])

  const all = activeLeads(state)
  const counts = useMemo(() => {
    const b = { overdue: 0, today: 0, none: 0 }
    for (const l of all) {
      const k = followUp(l).bucket
      if (k !== 'upcoming') b[k]++
    }
    return b
  }, [all])
  const archived = lostLeads(state).length + mutedLeads(state).length

  const ql = q.trim().toLowerCase()
  let list = all.filter((l) => !ql || l.business.toLowerCase().includes(ql) || (l.owner ?? '').toLowerCase().includes(ql) || l.phone.includes(ql.replace(/\s/g, '')) || (l.area ?? '').toLowerCase().includes(ql))
  if (tile !== 'all') list = list.filter((l) => followUp(l).bucket === tile)
  if (stage !== 'all') list = list.filter((l) => l.stage === stage)

  if (!mobile) return <LeadsDesk q={q} setQ={setQ} tile={tile} setTile={setTile} stage={stage} setStage={setStage} list={list} all={all} counts={counts} archived={archived} load={load} />

  const header = (
    <>
      {searching ? (
        <div className="mh" style={{ gap: 8 }}>
          <div className="in f1" style={{ minHeight: 38 }}>
            <Icon n="search" s="sm" className="fnt" />
            <input autoFocus placeholder="Search leads, owners, phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" />
          </div>
          <button
            type="button"
            className="btn gh sm"
            onClick={() => {
              setSearching(false)
              setQ('')
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <PhoneBrand search onSearch={() => setSearching(true)} />
      )}
      <PipelineTabs active="leads" />
    </>
  )

  let body: ReactNode
  if (!unlocked) body = <LockedPipeline />
  else if (load.phase === 'loading') body = <Skeleton />
  else if (load.phase === 'error') body = <LoadError what="leads" onRetry={load.retry} />
  else if (all.length === 0)
    body = (
      <Center icon="users" title="No leads yet">
        <span className="s13 mut" style={{ lineHeight: 1.5, maxWidth: 300 }}>
          This week's target is 20 new leads. Add each one at the shop, right after you talk.
        </span>
        <button type="button" className="btn pri" style={{ width: '100%' }} onClick={la.addLead}>
          <Icon n="plus" />
          Add a lead
        </button>
        <Banner tone="gry" icon="info" style={{ textAlign: 'left' }}>
          Met a business before today? You'll need proof of that first contact.
        </Banner>
        {archived > 0 && (
          <button type="button" className="lnk mut" onClick={() => go('/leads/archive')}>
            Archive · {archived}
          </button>
        )}
      </Center>
    )
  else
    body = (
      <>
        <div className="row">
          {(
            [
              ['all', 'users', all.length, 'Active', undefined, ''],
              ['today', 'clock', counts.today, 'Today', '#111111', ''],
              ['overdue', 'alert', counts.overdue, 'Overdue', '#C0392B', 'od'],
            ] as const
          ).map(([k, ic, n, label, color, cls]) => (
            <button key={k} type="button" className={`stat ${tile === k ? 'on' : ''}`} aria-pressed={tile === k} onClick={() => setTile(tile === k && k !== 'all' ? 'all' : k)}>
              <Icon n={ic} style={{ color }} />
              <span className={`num ${cls}`}>{n}</span>
              <span className="s12 mut">{label}</span>
            </button>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn pri f1" onClick={la.addLead}>
            <Icon n="plus" />
            Add a lead
          </button>
          <button type="button" className="btn" style={{ width: 44, padding: 0 }} onClick={() => go('/leads/archive')} aria-label={`Archive, ${archived}`}>
            <Icon n="arch" className="mut" />
          </button>
        </div>
        <div className="chips bleed">
          <Chip on={stage === 'all'} onClick={() => setStage('all')}>
            All
          </Chip>
          {STAGES.map((s) => {
            const n = all.filter((l) => l.stage === s).length
            return (
              <Chip key={s} on={stage === s} onClick={() => setStage(stage === s ? 'all' : s)}>
                {s === 'raw' || s === 'brochure' ? STAGE_LABEL[s] : STAGE_SHORT[s]} · {n}
              </Chip>
            )
          })}
        </div>
        {stage !== 'all' || tile !== 'all' || ql ? (
          <>
            <div className="row jb s12">
              <span className="mut">{plural(list.length, 'lead')} · soonest follow-up first</span>
              <button
                type="button"
                className="lnk s12"
                onClick={() => {
                  setStage('all')
                  setTile('all')
                  setQ('')
                }}
              >
                Clear
              </button>
            </div>
            {[...list].sort(sortByFollow).map((l) => (
              <LeadCard key={l.id} l={l} />
            ))}
            {list.length === 0 && <div className="empty">No leads match.</div>}
          </>
        ) : (
          <>
            <div className="tip">
              <Icon n="bulb" s="sm" style={{ marginTop: 1 }} />
              <span>Follow up at least 3 times, spread across 3–4 days.</span>
            </div>
            {BUCKETS.map((b) => {
              const items = list.filter((l) => followUp(l).bucket === b.key).sort(sortByFollow)
              if (!items.length) return null
              return (
                <div key={b.key} className="col" style={{ gap: 10 }}>
                  <div className="grp" style={{ color: b.color }}>
                    {b.label} · {items.length}
                  </div>
                  {items.map((l) => (
                    <LeadCard key={l.id} l={l} />
                  ))}
                </div>
              )
            })}
          </>
        )}
      </>
    )

  return (
    <Page mobile bn="pipeline" header={header}>
      <div className="scr">{body}</div>
    </Page>
  )
}

type SortKey = 'business' | 'stage' | 'last' | 'follow' | 'logs'

function LeadsDesk({
  q,
  setQ,
  tile,
  setTile,
  stage,
  setStage,
  list,
  all,
  counts,
  archived,
  load,
}: {
  q: string
  setQ: (v: string) => void
  tile: Tile
  setTile: (t: Tile) => void
  stage: Stage | 'all'
  setStage: (s: Stage | 'all') => void
  list: Lead[]
  all: Lead[]
  counts: { overdue: number; today: number; none: number }
  archived: number
  load: ReturnType<typeof useLoad>
}) {
  const { state } = useStore()
  const la = useLeadActions()
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'follow', dir: 1 })
  const [sources, setSources] = useState<Source[]>([])
  const [srcOpen, setSrcOpen] = useState(false)
  const unlocked = unlockStatus(state).unlocked
  const rows = list.filter((l) => !sources.length || sources.includes(l.source))
  const sorted = [...rows].sort((a, b) => {
    const d = sort.dir
    switch (sort.k) {
      case 'business':
        return a.business.localeCompare(b.business) * d
      case 'stage':
        return (STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)) * d || sortByFollow(a, b)
      case 'last':
        return (lastInteraction(a)?.at ?? '').localeCompare(lastInteraction(b)?.at ?? '') * d
      case 'logs':
        return (a.interactions.length - b.interactions.length) * d
      default:
        return sortByFollow(a, b) * d
    }
  })
  const th = (k: SortKey, label: string) => (
    <span>
      <button type="button" onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : 1 }))} aria-label={`Sort by ${label}`}>
        {label}
        {sort.k === k && <Icon n={sort.dir === 1 ? 'sup' : 'sdown'} s="sm" />}
      </button>
    </span>
  )
  const tileBtn = (k: Tile, icon: string, bg: string | undefined, fg: string | undefined, n: number, label: string, cls = '') => (
    <button type="button" className={`stat ${tile === k ? 'on' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }} onClick={() => setTile(tile === k && k !== 'all' ? 'all' : k)} aria-pressed={tile === k}>
      <div className="icb" style={{ background: bg, color: fg }}>
        <Icon n={icon} />
      </div>
      <div className="col" style={{ gap: 0 }}>
        <span className={`num ${cls}`}>{n}</span>
        <span className="s12 mut">{label}</span>
      </div>
    </button>
  )
  return (
    <Page mobile={false} desk="leads" wide search={unlocked ? { value: q, onChange: setQ } : undefined}>
      {!unlocked ? (
        <LockedPipeline />
      ) : load.phase === 'loading' ? (
        <Skeleton cards={4} />
      ) : load.phase === 'error' ? (
        <LoadError what="leads" onRetry={load.retry} />
      ) : (
        <>
          <div className="row jb">
            <div className="col" style={{ gap: 3 }}>
              <span className="h1">Leads</span>
              <span className="s13 mut">Log at least 3 interactions where progress was made. Follow up 3 times over 3–4 days.</span>
            </div>
            <div className="row">
              <button type="button" className="btn gh sm" onClick={() => go('/leads/archive')}>
                <Icon n="arch" s="sm" />
                Archive · {archived}
              </button>
              <button type="button" className="btn pri" onClick={la.addLead}>
                <Icon n="plus" />
                Add a lead
              </button>
            </div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            {tileBtn('all', 'users', undefined, undefined, all.length, 'Active leads')}
            {tileBtn('today', 'clock', '#EAE5DC', '#111111', counts.today, 'Follow up today')}
            {tileBtn('overdue', 'alert', '#FBE9E6', '#C0392B', counts.overdue, 'Overdue', 'od')}
            {tileBtn('none', 'cal', undefined, undefined, counts.none, 'No follow-up set')}
          </div>
          <div className="pan">
            <div className="row" style={{ padding: '12px 18px', gap: 8, borderBottom: '1px solid #F0ECE6' }}>
              <Chip on={stage === 'all'} onClick={() => setStage('all')}>
                All stages
              </Chip>
              {STAGES.map((s) => (
                <Chip key={s} on={stage === s} onClick={() => setStage(stage === s ? 'all' : s)}>
                  {STAGE_LABEL[s]} · {all.filter((l) => l.stage === s).length}
                </Chip>
              ))}
              <div className="f1" />
              <div style={{ position: 'relative' }}>
                <Chip on={sources.length > 0} onClick={() => setSrcOpen((o) => !o)}>
                  <Icon n="filter" s="sm" />
                  {sources.length ? `Source · ${sources.length}` : 'Source'}
                </Chip>
                <Popover open={srcOpen} onClose={() => setSrcOpen(false)} style={{ right: 0, top: 42 }}>
                  {(['offline', 'online', 'friends'] as Source[]).map((s) => (
                    <button key={s} type="button" className={sources.includes(s) ? 'on' : ''} onClick={() => setSources((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}>
                      <Icon n={sources.includes(s) ? 'ccheck' : 'circle'} s="sm" />
                      {SOURCE_LABEL[s]}
                      <span className="fnt" style={{ marginLeft: 'auto' }}>
                        {all.filter((l) => l.source === s).length}
                      </span>
                    </button>
                  ))}
                  {sources.length > 0 && (
                    <button type="button" onClick={() => setSources([])}>
                      <Icon n="x" s="sm" />
                      Clear
                    </button>
                  )}
                </Popover>
              </div>
            </div>
            <div className="tr th lt">
              {th('business', 'Business')}
              {th('stage', 'Lead stage')}
              {th('last', 'Last interaction')}
              {th('follow', 'Follow-up')}
              {th('logs', 'Logs')}
              <span />
            </div>
            {sorted.map((l) => {
              const f = followUp(l)
              const pending = l.pending || l.interactions.some((x) => x.pending)
              return (
                <div key={l.id} className="tr lt click" onClick={() => go(`/leads/${l.id}`)}>
                  <span className="b ell">
                    {l.business}
                    {pending && <Icon n="cloud" s="sm" className="fnt" style={{ marginLeft: 6, verticalAlign: -2 }} />}
                  </span>
                  <span>
                    <Tag cls={STAGE_TAG[l.stage]}>{STAGE_LABEL[l.stage]}</Tag>
                  </span>
                  <span className="s13 mut">{lastLabel(l)}</span>
                  <span className={`s13 ${f.cls}`}>{f.text}</span>
                  <span className="s13 mut">{l.interactions.filter((x) => !x.wonMarked).length}</span>
                  <div className="row" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn sm" onClick={() => la.logFor(l)}>
                      <Icon n="plus" s="sm" />
                      Log
                    </button>
                  </div>
                </div>
              )
            })}
            {sorted.length === 0 && <div className="empty">{all.length ? 'No leads match these filters.' : 'No leads yet. Add your first one at the shop, right after you talk.'}</div>}
          </div>
        </>
      )}
    </Page>
  )
}

// ---------- Archive ----------

export function ArchivePage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const la = useLeadActions()
  const [tab, setTab] = useState<'lost' | 'muted'>('lost')
  const lost = lostLeads(state).sort((a, b) => (b.statusAt ?? '').localeCompare(a.statusAt ?? ''))
  const muted = mutedLeads(state)
  const body = (
    <>
      {!mobile && (
        <div className="col" style={{ gap: 3 }}>
          <a href="#/leads" className="s13 mut" style={{ textDecoration: 'none' }}>
            ‹ Leads
          </a>
          <span className="h1">Archive</span>
        </div>
      )}
      <Seg
        value={tab}
        onChange={setTab}
        options={[
          { value: 'lost', label: `Lost · ${lost.length}` },
          { value: 'muted', label: `Muted · ${muted.length}` },
        ]}
      />
      {tab === 'lost' &&
        lost.map((l) =>
          l.claimed ? (
            <button key={l.id} type="button" className="card click" style={{ padding: 12, gap: 6, background: '#F7F5F1' }} onClick={() => go(`/leads/${l.id}`)}>
              <div className="row jb">
                <span className="b" style={{ fontSize: 15 }}>
                  {l.business}
                </span>
                <Tag cls="t-drf">Claimed by another team</Tag>
              </div>
              <span className="s12 mut" style={{ lineHeight: 1.45 }}>
                Another team proved earlier contact. Your {plural(l.interactions.length, 'interaction')} stay here; it can't be recovered.
              </span>
            </button>
          ) : (
            <div key={l.id} className="card click" style={{ padding: 12, gap: 8 }} onClick={() => go(`/leads/${l.id}`)}>
              <div className="row jb">
                <span className="b" style={{ fontSize: 15 }}>
                  {l.business}
                </span>
                <button
                  type="button"
                  className="btn sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    la.recoverFor(l)
                  }}
                >
                  <Icon n="undo" s="sm" />
                  Recover
                </button>
              </div>
              <div className="col s12" style={{ gap: 2 }}>
                <span className="mut">
                  Lost {l.statusAt ? fmtDate(l.statusAt) : ''} · {l.lostReason ?? 'No reason given'}
                </span>
                <span className="fnt">Last stage: {STAGE_LABEL[l.stage]}</span>
              </div>
            </div>
          ),
        )}
      {tab === 'lost' && lost.length === 0 && <div className="empty">No lost leads. Leads you mark Lost land here with their timeline.</div>}
      {tab === 'muted' &&
        muted.map((l) => (
          <div key={l.id} className="card click" style={{ padding: 12, gap: 8 }} onClick={() => go(`/leads/${l.id}`)}>
            <div className="row jb">
              <span className="b" style={{ fontSize: 15 }}>
                {l.business}
              </span>
              <button
                type="button"
                className="btn sm"
                onClick={(e) => {
                  e.stopPropagation()
                  mutate((d) => {
                    d.leads.find((x) => x.id === l.id)!.muted = undefined
                  })
                  toast(`${l.business} unmuted · back in Leads`)
                }}
              >
                Unmute
              </button>
            </div>
            <div className="row s12" style={{ gap: 6 }}>
              <Tag cls={STAGE_TAG[l.stage]}>{STAGE_LABEL[l.stage]}</Tag>
              <span className="mut">Muted until {fmtDate(l.muted!.until)}</span>
            </div>
          </div>
        ))}
      {tab === 'muted' && (
        <Banner tone="gry" icon="info">
          Muted leads get no reminders or triggers. Your mentor sees teams that mute a lot of leads.
        </Banner>
      )}
    </>
  )
  return (
    <Page mobile={mobile} desk="leads" header={<SubBar title="Archive" fallback="/leads" />}>
      <div className={mobile ? 'scr' : 'col'} style={mobile ? undefined : { gap: 12 }}>
        {body}
      </div>
    </Page>
  )
}
