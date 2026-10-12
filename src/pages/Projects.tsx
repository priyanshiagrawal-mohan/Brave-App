import { useState, type ReactNode } from 'react'
import { brdView, BRD_TAG, nextDue, offeringName, projectMissing, projectStatus, receivedOf, unlockStatus, verifiedOf, wonLeads } from '../data/derive'
import type { Offering, Project } from '../data/types'
import { daysUntil, fmtDate, inr, inrShort, plural, uid } from '../lib/format'
import { go } from '../router'
import { Page, PhoneBrand, PipelineTabs, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, Center, Chip, Field, GateNote, Icon, OverlayHead, Responsive, Seg, Skeleton, Tag, TextArea, TextInput, useGate, useIsMobile } from '../ui'
import { LockedPipeline } from './Home'
import { LoadError, useLoad } from './Leads'

// ---------- Project row (inside a client or offering card) ----------

/** One project as a calm two-line row: name + status, then money and what's due. No nested box, no bar. */
export function ProjectBlock({ p, title }: { p: Project; title?: string }) {
  const { state } = useStore()
  const st = projectStatus(p)
  const miss = projectMissing(p)
  const v = verifiedOf(p)
  const got = receivedOf(p)
  const nd = nextDue(p)
  const draft = st.text === 'Draft'
  const paid = st.text === 'Paid'
  const overdue = !!(nd && nd.target.due && daysUntil(nd.target.due) < 0)
  const tone = draft ? 's-drf' : paid ? 's-done' : overdue ? 's-od' : nd ? 's-due' : 's-ok'
  return (
    <button type="button" className={`prow ${tone}`} onClick={() => go(draft && miss.length ? `/projects/${p.id}/edit` : `/projects/${p.id}`)}>
      <div className="row jb" style={{ gap: 10 }}>
        <span className="prow-t ell">{title ?? offeringName(state, p)}</span>
        <Tag cls={st.cls}>{st.text}</Tag>
      </div>
      {draft && miss.length ? (
        <div className="row jb s13" style={{ gap: 10 }}>
          <span className="prow-warn ell">{miss[0].label === 'Conversation proof' ? 'Add 1–5 proof screenshots' : `${miss[0].label} missing`}</span>
          <span className="prow-act">Finish</span>
        </div>
      ) : (
        <div className="row jb s13" style={{ gap: 10 }}>
          <span className="mut tnum">
            {paid ? (
              <>
                {inr(v)} <span className="gd">received</span>
              </>
            ) : (
              <>
                <b className="prow-num">{inr(v)}</b> of {inr(p.value)}
                {got > v ? ` · ${inrShort(got - v)} pending` : ''}
              </>
            )}
          </span>
          {!paid && nd && nd.target.due && (
            <span className={overdue ? 'od' : 'td'} style={{ whiteSpace: 'nowrap' }}>
              {inrShort(nd.left)} {overdue ? 'overdue' : `due ${fmtDate(nd.target.due)}`}
            </span>
          )}
        </div>
      )}
      {!draft && !paid && p.value > 0 && (
        <span className="prow-bar" aria-hidden>
          <i style={{ width: `${Math.min(100, (v / p.value) * 100)}%` }} />
        </span>
      )}
      {p.pendingSync && (
        <span className="s12 td row" style={{ gap: 4 }}>
          <Icon n="cloud" s="sm" />
          Saved on this phone · syncs when online
        </span>
      )}
    </button>
  )
}

/** A client (or offering) with its projects as rows split by thin dividers. */
function ClientCard({ name, list, leadId, rowTitle, unit = 'project' }: { name: string; list: Project[]; leadId?: string; rowTitle?: (p: Project) => string; unit?: string }) {
  const got = list.reduce((n, p) => n + verifiedOf(p), 0)
  const late = list.filter((p) => {
    const nd = nextDue(p)
    return projectStatus(p).text !== 'Paid' && nd?.target.due && daysUntil(nd.target.due) < 0
  }).length
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className="pcard">
      <div className="pcard-h">
        <span className={`pcard-av ${unit === 'client' ? 'off' : ''}`} aria-hidden>
          {unit === 'client' ? <Icon n="pkg" s="sm" /> : initials}
        </span>
        <span className="col f1" style={{ gap: 2, minWidth: 0 }}>
          <span className="pcard-name ell">{name}</span>
          <span className="pcard-sub">
            {plural(list.length, unit)} · {inr(got)} verified
            {late > 0 && <span className="od"> · {late} overdue</span>}
          </span>
        </span>
      </div>
      <div className="pcard-rows">
        {list.map((p) => (
          <ProjectBlock key={p.id} p={p} title={rowTitle?.(p)} />
        ))}
      </div>
      {leadId && (
        <button type="button" className="pcard-add" onClick={() => go(`/projects/new?lead=${leadId}`)}>
          <Icon n="plus" s="sm" />
          Add another project
        </button>
      )}
    </div>
  )
}

// ---------- Desktop table ----------

const PCOLS = '1.25fr 1.6fr 0.9fr 1.3fr 1.5fr 20px'

/**
 * Desktop: one row per project, grouped by client (or offering). Every row has the same
 * columns, so status, money and the next payment line up and can be scanned top to bottom.
 */
function ProjectTable({ groups, by }: { groups: { name: string; list: Project[]; leadId?: string }[]; by: 'client' | 'offering' }) {
  const { state } = useStore()
  return (
    <div className="pan">
      <div className="tr th" style={{ gridTemplateColumns: PCOLS }}>
        <span>{by === 'client' ? 'Client' : 'Offering'}</span>
        <span>{by === 'client' ? 'Project' : 'Client'}</span>
        <span>Status</span>
        <span>Received</span>
        <span>Next payment</span>
        <span />
      </div>
      {groups.map((g) =>
        g.list.map((p, i) => {
          const st = projectStatus(p)
          const miss = projectMissing(p)
          const v = verifiedOf(p)
          const got = receivedOf(p)
          const nd = nextDue(p)
          const draft = st.text === 'Draft'
          const paid = st.text === 'Paid'
          const overdue = !!(nd && nd.target.due && daysUntil(nd.target.due) < 0)
          const open = () => go(draft && miss.length ? `/projects/${p.id}/edit` : `/projects/${p.id}`)
          return (
            <div key={p.id} className={`tr click ptr ${i === 0 ? 'gstart' : ''}`} style={{ gridTemplateColumns: PCOLS }} onClick={open} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open()}>
              <div className="col" style={{ gap: 2, minWidth: 0, alignSelf: 'start', paddingTop: 2 }}>
                {i === 0 && (
                  <>
                    <span className="b ell">{g.name}</span>
                    {g.leadId && (
                      <button
                        type="button"
                        className="lnk mut s12"
                        style={{ alignSelf: 'flex-start' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          go(`/projects/new?lead=${g.leadId}`)
                        }}
                      >
                        <Icon n="plus" s="sm" />
                        Project
                      </button>
                    )}
                  </>
                )}
              </div>
              <span className="ell" style={{ fontWeight: 600 }}>
                {by === 'client' ? offeringName(state, p) : p.client.business}
              </span>
              <span>
                <Tag cls={st.cls}>{st.text}</Tag>
              </span>
              <span className="s13 tnum">
                {draft ? (
                  <span className="fnt">—</span>
                ) : (
                  <>
                    <b>{inr(v)}</b> <span className="mut">of {inr(p.value)}</span>
                    {got > v && <span className="s12 fnt"> · {inrShort(got - v)} pending</span>}
                  </>
                )}
              </span>
              <span className="s13">
                {draft && miss.length ? (
                  <span className="prow-warn">{miss[0].label === 'Conversation proof' ? 'Add proof screenshots' : `Add ${miss[0].label.toLowerCase()}`}</span>
                ) : paid || !nd ? (
                  <span className="fnt">{paid ? 'All received' : '—'}</span>
                ) : (
                  <span className={overdue ? 'od' : 'td'}>
                    {inr(nd.left)} {overdue ? 'overdue' : `due ${fmtDate(nd.target.due!)}`}
                  </span>
                )}
              </span>
              <Icon n="right" s="sm" className="fnt" />
            </div>
          )
        }),
      )}
    </div>
  )
}

// ---------- Offering form ----------

export function OfferingSheet({ offering, onClose, onSaved }: { offering?: Offering; onClose: () => void; onSaved?: (id: string) => void }) {
  const { mutate, toast } = useStore()
  const mobile = useIsMobile()
  const [name, setName] = useState(offering?.name ?? '')
  const [desc, setDesc] = useState(offering?.description ?? '')
  const [tech, setTech] = useState(offering?.tech.join(', ') ?? '')
  const gate = useGate()
  const missing = [...(name.trim() ? [] : ['Name']), ...(desc.trim() ? [] : ['What it does'])]
  const save = () =>
    gate.run(missing, () => {
      const id = offering?.id ?? uid('off')
      mutate((d) => {
        const o = { id, name: name.trim() || 'Untitled offering', description: desc.trim(), tech: tech.split(',').map((t) => t.trim()).filter(Boolean), createdAt: offering?.createdAt ?? new Date().toISOString() }
        const i = d.offerings.findIndex((x) => x.id === id)
        if (i >= 0) d.offerings[i] = o
        else d.offerings.unshift(o)
      })
      toast(offering ? 'Offering saved' : `${name.trim() || 'Offering'} added to My offerings`)
      onSaved?.(id)
      onClose()
    })
  return (
    <Responsive mobile={mobile} onClose={onClose} label={offering ? 'Edit offering' : 'New offering'} width={480}>
      <OverlayHead title={offering ? 'Edit offering' : 'New offering'} sub="Reused across clients" onClose={onClose} />
      <Field label="Name" req>
        <TextInput bad={gate.tried && !name.trim()} placeholder="e.g. WhatsApp order bot" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="What it does" req>
        <TextArea bad={gate.tried && !desc.trim()} placeholder="One or two lines a shop owner understands" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <Field label="Tech used" hint="optional, comma separated">
        <TextInput placeholder="Node.js, Firebase" value={tech} onChange={(e) => setTech(e.target.value)} />
      </Field>
      <GateNote tried={gate.tried} missing={missing} />
      <button type="button" className="btn pri" onClick={save}>
        {offering ? 'Save offering' : 'Add offering'}
      </button>
    </Responsive>
  )
}

// ---------- Projects page ----------

export function ProjectsPage({ mobile, view }: { mobile: boolean; view: 'projects' | 'offerings' }) {
  const { state } = useStore()
  const [group, setGroup] = useState<'client' | 'offering'>('client')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [newOff, setNewOff] = useState(false)
  const load = useLoad('projects')
  const unlocked = unlockStatus(state).unlocked
  const ql = q.trim().toLowerCase()
  const projects = state.projects.filter((p) => !ql || p.client.business.toLowerCase().includes(ql) || offeringName(state, p).toLowerCase().includes(ql))
  const waiting = wonLeads(state).filter((l) => !state.projects.some((p) => p.leadId === l.id))

  const byClient = new Map<string, Project[]>()
  for (const p of projects) byClient.set(p.client.business, [...(byClient.get(p.client.business) ?? []), p])
  const byOffering = new Map<string, Project[]>()
  for (const p of projects) {
    const k = offeringName(state, p)
    byOffering.set(k, [...(byOffering.get(k) ?? []), p])
  }

  const seg = (
    <Seg
      value={view}
      onChange={(v) => go(v === 'offerings' ? '/projects?view=offerings' : '/projects', { replace: true })}
      options={[
        { value: 'projects', label: 'Projects' },
        { value: 'offerings', label: 'My offerings' },
      ]}
      style={mobile ? undefined : { width: 300 }}
    />
  )

  let body: ReactNode
  if (!unlocked) body = <LockedPipeline />
  else if (load.phase === 'loading') body = <Skeleton />
  else if (load.phase === 'error') body = <LoadError what="projects" onRetry={load.retry} />
  else if (view === 'offerings') body = <OfferingsList onNew={() => setNewOff(true)} mobile={mobile} />
  else if (state.projects.length === 0)
    body = (
      <Center icon="pkg" title="No projects yet" style={{ minHeight: 360 }}>
        <span className="s13 mut" style={{ lineHeight: 1.5, maxWidth: 300 }}>
          A project starts when you mark a lead Won. Your offerings are reused across clients.
        </span>
        <button type="button" className="btn drk" style={{ width: '100%', maxWidth: 320 }} onClick={() => go('/leads')}>
          Go to Leads
        </button>
      </Center>
    )
  else
    body = (
      <>
        <div className="row jb">
          <div className="row" style={{ gap: 6 }}>
            <Chip on={group === 'client'} onClick={() => setGroup('client')}>
              By client
            </Chip>
            <Chip on={group === 'offering'} onClick={() => setGroup('offering')}>
              By offering
            </Chip>
          </div>
          <button type="button" className="btn sm" onClick={() => go('/projects/new')}>
            <Icon n="plus" s="sm" />
            New
          </button>
        </div>
        {waiting.length > 0 && (
          <Banner tone="amb" icon="hand">
            <b>{waiting.map((l) => l.business).join(', ')}</b> {waiting.length === 1 ? 'was' : 'were'} won without a project yet.{' '}
            <button type="button" className="lnk" onClick={() => go(`/projects/new?lead=${waiting[0].id}`)}>
              Add project
            </button>
          </Banner>
        )}
        {mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {group === 'client'
              ? [...byClient.entries()].map(([name, list]) => <ClientCard key={name} name={name} list={list} leadId={list[0].leadId} />)
              : [...byOffering.entries()].map(([name, list]) => <ClientCard key={name} name={name} list={list} unit="client" rowTitle={(p) => p.client.business} />)}
          </div>
        ) : (
          projects.length > 0 && (
            <ProjectTable
              by={group}
              groups={group === 'client' ? [...byClient.entries()].map(([name, list]) => ({ name, list, leadId: list[0].leadId })) : [...byOffering.entries()].map(([name, list]) => ({ name, list }))}
            />
          )
        )}
        {projects.length === 0 && <div className="empty">No projects match “{q}”.</div>}
      </>
    )

  const header = (
    <>
      {searching ? (
        <div className="mh" style={{ gap: 8 }}>
          <div className="in f1" style={{ minHeight: 38 }}>
            <Icon n="search" s="sm" className="fnt" />
            <input autoFocus placeholder="Search clients and offerings" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
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
      <PipelineTabs active="projects" />
    </>
  )

  if (mobile) {
    return (
      <Page mobile bn="pipeline" header={header}>
        <div className="scr">
          {unlocked && seg}
          {body}
        </div>
        {newOff && <OfferingSheet onClose={() => setNewOff(false)} />}
      </Page>
    )
  }
  const total = state.projects.reduce((a, p) => a + p.value, 0)
  const verified = state.projects.reduce((a, p) => a + verifiedOf(p), 0)
  return (
    <Page mobile={false} desk="projects" wide search={unlocked ? { value: q, onChange: setQ, placeholder: 'Search projects' } : undefined}>
      {unlocked && (
        <>
          <div className="row jb">
            <div className="col" style={{ gap: 3 }}>
              <span className="h1">{view === 'offerings' ? 'My offerings' : 'Projects'}</span>
              <span className="s13 mut">{view === 'offerings' ? 'A reusable library. Each offering lists every client it was sold to.' : 'Grouped by client, so repeat work with one business is visible.'}</span>
            </div>
            <div className="row">
              {seg}
              {view === 'offerings' ? (
                <button type="button" className="btn pri" onClick={() => setNewOff(true)}>
                  <Icon n="plus" />
                  New offering
                </button>
              ) : (
                <button type="button" className="btn pri" onClick={() => go('/projects/new')}>
                  <Icon n="plus" />
                  New project
                </button>
              )}
            </div>
          </div>
          {view === 'projects' && state.projects.length > 0 && (
            <div className="row" style={{ gap: 12 }}>
              <div className="stat" style={{ padding: 14 }}>
                <span className="s12 mut">Projects</span>
                <span className="num">{state.projects.length}</span>
              </div>
              <div className="stat" style={{ padding: 14 }}>
                <span className="s12 mut">Verified</span>
                <span className="num gd">{inr(verified)}</span>
              </div>
              <div className="stat" style={{ padding: 14 }}>
                <span className="s12 mut">Expected</span>
                <span className="num">{inr(total)}</span>
              </div>
              <div className="stat" style={{ padding: 14 }}>
                <span className="s12 mut">Drafts</span>
                <span className="num">{state.projects.filter((p) => projectStatus(p).text === 'Draft').length}</span>
              </div>
            </div>
          )}
        </>
      )}
      {body}
      {newOff && <OfferingSheet onClose={() => setNewOff(false)} />}
    </Page>
  )
}

function OfferingsList({ onNew, mobile }: { onNew: () => void; mobile: boolean }) {
  const { state } = useStore()
  return (
    <>
      {mobile && (
        <button type="button" className="btn" onClick={onNew}>
          <Icon n="plus" />
          New offering
        </button>
      )}
      <div style={mobile ? { display: 'flex', flexDirection: 'column', gap: 12 } : { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'start' }}>
        {state.offerings.map((o) => {
          const clients = new Set(state.projects.filter((p) => p.offeringId === o.id).map((p) => p.client.business)).size
          return (
            <button key={o.id} type="button" className="card click" style={{ padding: 12, gap: 8, borderStyle: clients ? undefined : 'dashed' }} onClick={() => go(`/offerings/${o.id}`)}>
              <div className="row jb">
                <span className="b" style={{ fontSize: 15 }}>
                  {o.name}
                </span>
                {clients ? <Tag cls="t-grn">{plural(clients, 'client')}</Tag> : <Tag cls="t-raw">Not sold yet</Tag>}
              </div>
              {o.description && <span className="s13 mut">{o.description}</span>}
              {o.tech.length > 0 && (
                <div className="row wr" style={{ gap: 5 }}>
                  {o.tech.map((t) => (
                    <Tag key={t} cls="t-raw">
                      {t}
                    </Tag>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function OfferingDetailPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state } = useStore()
  const [edit, setEdit] = useState(false)
  const o = state.offerings.find((x) => x.id === id)
  if (!o) {
    return (
      <Page mobile={mobile} desk="projects" header={<SubBar title="Offering" fallback="/projects?view=offerings" />}>
        <Center icon="pkg" title="Offering not found" />
      </Page>
    )
  }
  const ps = state.projects.filter((p) => p.offeringId === o.id)
  const received = ps.reduce((a, p) => a + verifiedOf(p), 0)
  const expected = ps.reduce((a, p) => a + p.value, 0)
  const approved = ps.filter((p) => ['approved', 'partly'].includes(brdView(p))).length
  const stats: [string, string][] = [
    ['Clients', String(new Set(ps.map((p) => p.client.business)).size)],
    ['Received', inr(received)],
    ['Expected', inr(expected)],
    ['BRDs approved', String(approved)],
  ]
  const status = (p: Project) => {
    const v = brdView(p)
    if (v === 'approved' || v === 'partly' || v === 'rejected' || v === 'submitted' || v === 'auto') return { text: `BRD ${BRD_TAG[v].text.toLowerCase()}`, cls: BRD_TAG[v].cls }
    return projectStatus(p)
  }
  return (
    <Page mobile={mobile} desk="projects" wide header={<SubBar title="Offering" fallback="/projects?view=offerings" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 16 }}>
        <div className={mobile ? 'col' : 'row jb'} style={{ alignItems: 'flex-start', gap: 12 }}>
          <div className="col" style={{ gap: 8, maxWidth: 640 }}>
            {!mobile && (
              <span className="s13 mut">
                <a href="#/projects?view=offerings" style={{ color: 'inherit', textDecoration: 'none' }}>
                  My offerings
                </a>{' '}
                › {o.name}
              </span>
            )}
            <span className="h1">{o.name}</span>
            <span className="mut" style={{ lineHeight: 1.5 }}>
              {o.description}
            </span>
            <div className="row wr" style={{ gap: 6 }}>
              {o.tech.map((t) => (
                <Tag key={t} cls="t-raw">
                  {t}
                </Tag>
              ))}
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => setEdit(true)}>
              <Icon n="edit" />
              Edit
            </button>
            <button type="button" className="btn pri" onClick={() => go(`/projects/new?offering=${o.id}`)}>
              <Icon n="plus" />
              Use in a new project
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
          {stats.map(([k, v]) => (
            <div key={k} className="stat" style={{ padding: 14 }}>
              <span className="s12 mut">{k}</span>
              <span className="num">{v}</span>
            </div>
          ))}
        </div>
        <div className="pan">
          <div className="row" style={{ padding: '14px 18px' }}>
            <span className="b">Sold to</span>
          </div>
          {!mobile && (
            <div className="tr th" style={{ gridTemplateColumns: '1.6fr 1.2fr 1fr 1.4fr 40px' }}>
              <span>Client</span>
              <span>Status</span>
              <span>Started</span>
              <span>Received</span>
              <span />
            </div>
          )}
          {ps.map((p) => {
            const st = status(p)
            return mobile ? (
              <button key={p.id} type="button" className="tr click" style={{ all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderTop: '1px solid #F0ECE6', width: '100%', cursor: 'pointer' }} onClick={() => go(`/projects/${p.id}`)}>
                <div className="col f1" style={{ gap: 3 }}>
                  <span className="b">{p.client.business}</span>
                  <span className="s12 mut">
                    {inr(verifiedOf(p))} / {inr(p.value)} · since {fmtDate(p.createdAt)}
                  </span>
                </div>
                <Tag cls={st.cls}>{st.text}</Tag>
              </button>
            ) : (
              <div key={p.id} className="tr click" style={{ gridTemplateColumns: '1.6fr 1.2fr 1fr 1.4fr 40px' }} onClick={() => go(`/projects/${p.id}`)}>
                <span className="b">{p.client.business}</span>
                <span>
                  <Tag cls={st.cls}>{st.text}</Tag>
                </span>
                <span className="s13 mut">{fmtDate(p.createdAt)}</span>
                <span className={`s13 ${verifiedOf(p) ? '' : 'mut'}`}>
                  {inr(verifiedOf(p))} / {inr(p.value)}
                </span>
                <Icon n="right" className="fnt" />
              </div>
            )
          })}
          {ps.length === 0 && <div className="empty">Not sold yet. Use it when you create a project from a won lead.</div>}
        </div>
      </div>
      {edit && <OfferingSheet offering={o} onClose={() => setEdit(false)} />}
    </Page>
  )
}
