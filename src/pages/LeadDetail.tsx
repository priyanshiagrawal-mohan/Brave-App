import { useEffect, useMemo, useState } from 'react'
import { MODE_ICON, MODE_LABEL, SOURCE_LABEL, STAGES, STAGE_LABEL, STAGE_SHORT, STAGE_TAG } from '../data/constants'
import { activeLeads, followUp, offeringName, progressCount, projectStatus, receivedOf, verifiedOf } from '../data/derive'
import type { Interaction, Lead } from '../data/types'
import { fmtDate, fmtDateTime, inr, plural } from '../lib/format'
import { back, go } from '../router'
import { Page } from '../Shell'
import { useStore } from '../store'
import { Banner, Bar, Center, Icon, Tag, Thumb } from '../ui'
import { useLeadActions } from './LeadActions'

function Stepper({ l }: { l: Lead }) {
  const idx = l.status === 'won' ? 4 : STAGES.indexOf(l.stage)
  const steps = [...STAGES.map((s) => (s === 'raw' ? 'Raw lead' : STAGE_SHORT[s])), 'Won']
  return (
    <div className="row" style={{ gap: 4 }} aria-label={`Stage ${idx + 1} of 5`}>
      {steps.map((s, i) => (
        <div key={s} className={`stp ${i <= idx ? 'dn' : ''} ${i === idx ? 'cur' : ''} ${i === 4 && l.status === 'won' ? 'won' : ''}`}>
          <i />
          {s}
        </div>
      ))}
    </div>
  )
}

function StatusTags({ l, big }: { l: Lead; big?: boolean }) {
  const f = followUp(l)
  return (
    <div className="row wr">
      {l.status === 'won' ? (
        <Tag cls="t-grn" icon="check">
          Won {l.statusAt ? fmtDate(l.statusAt) : ''}
        </Tag>
      ) : l.status === 'lost' ? (
        <>
          <Tag cls="t-drf">Archived</Tag>
          <span className="s12 mut">{l.claimed ? 'Claimed by another team' : `Lost ${l.statusAt ? fmtDate(l.statusAt) : ''} · ${l.lostReason ?? ''}`}</span>
        </>
      ) : (
        <>
          <Tag cls={STAGE_TAG[l.stage]}>{STAGE_LABEL[l.stage]}</Tag>
          {l.muted ? (
            <Tag cls="t-drf" icon="mute">
              Muted
            </Tag>
          ) : (
            <span className={`${big ? 's13' : 's12'} ${f.cls}`}>{f.text}</span>
          )}
        </>
      )}
    </div>
  )
}

function ixTitle(x: Interaction, withBy: boolean) {
  const base = x.wonMarked ? 'Marked Won' : `${MODE_LABEL[x.mode]}${x.leadAdded ? ' · Lead added' : ''}`
  return withBy ? `${base}${x.leadAdded ? ' by ' : ' · '}${x.by}` : base
}

function Timeline({ l, desk }: { l: Lead; desk?: boolean }) {
  const items = [...l.interactions].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <div className="col" style={{ gap: 0 }}>
      {items.map((x, i) => {
        const icon = x.wonMarked ? 'hand' : MODE_ICON[x.mode]
        const moved = x.stageTo && x.stageTo !== x.stageFrom
        return (
          <div key={x.id} className="tli" style={{ paddingTop: i ? 14 : 0 }}>
            <div className="tld" style={i === 0 && moved ? { background: '#111111', color: '#fff' } : undefined}>
              <Icon n={icon} s="sm" />
            </div>
            <div className="tlc">
              <div className="row jb">
                <span className="b s13">{ixTitle(x, !!desk || x.wonMarked === true)}</span>
                <span className="s12 fnt" style={{ flex: 'none' }}>
                  {desk ? fmtDateTime(x.at) : x.date !== x.at.slice(0, 10) && x.leadAdded ? fmtDate(x.date) : x.flagged ? fmtDateTime(x.at) : fmtDate(x.date)}
                </span>
              </div>
              <span className="s13 mut" style={{ lineHeight: 1.45 }}>
                {x.notes}
              </span>
              <div className="row wr" style={{ gap: 6 }}>
                {moved && <Tag cls={STAGE_TAG[x.stageTo!]}>{desk && x.stageFrom ? `${STAGE_LABEL[x.stageFrom]} → ${STAGE_LABEL[x.stageTo!]}` : `→ ${STAGE_LABEL[x.stageTo!]}`}</Tag>}
                {x.leadAdded && l.photo && <Thumb f={l.photo} w={56} h={44} />}
                {x.location === 'ok' && (x.leadAdded || x.mode === 'visit') && (
                  <Tag cls="t-grn" icon="pin">
                    Location
                  </Tag>
                )}
                {x.location === 'none' && (
                  <Tag cls="t-ter" icon="pin">
                    No location · in review
                  </Tag>
                )}
                {x.flagged && <Tag cls="t-ter">In review</Tag>}
                {x.pending && (
                  <Tag cls="t-ter" icon="cloud">
                    Waiting to sync
                  </Tag>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InfoGrid({ l }: { l: Lead }) {
  const cell = (k: string, v: React.ReactNode, span = 1) => (
    <div className="col" style={{ gap: 1, gridColumn: `span ${span}` }}>
      <span className="s12 fnt">{k}</span>
      <span>{v || '—'}</span>
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }} className="s13">
      {cell('Owner', l.owner)}
      {cell('Phone', <a href={`tel:+91${l.phone}`} style={{ color: 'inherit' }}>+91 {l.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</a>)}
      {cell('Type', l.type)}
      {cell('Source', SOURCE_LABEL[l.source])}
      {cell('Location', l.location ? <span className="gd">{l.location.area} ✓</span> : [l.area, l.city].filter(Boolean).join(', ') || 'Not recorded')}
      {cell('First contact', fmtDate(l.firstContact))}
      {l.sourceNote && cell('How we know them', l.sourceNote, 2)}
      {cell('Problem identified', l.problem, 2)}
      {l.notes && cell('Notes', l.notes, 2)}
      {(l.photo || l.proof?.length) && (
        <div className="col" style={{ gap: 4, gridColumn: 'span 2' }}>
          <span className="s12 fnt">Photos & proof</span>
          <div className="row wr">
            {l.photo && <Thumb f={l.photo} w={56} h={56} />}
            {l.proof?.map((p) => (
              <Thumb key={p.id} f={p} w={56} h={56} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Banners({ l }: { l: Lead }) {
  const { mutate, toast } = useStore()
  const la = useLeadActions()
  const flagged = l.interactions.filter((x) => x.flagged).length
  return (
    <>
      {l.claimed && (
        <Banner tone="amb" icon="info">
          Another team proved earlier contact ({fmtDate(l.claimed.theirs)}). This lead moved to your archive. Your interactions stay in its history.
        </Banner>
      )}
      {l.status === 'lost' && !l.claimed && (
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', padding: 12, background: '#F7F5F1' }}>
          <Icon n="arch" className="mut" />
          <span className="s13 f1">
            In Archive. Recover it to bring it back at <b>{STAGE_LABEL[l.stage]}</b>.
          </span>
          <button type="button" className="btn sm" onClick={() => la.recoverFor(l)}>
            <Icon n="undo" s="sm" />
            Recover
          </button>
        </div>
      )}
      {l.muted && (
        <>
          <Banner tone="amb" icon="mute">
            Muted until {fmtDate(l.muted.until)}. No reminders or triggers for this lead. Unmute it or mark it Lost.
          </Banner>
          <div className="row">
            <button
              type="button"
              className="btn sm f1"
              onClick={() => {
                mutate((d) => {
                  d.leads.find((x) => x.id === l.id)!.muted = undefined
                })
                toast(`${l.business} unmuted`)
              }}
            >
              Unmute
            </button>
            <button type="button" className="btn sm rl f1" onClick={() => la.loseFor(l)}>
              Mark Lost
            </button>
          </div>
        </>
      )}
      {flagged > 0 && (
        <Banner tone="amb" icon="eye">
          <b>{plural(flagged, 'interaction needs', 'interactions need')} a review.</b> They were logged within 2 minutes, with the same note. They earn no credit until your mentor reviews them.
        </Banner>
      )}
    </>
  )
}

function WonProjects({ l }: { l: Lead }) {
  const { state } = useStore()
  const ps = state.projects.filter((p) => p.leadId === l.id)
  return (
    <>
      {ps.map((p) => {
        const st = projectStatus(p)
        const v = verifiedOf(p)
        return (
          <button key={p.id} type="button" className="card click" style={{ padding: 12, gap: 6 }} onClick={() => go(`/projects/${p.id}`)}>
            <div className="row jb">
              <span className="b s13">{offeringName(state, p)}</span>
              <Tag cls={st.cls}>{st.text}</Tag>
            </div>
            {st.text !== 'Paid' && p.value > 0 && (
              <>
                <Bar pct={(v / p.value) * 100} g />
                <span className="s12 mut">
                  {inr(v)} of {inr(p.value)} verified
                  {receivedOf(p) > v ? ` · ${inr(receivedOf(p) - v)} pending` : ''}
                </span>
              </>
            )}
            {p.value === 0 && <span className="s12 td">Add the offering, plan and proof</span>}
          </button>
        )
      })}
      <button type="button" className="lnk mut" style={{ alignSelf: 'flex-start' }} onClick={() => go(`/projects/new?lead=${l.id}`)}>
        <Icon n="plus" s="sm" />
        Another project for this client
      </button>
    </>
  )
}

export function LeadDetailPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state } = useStore()
  const l = state.leads.find((x) => x.id === id)
  if (!l) {
    return (
      <Page mobile={mobile} desk="leads">
        <Center icon="search" title="Lead not found">
          <button type="button" className="btn" onClick={() => go('/leads')}>
            Back to Leads
          </button>
        </Center>
      </Page>
    )
  }
  return mobile ? <LeadPhone l={l} /> : <LeadDesk l={l} />
}

function LeadPhone({ l }: { l: Lead }) {
  const la = useLeadActions()
  const [info, setInfo] = useState(false)
  const active = l.status === 'active'
  const prog = progressCount(l)
  return (
    <Page
      mobile
      header={
        <div className="hbar">
          <button type="button" className="row s13 b" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => back(l.status === 'lost' || l.muted ? '/leads/archive' : '/leads')}>
            <Icon n="left" />
            {l.status === 'lost' || l.muted ? 'Archive' : 'Leads'}
          </button>
          <button type="button" className="btn gh sm" style={{ width: 34, height: 34, padding: 0 }} onClick={() => la.moreFor(l)} aria-label="More actions">
            <Icon n="more" className="mut" />
          </button>
        </div>
      }
    >
      <div className="scr">
        <div className="col" style={{ gap: 6 }}>
          <span className="h1">{l.business}</span>
          <StatusTags l={l} />
        </div>
        {!l.claimed && <Stepper l={l} />}
        <Banners l={l} />
        {l.status === 'won' && <WonProjects l={l} />}
        <div className="card" style={{ padding: 12, gap: 10 }}>
          <button type="button" className="row" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setInfo((o) => !o)} aria-expanded={info}>
            <div className="col f1" style={{ gap: 1 }}>
              <span className="b s13">Lead info</span>
              <span className="s12 mut ell">{[l.owner, `+91 ${l.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}`, l.area].filter(Boolean).join(' · ')}</span>
            </div>
            <Icon n="down" className="fnt" style={{ transform: info ? 'rotate(180deg)' : undefined }} />
          </button>
          {info && (
            <>
              <div className="hr" />
              <InfoGrid l={l} />
              <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => la.editLead(l)}>
                <Icon n="edit" s="sm" />
                Edit lead info
              </button>
            </>
          )}
        </div>
        <div className="row jb">
          <span className="grp">Timeline · {l.interactions.length}</span>
          <span className="s12 mut">{prog} with progress</span>
        </div>
        <Timeline l={l} />
      </div>
      {active && !l.muted && (
        <div className="bbar">
          <button type="button" className="btn drk" onClick={() => la.logFor(l)}>
            <Icon n="plus" />
            Log interaction
          </button>
          <div className="row">
            <button type="button" className="btn gw f1" onClick={() => la.winFor(l)}>
              <Icon n="check" />
              Won · create project
            </button>
            <button type="button" className="btn rl" onClick={() => la.loseFor(l)}>
              <Icon n="x" />
              Lost
            </button>
          </div>
        </div>
      )}
    </Page>
  )
}

function LeadDesk({ l }: { l: Lead }) {
  const { state } = useStore()
  const la = useLeadActions()
  const [q, setQ] = useState('')
  const list = useMemo(
    () =>
      activeLeads(state)
        .filter((x) => !q.trim() || x.business.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => followUp(a).days - followUp(b).days || a.business.localeCompare(b.business)),
    [state, q],
  )
  const all = activeLeads(state).length

  // ↑ ↓ move between leads
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || document.querySelector('[role=dialog]')) return
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const i = list.findIndex((x) => x.id === l.id)
      const n = list[e.key === 'ArrowDown' ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1)]
      if (n && n.id !== l.id) {
        e.preventDefault()
        go(`/leads/${n.id}`, { replace: true })
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [list, l.id])

  const active = l.status === 'active'
  return (
    <Page mobile={false} desk="leads" bare>
      <div className="split">
        <div className="split-list">
          <div className="in" style={{ minHeight: 38 }}>
            <Icon n="search" s="sm" className="fnt" />
            <input className="s13" placeholder={`Filter ${all} leads`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter leads" />
          </div>
          {list.map((x) => {
            const f = followUp(x)
            const sel = x.id === l.id
            return (
              <button key={x.id} type="button" className="card click" style={{ padding: 12, gap: 4, ...(sel ? { borderColor: '#111111', boxShadow: 'inset 0 0 0 1px #111111' } : {}) }} onClick={() => go(`/leads/${x.id}`, { replace: true })}>
                <div className="row jb">
                  <span className="b ell">{x.business}</span>
                  <Tag cls={STAGE_TAG[x.stage]}>{x.stage === 'raw' ? 'Raw' : STAGE_SHORT[x.stage]}</Tag>
                </div>
                <span className={`s12 ${f.cls}`}>{f.text}</span>
              </button>
            )
          })}
          <span className="s12 fnt" style={{ textAlign: 'center' }}>
            ↑ ↓ to move between leads
          </span>
        </div>
        <div className="split-main">
          <a href={l.status === 'lost' || l.muted ? '#/leads/archive' : '#/leads'} className="s13 mut" style={{ textDecoration: 'none' }}>
            ‹ {l.status === 'lost' || l.muted ? 'Archive' : 'Leads'}
          </a>
          <div className="row jb" style={{ alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 6 }}>
              <span className="h1">{l.business}</span>
              <div className="row wr">
                <StatusTags l={l} big />
                <span className="s13 mut">
                  · {plural(l.interactions.length, 'interaction')} · added {fmtDate(l.addedAt)}
                </span>
              </div>
            </div>
            <div className="row">
              {active && !l.muted && (
                <>
                  <button type="button" className="btn drk" onClick={() => la.logFor(l)}>
                    <Icon n="plus" />
                    Log interaction
                  </button>
                  <button type="button" className="btn gw" onClick={() => la.winFor(l)}>
                    <Icon n="check" />
                    Won
                  </button>
                  <button type="button" className="btn rl" onClick={() => la.loseFor(l)}>
                    <Icon n="x" />
                    Lost
                  </button>
                </>
              )}
              <button type="button" className="btn" style={{ width: 44, padding: 0 }} onClick={() => la.moreFor(l)} aria-label="More actions">
                <Icon n="more" />
              </button>
            </div>
          </div>
          {!l.claimed && <Stepper l={l} />}
          <Banners l={l} />
          {l.status === 'won' && <WonProjects l={l} />}
          <div className="pan pad" style={{ padding: '14px 18px' }}>
            <div className="row jb">
              <span className="b">Lead info</span>
              <button type="button" className="lnk mut" onClick={() => la.editLead(l)}>
                <Icon n="edit" s="sm" />
                Edit
              </button>
            </div>
            <InfoGrid l={l} />
          </div>
          <div className="row jb">
            <span className="grp">Timeline</span>
            <span className="s12 mut">{progressCount(l)} of 3 with progress</span>
          </div>
          <Timeline l={l} desk />
        </div>
      </div>
    </Page>
  )
}
