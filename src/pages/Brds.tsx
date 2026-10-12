import { useState, type ReactNode } from 'react'
import { brdAmounts, brdGroup, brdView, BRD_TAG, deadlineLeft, loggedOn, offeringName, projectMissing, targets, unlockStatus, verifiedOn, type BrdGroup, type BrdView } from '../data/derive'
import type { AppState, Project } from '../data/types'
import { daysUntil, fmtDate, fmtDateTime, inr, plural } from '../lib/format'
import { go } from '../router'
import { Page, PhoneBrand, PipelineTabs } from '../Shell'
import { useStore } from '../store'
import { Bar, Center, Chip, Icon, Seg, Skeleton, Tag } from '../ui'
import { LockedPipeline } from './Home'
import { LoadError, useLoad } from './Leads'
import { decide } from './BrdDoc'

type Filter = 'all' | BrdGroup | 'rejected'

const GROUP_LABEL: Record<BrdGroup, string> = { needs: 'Needs you', review: 'In review', approved: 'Approved', drafts: 'Drafts, project in progress' }
const GROUP_COLOR: Partial<Record<BrdGroup, string>> = { needs: '#C0392B', approved: '#111111' }

function statusSub(p: Project, v: BrdView): { text: string; cls: string } | null {
  switch (v) {
    case 'rejected':
      return { text: `${deadlineLeft(p.brd.deadline)} to resubmit`.replace('left to resubmit', 'to resubmit'), cls: 'td' }
    case 'closed':
      return { text: 'Resubmission window closed', cls: 'od' }
    case 'submitted':
    case 'auto':
      return p.brd.delayed || (p.brd.decisionBy && daysUntil(p.brd.decisionBy) < 0) ? { text: 'Taking longer than usual', cls: 'td' } : { text: `Decision by ${p.brd.decisionBy ? fmtDate(p.brd.decisionBy) : 'soon'}`, cls: 'mut' }
    default:
      return null
  }
}

function short(name: string) {
  return name.replace('WhatsApp ', '').replace('Appointment calling agent', 'Appointment agent').replace('Booking calling agent', 'Booking agent').replace('Instagram menu posts', 'Menu posts')
}

function sums(s: AppState) {
  let approved = 0
  let review = 0
  let unclaimed = 0
  for (const p of s.projects) {
    const v = brdView(p)
    const a = brdAmounts(p)
    approved += a.approved
    if (v === 'submitted' || v === 'auto') review += a.claimed
    unclaimed += Math.max(0, p.value - a.approved - (v === 'submitted' || v === 'auto' ? a.claimed : 0))
  }
  return { approved, review, unclaimed }
}

export function BrdsPage({ mobile }: { mobile: boolean }) {
  const { state } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [by, setBy] = useState<'status' | 'client'>('status')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const load = useLoad('brds')
  const unlocked = unlockStatus(state).unlocked
  const ql = q.trim().toLowerCase()
  const all = state.projects.filter((p) => !ql || p.client.business.toLowerCase().includes(ql) || offeringName(state, p).toLowerCase().includes(ql))
  const rows = all.map((p) => ({ p, v: brdView(p) }))
  const count = (g: BrdGroup) => rows.filter((r) => brdGroup(r.v) === g).length
  const rejected = rows.filter((r) => r.v === 'rejected' || r.v === 'closed')
  const S = sums(state)
  const header = (
    <>
      {searching ? (
        <div className="mh" style={{ gap: 8 }}>
          <div className="in f1" style={{ minHeight: 38 }}>
            <Icon n="search" s="sm" className="fnt" />
            <input autoFocus placeholder="Client or offering" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search BRDs" />
          </div>
          <button type="button" className="btn gh sm" onClick={() => { setSearching(false); setQ('') }}>
            Cancel
          </button>
        </div>
      ) : (
        <PhoneBrand search onSearch={() => setSearching(true)} />
      )}
      <PipelineTabs active="brds" />
    </>
  )

  let body: ReactNode
  if (!unlocked) body = <LockedPipeline />
  else if (load.phase === 'loading') body = <Skeleton />
  else if (load.phase === 'error') body = <LoadError what="BRDs" onRetry={load.retry} />
  else if (!state.projects.length)
    body = (
      <Center icon="file" title="No BRDs yet" style={{ minHeight: 360 }}>
        <span className="s13 mut" style={{ lineHeight: 1.5, maxWidth: 300 }}>
          Each project gets a BRD, built from the lead, the project and its payments. Win a lead to start one.
        </span>
        <button type="button" className="btn drk" onClick={() => go('/leads')}>
          Go to Leads
        </button>
      </Center>
    )
  else if (mobile) body = <BrdsPhone rows={rows} filter={filter} setFilter={setFilter} count={count} rejected={rejected} S={S} />
  else body = <BrdsDesk rows={rows} filter={filter} setFilter={setFilter} count={count} rejected={rejected} S={S} by={by} setBy={setBy} q={q} setQ={setQ} sel={sel} setSel={setSel} />

  if (mobile)
    return (
      <Page mobile bn="pipeline" header={header}>
        <div className="scr" style={{ gap: 10 }}>
          {body}
        </div>
      </Page>
    )
  return (
    <Page mobile={false} desk="brds" wide>
      {body}
    </Page>
  )
}

type Row = { p: Project; v: BrdView }

function BrdCard({ r }: { r: Row }) {
  const { state } = useStore()
  const a = brdAmounts(r.p)
  const sub = statusSub(r.p, r.v)
  const tag = r.v === 'auto' && (r.p.brd.delayed || (r.p.brd.decisionBy && daysUntil(r.p.brd.decisionBy) < 0)) ? { text: 'Auto-review running', cls: 't-ter' } : BRD_TAG[r.v]
  return (
    <button type="button" className="card click" style={{ padding: '10px 12px', gap: 4, borderColor: r.v === 'rejected' ? '#F0C8C2' : undefined }} onClick={() => go(`/brds/${r.p.id}`)}>
      <div className="row jb">
        <span className="b s13">{r.p.client.business}</span>
        <Tag cls={tag.cls}>{tag.text}</Tag>
      </div>
      <div className="row jb s12">
        <span className="mut ell">
          {short(offeringName(state, r.p))}
          {(r.v === 'submitted' || r.v === 'auto') && r.p.brd.decisionBy ? ` · by ${fmtDate(r.p.brd.decisionBy)}` : ''}
        </span>
        {r.v === 'rejected' || r.v === 'closed' ? <span className={sub?.cls}>{sub?.text}</span> : r.v === 'draft' ? <span className="mut">{plural(projectMissing(r.p).length, 'thing')} missing</span> : <span>{inr(r.v === 'partly' || r.v === 'approved' ? a.approved : a.claimed || r.p.value)}</span>}
      </div>
    </button>
  )
}

function BrdsPhone({ rows, filter, setFilter, count, rejected, S }: { rows: Row[]; filter: Filter; setFilter: (f: Filter) => void; count: (g: BrdGroup) => number; rejected: Row[]; S: ReturnType<typeof sums> }) {
  const { state } = useStore()
  const [open, setOpen] = useState<Partial<Record<BrdGroup, boolean>>>({ needs: true, review: true })
  const chips: [Filter, string][] = [
    ['all', `All · ${rows.length}`],
    ['review', `In review · ${count('review')}`],
    ['approved', `Approved · ${count('approved')}`],
    ['rejected', `Rejected · ${rejected.length}`],
  ]
  const chipRow = (
    <div className="chips bleed">
      {chips.map(([k, l]) => (
        <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>
          {l}
        </Chip>
      ))}
    </div>
  )
  if (filter === 'rejected') {
    return (
      <>
        {chipRow}
        {rejected.length === 0 && <div className="empty">No rejected BRDs. Rejected ones stay here with the reason and a 3-day window.</div>}
        {rejected.map(({ p }) => (
          <div key={p.id} className="card" style={{ padding: 14, borderColor: '#F0C8C2' }}>
            <div className="row jb">
              <span className="b" style={{ fontSize: 15 }}>
                {p.client.business}
              </span>
              <Tag cls="t-red">Rejected</Tag>
            </div>
            <span className="s13 mut">
              {offeringName(state, p)} · {inr(p.brd.claimed ?? 0)} claimed
            </span>
            <div className="col" style={{ gap: 4, background: '#FBF1EF', borderRadius: 10, padding: '10px 12px' }}>
              <span className="s12 b" style={{ color: '#A93226' }}>
                Reason from auto-review
              </span>
              <span className="s13" style={{ lineHeight: 1.45 }}>
                {p.brd.reason}
              </span>
            </div>
            <div className="row s12">
              <Icon n="clock" s="sm" className="td" />
              <span className="td">
                Resubmit by {p.brd.deadline ? fmtDate(p.brd.deadline) : ''} · {deadlineLeft(p.brd.deadline)}
              </span>
            </div>
            <button type="button" className="btn pri" onClick={() => go(`/brds/${p.id}/fix`)}>
              <Icon n="redo" />
              Fix and resubmit
            </button>
          </div>
        ))}
        {rows.some((r) => brdGroup(r.v) === 'review') && <span className="grp">Also in review</span>}
        {rows
          .filter((r) => brdGroup(r.v) === 'review')
          .map(({ p }) => (
            <button key={p.id} type="button" className="card click" style={{ padding: 12, gap: 6 }} onClick={() => go(`/brds/${p.id}`)}>
              <div className="row jb">
                <span className="b">
                  {p.client.business} · {short(offeringName(state, p))}
                </span>
                <Tag cls="t-ter">In review</Tag>
              </div>
              <span className="s12 mut">
                Submitted {p.brd.submittedAt ? fmtDate(p.brd.submittedAt) : ''} · {inr(p.brd.claimed ?? 0)} claimed
              </span>
            </button>
          ))}
      </>
    )
  }
  if (filter === 'approved') {
    const ap = rows.filter((r) => brdGroup(r.v) === 'approved')
    return (
      <>
        {chipRow}
        <div className="card" style={{ padding: 14, flexDirection: 'row', alignItems: 'center', background: '#EAE5DC', borderColor: '#CFC7BA' }}>
          <div className="col f1" style={{ gap: 1 }}>
            <span className="s12 b" style={{ color: '#111111' }}>
              Total approved revenue
            </span>
            <span className="num" style={{ color: '#111111' }}>
              {inr(S.approved)}
            </span>
          </div>
          <Icon n="ccheck" style={{ color: '#111111' }} />
        </div>
        {ap.map(({ p, v }) => {
          const a = brdAmounts(p)
          return v === 'partly' ? (
            <button key={p.id} type="button" className="card click" style={{ padding: 14 }} onClick={() => go(`/brds/${p.id}`)}>
              <div className="row jb">
                <span className="b" style={{ fontSize: 15 }}>
                  {p.client.business}
                </span>
                <Tag cls="t-ter">Partly approved</Tag>
              </div>
              <span className="s13 mut">{offeringName(state, p)}</span>
              <Bar pct={(a.approved / p.value) * 100} g />
              <div className="row jb s12">
                <span className="gd">{inr(a.approved)} approved</span>
                <span className="td">{inr(p.value - a.approved)} pending</span>
              </div>
              <span className="s12 fnt">Next payment you log is added here for review.</span>
            </button>
          ) : (
            <button key={p.id} type="button" className="card click" style={{ padding: 12, gap: 6 }} onClick={() => go(`/brds/${p.id}`)}>
              <div className="row jb">
                <span className="b">{p.client.business}</span>
                <Tag cls="t-grn">Approved</Tag>
              </div>
              <div className="row jb s12">
                <span className="mut">
                  {short(offeringName(state, p))} · {p.brd.approvedAt ? fmtDate(p.brd.approvedAt) : ''}
                </span>
                <span className="gd">{inr(a.approved)}</span>
              </div>
            </button>
          )
        })}
      </>
    )
  }
  const groups: BrdGroup[] = filter === 'all' ? ['needs', 'review', 'approved', 'drafts'] : [filter as BrdGroup]
  return (
    <>
      {chipRow}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="stat" style={{ padding: '9px 10px' }} onClick={() => setFilter('approved')}>
          <span className="s12 mut">Approved</span>
          <span className="b gd">{inr(S.approved)}</span>
        </button>
        <button type="button" className="stat" style={{ padding: '9px 10px' }} onClick={() => setFilter('review')}>
          <span className="s12 mut">In review</span>
          <span className="b">{inr(S.review)}</span>
        </button>
      </div>
      {groups.map((g) => {
        const list = rows.filter((r) => brdGroup(r.v) === g)
        if (!list.length) return null
        const collapsible = filter === 'all' && (g === 'approved' || g === 'drafts')
        const isOpen = !collapsible || open[g]
        return (
          <div key={g} className="col" style={{ gap: 10 }}>
            <button type="button" className="grp" style={{ color: GROUP_COLOR[g] === '#111111' ? undefined : GROUP_COLOR[g] }} onClick={() => collapsible && setOpen((o) => ({ ...o, [g]: !o[g] }))} aria-expanded={isOpen}>
              {GROUP_LABEL[g]} · {list.length}
              <span className="f1" />
              {collapsible && <Icon n={isOpen ? 'down' : 'right'} s="sm" />}
            </button>
            {isOpen && list.map((r) => <BrdCard key={r.p.id} r={r} />)}
          </div>
        )
      })}
    </>
  )
}

// ---------- Desktop ----------

const COLS = '1.5fr 1.3fr 1.25fr .85fr .85fr .85fr 1.2fr'
const COLS_NARROW = '1.9fr 1.3fr .9fr 48px'

function BrdsDesk({
  rows,
  filter,
  setFilter,
  count,
  rejected,
  S,
  by,
  setBy,
  q,
  setQ,
  sel,
  setSel,
}: {
  rows: Row[]
  filter: Filter
  setFilter: (f: Filter) => void
  count: (g: BrdGroup) => number
  rejected: Row[]
  S: ReturnType<typeof sums>
  by: 'status' | 'client'
  setBy: (b: 'status' | 'client') => void
  q: string
  setQ: (v: string) => void
  sel: string | null
  setSel: (id: string | null) => void
}) {
  const { state } = useStore()
  const ready = rows.filter((r) => r.v === 'ready')
  const chips: [Filter, string][] = [
    ['all', `All · ${rows.length}`],
    ['needs', `Needs you · ${count('needs')}`],
    ['review', `Under review · ${count('review')}`],
    ['approved', `Approved · ${count('approved')}`],
    ['rejected', `Rejected · ${rejected.length}`],
    ['drafts', `Drafts · ${count('drafts')}`],
  ]
  const shown = rows.filter((r) => filter === 'all' || (filter === 'rejected' ? r.v === 'rejected' || r.v === 'closed' : brdGroup(r.v) === filter))
  const selected = sel ? rows.find((r) => r.p.id === sel) : undefined
  const narrow = !!selected
  const groups: BrdGroup[] = ['needs', 'review', 'approved', 'drafts']
  const bg: Record<BrdGroup, string> = { needs: '#FDF6F5', review: '#F4F1EC', approved: '#F4F1EC', drafts: '#F4F1EC' }

  return (
    <>
      <div className="row jb">
        <div className="col" style={{ gap: 3 }}>
          <span className="h1">BRDs</span>
          <span className="s13 mut">
            {plural(rows.length, 'project')}, {plural(rows.length, 'BRD')}. Each is built from its project and updates as you log payments.
          </span>
        </div>
        <div className="row" style={{ gap: 24 }}>
          {(
            [
              ['Approved', S.approved, 'gd'],
              ['In review', S.review, ''],
              ['Not yet claimed', S.unclaimed, 'mut'],
            ] as const
          ).map(([k, v, cls]) => (
            <div key={k} className="col" style={{ gap: 0, alignItems: 'flex-end' }}>
              <span className="s12 mut">{k}</span>
              <span className={`h2 ${cls}`}>{inr(v)}</span>
            </div>
          ))}
        </div>
      </div>
      {ready.length > 0 && (
        <div className="row" style={{ padding: '14px 16px', borderRadius: 14, background: '#111111', color: '#fff', gap: 14 }}>
          <div className="icb" style={{ background: '#3A3733', color: '#EF9F27' }}>
            <Icon n="file" />
          </div>
          <div className="col f1" style={{ gap: 1 }}>
            <span className="b">{plural(ready.length, 'BRD')} ready to submit</span>
            <span className="s12" style={{ color: '#C9C4BB' }}>
              {ready[0].p.client.business} · {offeringName(state, ready[0].p)} · {inr(brdAmounts(ready[0].p).verified)} received
            </span>
          </div>
          <button type="button" className="btn sm" style={{ background: '#fff' }} onClick={() => go(`/brds/${ready[0].p.id}`)}>
            Review & submit
            <Icon n="arrow" s="sm" />
          </button>
        </div>
      )}
      <div className="row jb">
        <div className="chips">
          {chips.map(([k, l]) => (
            <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>
              {l}
            </Chip>
          ))}
        </div>
        <div className="row">
          <div className="in" style={{ width: 220, minHeight: 36 }}>
            <Icon n="search" s="sm" className="fnt" />
            <input className="s13" placeholder="Client or offering" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search BRDs" />
          </div>
          <Seg
            value={by}
            onChange={setBy}
            style={{ width: 220 }}
            options={[
              { value: 'status', label: 'By status' },
              { value: 'client', label: 'By client' },
            ]}
          />
        </div>
      </div>
      {by === 'client' ? (
        <ByClient rows={shown} />
      ) : (
        <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
          <div className="pan f1">
            <div className="tr th" style={{ gridTemplateColumns: narrow ? COLS_NARROW : COLS }}>
              <span>{narrow ? 'Project' : 'Client'}</span>
              {!narrow && <span>Project</span>}
              <span>Status</span>
              <span>Claimed</span>
              {!narrow && <span>Approved</span>}
              {!narrow && <span>Pending</span>}
              <span />
            </div>
            {groups.map((g) => {
              const list = shown.filter((r) => brdGroup(r.v) === g)
              if (!list.length) return null
              return (
                <div key={g}>
                  <div className="row" style={{ padding: '10px 18px', background: bg[g], borderBottom: '1px solid #F0ECE6' }}>
                    <span className="grp" style={{ color: GROUP_COLOR[g], margin: 0 }}>
                      {g === 'review' ? 'Under review' : GROUP_LABEL[g]} · {list.length}
                    </span>
                  </div>
                  {list.map((r) => {
                    const a = brdAmounts(r.p)
                    const sub = statusSub(r.p, r.v)
                    const isSel = sel === r.p.id
                    return (
                      <div key={r.p.id} className={`tr s13 click ${isSel ? 'sel' : ''}`} style={{ gridTemplateColumns: narrow ? COLS_NARROW : COLS, minHeight: narrow ? 64 : undefined }} onClick={() => setSel(isSel ? null : r.p.id)}>
                        {narrow ? (
                          <div className="col" style={{ gap: 1, minWidth: 0 }}>
                            <span className="b ell">{r.p.client.business}</span>
                            <span className="s12 mut ell">{offeringName(state, r.p)}</span>
                          </div>
                        ) : (
                          <>
                            <span className="b ell">{r.p.client.business}</span>
                            <span className="mut ell">{offeringName(state, r.p)}</span>
                          </>
                        )}
                        <div className="col" style={{ gap: 2 }}>
                          <Tag cls={BRD_TAG[r.v].cls} style={{ alignSelf: 'flex-start' }}>
                            {BRD_TAG[r.v].text}
                          </Tag>
                          {sub && <span className={`s12 ${sub.cls}`}>{sub.text}</span>}
                        </div>
                        <span>{a.claimed ? inr(a.claimed) : <span className="mut">—</span>}</span>
                        {!narrow && <span className={a.approved ? 'gd b' : 'mut'}>{a.approved ? inr(a.approved) : '—'}</span>}
                        {!narrow && <span className={r.v === 'partly' ? 'td' : 'mut'}>{a.pending ? inr(a.pending) : '—'}</span>}
                        {narrow ? (
                          <Icon n="right" className="fnt" />
                        ) : (
                        <div className="row" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                          {r.v === 'rejected' ? (
                            <button type="button" className="btn sm pri" onClick={() => go(`/brds/${r.p.id}/fix`)}>
                              Fix & resubmit
                            </button>
                          ) : r.v === 'ready' ? (
                            <button type="button" className="btn sm drk" onClick={() => go(`/brds/${r.p.id}`)}>
                              Review & submit
                            </button>
                          ) : r.v === 'draft' ? (
                            <button type="button" className="btn sm" onClick={() => go(`/projects/${r.p.id}`)}>
                              Open project
                            </button>
                          ) : (
                            <button type="button" className="btn gh sm" style={{ width: 32, padding: 0 }} onClick={() => go(`/brds/${r.p.id}`)} aria-label="Open BRD">
                              <Icon n="right" />
                            </button>
                          )}
                        </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {shown.length === 0 && <div className="empty">Nothing here.</div>}
          </div>
          {selected && <SidePanel r={selected} onClose={() => setSel(null)} />}
        </div>
      )}
      <span className="s12 fnt">A draft becomes "Ready to submit" once its details are complete and a payment is verified. Submit it within 3 days or it shows up in your Inbox as overdue.</span>
    </>
  )
}

function ByClient({ rows }: { rows: Row[] }) {
  const { state } = useStore()
  const m = new Map<string, Row[]>()
  for (const r of rows) m.set(r.p.client.business, [...(m.get(r.p.client.business) ?? []), r])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {[...m.entries()].map(([name, list]) => {
        const approved = list.reduce((a, r) => a + r.p.brd.approved, 0)
        const action = list.some((r) => brdGroup(r.v) === 'needs')
        return (
          <div key={name} className="pan pad">
            <div className="row jb">
              <div className="col" style={{ gap: 1 }}>
                <span className="h2">{name}</span>
                <span className="s12 mut">
                  {plural(list.length, 'project')}
                  {approved ? ` · ${inr(approved)} approved` : ''}
                </span>
              </div>
              {action && <Tag cls="t-red">Action needed</Tag>}
            </div>
            {list.map((r) => (
              <button key={r.p.id} type="button" className="row jb s13" style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: r.v === 'rejected' ? '#FDF6F5' : '#F4F1EC', borderRadius: 10 }} onClick={() => go(r.v === 'rejected' ? `/brds/${r.p.id}/fix` : `/brds/${r.p.id}`)}>
                <span className="b">{offeringName(state, r.p)}</span>
                <Tag cls={BRD_TAG[r.v].cls}>{r.v === 'rejected' ? `Rejected · ${deadlineLeft(r.p.brd.deadline).replace(' left', '')}` : BRD_TAG[r.v].text}</Tag>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function ReviewTimeline({ p }: { p: Project }) {
  const delayed = p.brd.delayed || (p.brd.decisionBy && daysUntil(p.brd.decisionBy) < 0)
  const auto = p.brd.history.find((h) => h.text === 'Auto-review started' && (!p.brd.submittedAt || h.at >= p.brd.submittedAt))
  const steps = [
    { done: true, icon: 'check', title: `Submitted by ${p.brd.submittedBy ?? 'your team'}`, sub: p.brd.submittedAt ? fmtDateTime(p.brd.submittedAt) : '' },
    auto
      ? { done: true, icon: 'check', title: 'Auto-review started', sub: fmtDate(auto.at) }
      : { done: false, icon: 'clock', title: 'Auto-review', sub: 'Starts shortly', amber: true },
    { done: false, icon: delayed ? 'clock' : 'file', title: 'Decision', sub: delayed ? 'Taking longer than usual' : `Expected by ${p.brd.decisionBy ? fmtDate(p.brd.decisionBy) : 'soon'}`, amber: true },
  ]
  return (
    <div className="col" style={{ gap: 10 }}>
      {steps.map((s, i) => (
        <div key={i} className="tli" style={{ alignItems: 'center' }}>
          <div className="tld sm" style={s.done ? { background: '#EAE5DC', color: '#111111' } : s.amber ? { background: '#EAE5DC', color: '#111111' } : undefined}>
            <Icon n={s.icon} s="sm" />
          </div>
          <div className="col f1" style={{ gap: 1 }}>
            <span className="s13 b">{s.title}</span>
            <span className={`s12 ${s.amber && delayed && i === 2 ? 'td' : 'mut'}`}>{s.sub}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Simulate({ p }: { p: Project }) {
  const { state, mutate, toast } = useStore()
  if (!state.sys.reviewSim) return null
  return (
    <div className="proto">
      <span className="s12 fnt b">Prototype · act as the reviewer</span>
      <div className="row">
        <button type="button" className="btn sm gw f1" onClick={() => decide(state, mutate, toast, p.id, 'approve')}>
          Approve
        </button>
        <button type="button" className="btn sm rl f1" onClick={() => decide(state, mutate, toast, p.id, 'reject')}>
          Reject
        </button>
      </div>
    </div>
  )
}

function SidePanel({ r, onClose }: { r: Row; onClose: () => void }) {
  const { state } = useStore()
  const { p, v } = r
  const a = brdAmounts(p)
  const ts = targets(p)
  const head = (
    <>
      <div className="row jb">
        <span className="s12 fnt b">SELECTED BRD</span>
        <button type="button" className="btn gh sm" style={{ width: 28, height: 28, padding: 0 }} onClick={onClose} aria-label="Close panel">
          <Icon n="x" s="sm" />
        </button>
      </div>
      <div className="col" style={{ gap: 3 }}>
        <span className="h2">{p.client.business}</span>
        <span className="s13 mut">
          {offeringName(state, p)} · {v === 'partly' || v === 'approved' ? `${inr(p.value)} total` : `${inr(a.claimed || p.value)} ${a.claimed ? 'claimed' : 'value'}`}
        </span>
      </div>
    </>
  )
  let body: ReactNode
  if (v === 'submitted' || v === 'auto') {
    const proofs = p.payments.reduce((n, x) => n + x.receipts.length, 0)
    const ix = state.leads.find((l) => l.id === p.leadId)?.interactions.length ?? 0
    body = (
      <>
        <div className="hr" />
        <span className="b s13">Review status</span>
        <ReviewTimeline p={p} />
        <div className="hr" />
        <div className="row jb s13">
          <span className="mut">Phases paid</span>
          <span className="b">
            {ts.filter((t) => verifiedOn(p, t.key) >= t.expected).length} of {ts.length}
          </span>
        </div>
        <div className="row jb s13">
          <span className="mut">Payment proofs</span>
          <span className="b">{plural(proofs, 'screenshot')}</span>
        </div>
        <div className="row jb s13">
          <span className="mut">Interactions</span>
          <span className="b">{ix} logged</span>
        </div>
        <button type="button" className="btn" onClick={() => go(`/brds/${p.id}`)}>
          <Icon n="file" />
          View submitted BRD
        </button>
        <span className="s12 fnt">Locked while the auto-review runs.</span>
        <Simulate p={p} />
      </>
    )
  } else if (v === 'partly' || v === 'approved') {
    body = (
      <>
        <Bar pct={(a.approved / p.value) * 100} g h={8} />
        {ts.map((t) => {
          const ok = Math.min(t.expected, verifiedOn(p, t.key))
          const pend = t.expected - ok
          return (
            <div key={t.key} className="col" style={{ gap: 4 }}>
              {ok > 0 && (
                <div className="row jb s13">
                  <span className="row" style={{ gap: 6 }}>
                    <Icon n="ccheck" s="sm" className="gd" />
                    {t.short}
                    {pend > 0 ? ', part' : ''}
                  </span>
                  <span className="b gd">{inr(ok)} approved</span>
                </div>
              )}
              {pend > 0 && (
                <div className="row jb s13">
                  <span className="row" style={{ gap: 6 }}>
                    <Icon n="clock" s="sm" className={loggedOn(p, t.key) > ok ? 'td' : 'fnt'} />
                    {t.short}
                    {ok > 0 ? ', rest' : ''}
                  </span>
                  <span className={`b ${loggedOn(p, t.key) > ok ? 'td' : 'mut'}`}>{inr(pend)} pending</span>
                </div>
              )}
            </div>
          )
        })}
        {v === 'partly' && (
          <div className="tip n">
            <Icon n="info" s="sm" style={{ marginTop: 1 }} />
            <span>When you log the next payment in the project, it's added here and goes for a quick review of that amount only.</span>
          </div>
        )}
        <div className="row">
          <button type="button" className="btn f1" onClick={() => go(`/brds/${p.id}`)}>
            <Icon n="file" />
            View BRD
          </button>
          <button type="button" className="btn" onClick={() => go(`/brds/${p.id}?print=1`)}>
            <Icon n="dl" />
            PDF
          </button>
        </div>
      </>
    )
  } else if (v === 'rejected' || v === 'closed') {
    body = (
      <>
        <div className="col" style={{ gap: 4, background: '#FBF1EF', borderRadius: 10, padding: '10px 12px' }}>
          <span className="s12 b" style={{ color: '#A93226' }}>
            Reason from auto-review
          </span>
          <span className="s13" style={{ lineHeight: 1.45 }}>
            {p.brd.reason}
          </span>
        </div>
        <span className="s12 fnt b">RESUBMISSION TIMELINE</span>
        {[
          ['send', '#EAE5DC', '#111111', `Submitted by ${p.brd.submittedBy}`, p.brd.submittedAt ? fmtDate(p.brd.submittedAt) : ''],
          ['x', '#FBE9E6', '#C0392B', 'Rejected', `${p.brd.rejectedAt ? fmtDate(p.brd.rejectedAt) : ''} · 3-day window opens`],
          ['redo', '#EAE5DC', '#111111', 'Resubmit', `By ${p.brd.deadline ? fmtDateTime(p.brd.deadline) : ''}`],
          ['clock', undefined, undefined, 'Auto-review again', 'Runs as soon as you resubmit'],
        ].map(([ic, b, f, t, s]) => (
          <div key={t} className="tli" style={{ alignItems: 'center' }}>
            <div className="tld sm" style={{ background: b, color: f }}>
              <Icon n={ic!} s="sm" />
            </div>
            <div className="col f1" style={{ gap: 1 }}>
              <span className="s13 b">{t}</span>
              <span className="s12 mut">{s}</span>
            </div>
          </div>
        ))}
        <button type="button" className="btn pri" onClick={() => go(`/brds/${p.id}/fix`)}>
          <Icon n="redo" />
          Fix and resubmit
        </button>
      </>
    )
  } else {
    const miss = projectMissing(p)
    body = (
      <>
        {miss.length ? (
          <>
            <span className="b s13">{plural(miss.length, 'thing')} missing</span>
            {miss.map((m) => (
              <div key={m.key} className="row s13">
                <Icon n="alert" s="sm" className="od" />
                <span className="f1">{m.label}</span>
              </div>
            ))}
          </>
        ) : (
          <span className="s13 mut">{a.verified ? `${inr(a.verified)} verified and ready to claim.` : 'Log and verify a payment to make this BRD ready.'}</span>
        )}
        <button type="button" className={`btn ${v === 'ready' ? 'drk' : ''}`} onClick={() => go(v === 'ready' ? `/brds/${p.id}` : `/projects/${p.id}`)}>
          {v === 'ready' ? 'Review & submit' : 'Open project'}
        </button>
      </>
    )
  }
  return (
    <div className="pan" style={{ width: 360, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>
      {head}
      {body}
    </div>
  )
}
