import { useState } from 'react'
import { DateField } from '../Calendar'
import { loggedOn, wonLeads } from '../data/derive'
import type { FileRef, Phase, Project } from '../data/types'
import { addDays, ago, fmtDate, fmtRange, inr, today, uid } from '../lib/format'
import { back, go, useRoute } from '../router'
import { Page, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, Center, Field, FilePick, GateNote, Icon, ImageList, Label, OverlayHead, Responsive, Select, Tag, TextArea, TextInput, Thumb, useGate, useIsMobile } from '../ui'
import { OfferingSheet } from './Projects'

// ---------- Payment plan ----------

export interface PlanDraft {
  value: number
  advance: { amount: number; due: string } | null
  phases: Phase[]
}

export const planSum = (p: PlanDraft) => (p.advance?.amount ?? 0) + p.phases.reduce((a, x) => a + x.amount, 0)

const num = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const money = (n: number) => (n ? n.toLocaleString('en-IN') : '')

type Editing = { kind: 'advance' } | { kind: 'phase'; id: string | null }

function PhaseSheet({ plan, editing, onClose, onSave, project }: { plan: PlanDraft; editing: Editing; onClose: () => void; onSave: (p: PlanDraft) => void; project?: Project }) {
  const mobile = useIsMobile()
  const isAdv = editing.kind === 'advance'
  const ph = editing.kind === 'phase' && editing.id ? plan.phases.find((x) => x.id === editing.id) : undefined
  const idx = ph ? plan.phases.indexOf(ph) : plan.phases.length
  const [f, setF] = useState(() => ({
    name: ph?.name ?? `Phase ${idx + 1} · `,
    deliverables: ph?.deliverables ?? '',
    start: ph?.start ?? '',
    end: ph?.end ?? '',
    amount: isAdv ? plan.advance?.amount ?? 0 : ph?.amount ?? Math.max(0, plan.value - planSum(plan)),
    due: isAdv ? plan.advance?.due ?? addDays(today(), 3) : ph?.due ?? '',
  }))
  const gate = useGate()
  const paid = project && ph ? loggedOn(project, ph.id) : project && isAdv ? loggedOn(project, 'advance') : 0
  const missing = [
    ...(!isAdv && !f.name.replace(/^Phase \d+ · $/, '').trim() ? ['Milestone name'] : []),
    ...(!f.amount ? ['Amount'] : []),
    ...(!f.due ? ['Due date'] : []),
    ...(!isAdv && (!f.start || !f.end) ? ['Start and end dates'] : []),
  ]
  const save = () =>
    gate.run(missing, () => {
      if (isAdv) onSave({ ...plan, advance: { amount: f.amount, due: f.due || addDays(today(), 3) } })
      else {
        const next: Phase = { id: ph?.id ?? uid('ph'), name: f.name.trim() || `Phase ${idx + 1}`, deliverables: f.deliverables.trim() || undefined, start: f.start || undefined, end: f.end || undefined, amount: f.amount, due: f.due || f.end || addDays(today(), 14), done: ph?.done }
        onSave({ ...plan, phases: ph ? plan.phases.map((x) => (x.id === ph.id ? next : x)) : [...plan.phases, next] })
      }
      onClose()
    })
  return (
    <Responsive mobile={mobile} onClose={onClose} label={isAdv ? 'Advance' : 'Milestone'} width={480}>
      <OverlayHead title={isAdv ? 'Advance' : ph ? 'Edit milestone' : 'Add milestone'} sub={isAdv ? 'Paid before work starts' : 'A part of the work with its own payment'} onClose={onClose} />
      {!isAdv && (
        <>
          <Field label="Name" req>
            <TextInput bad={gate.tried && missing.includes('Milestone name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Phase 1 · Order flow" />
          </Field>
          <Field label="Deliverables">
            <TextInput value={f.deliverables} onChange={(e) => setF({ ...f, deliverables: e.target.value })} placeholder="Menu, cart, order confirmation" />
          </Field>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <Field label="Starts" req style={{ flex: 1 }}>
              <DateField title="Starts" value={f.start} onChange={(v) => setF({ ...f, start: v })} bad={gate.tried && !f.start} display={fmtDate} placeholder="Date" />
            </Field>
            <Field label="Ends" req style={{ flex: 1 }}>
              <DateField title="Ends" value={f.end} onChange={(v) => setF({ ...f, end: v, due: f.due || addDays(v, 3) })} min={f.start || undefined} bad={gate.tried && !f.end} display={fmtDate} placeholder="Date" />
            </Field>
          </div>
        </>
      )}
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Field label="Amount" req style={{ flex: 1 }}>
          <TextInput bad={gate.tried && !f.amount} inputMode="numeric" icon={undefined} right={undefined} value={money(f.amount)} onChange={(e) => setF({ ...f, amount: num(e.target.value) })} placeholder="₹" />
        </Field>
        <Field label="Due by" req style={{ flex: 1 }}>
          <DateField title="Due by" value={f.due} onChange={(v) => setF({ ...f, due: v })} bad={gate.tried && !f.due} display={fmtDate} placeholder="Date" />
        </Field>
      </div>
      {paid > 0 && <span className="s12 mut">{inr(paid)} already logged against this.</span>}
      <GateNote tried={gate.tried} missing={missing} />
      <button type="button" className="btn pri" onClick={save}>
        {isAdv ? 'Save advance' : ph ? 'Save milestone' : 'Add milestone'}
      </button>
      {(ph || (isAdv && plan.advance)) && paid === 0 && (
        <button
          type="button"
          className="btn gh"
          style={{ color: '#C0392B' }}
          onClick={() => {
            onSave(isAdv ? { ...plan, advance: null } : { ...plan, phases: plan.phases.filter((x) => x.id !== ph!.id) })
            onClose()
          }}
        >
          {isAdv ? 'Remove advance' : 'Delete milestone'}
        </button>
      )}
    </Responsive>
  )
}

export function PlanEditor({ plan, setPlan, showErrors, project, compact }: { plan: PlanDraft; setPlan: (p: PlanDraft) => void; showErrors?: boolean; project?: Project; compact?: boolean }) {
  const [editing, setEditing] = useState<Editing | null>(null)
  const sum = planSum(plan)
  const diff = plan.value - sum
  const off = plan.value > 0 && (plan.phases.length > 0 || plan.advance) && diff !== 0
  const row = (key: string, title: string, amount: number, sub: string, onClick: () => void, bad?: boolean) => (
    <button key={key} type="button" className="card click" style={{ padding: '11px 12px', gap: 4, borderColor: bad ? '#E3A59C' : undefined }} onClick={onClick}>
      <div className="row jb">
        <span className="b s13">{title}</span>
        <span className={`b s13 ${bad ? 'od' : ''}`}>{inr(amount)}</span>
      </div>
      <span className="s12 mut">{sub}</span>
    </button>
  )
  const last = plan.phases[plan.phases.length - 1]
  return (
    <div className="col" style={{ gap: 10 }}>
      <Field label="Project value" req>
        <TextInput boxClass="big" bad={showErrors && !plan.value} inputMode="numeric" value={money(plan.value)} onChange={(e) => setPlan({ ...plan, value: num(e.target.value) })} placeholder="₹ 0" right={<span className="s12 mut">total</span>} icon={undefined} />
      </Field>
      {!compact && <span className="grp">Advance + milestones</span>}
      {plan.advance
        ? row('adv', 'Advance', plan.advance.amount, `Due ${fmtDate(plan.advance.due)}`, () => setEditing({ kind: 'advance' }))
        : (
          <button type="button" className="lnk mut" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing({ kind: 'advance' })}>
            <Icon n="plus" s="sm" />
            Add an advance (optional)
          </button>
        )}
      {plan.phases.map((ph, i) =>
        row(ph.id, ph.name || `Milestone ${i + 1}`, ph.amount, [ph.start && ph.end ? fmtRange(ph.start, ph.end) : 'Dates missing', `due ${fmtDate(ph.due)}`].join(' · '), () => setEditing({ kind: 'phase', id: ph.id }), (off && ph === last) || (showErrors && (!ph.start || !ph.end))),
      )}
      <button type="button" className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing({ kind: 'phase', id: null })}>
        + Add milestone
      </button>
      {off && (
        <Banner tone="red" icon="alert">
          Plan adds up to <b>{inr(sum)}</b>, {inr(Math.abs(diff))} {diff > 0 ? 'short of' : 'more than'} the project value. Change a milestone or the value.
        </Banner>
      )}
      {!off && plan.value > 0 && sum === plan.value && (
        <span className="s12 gd row" style={{ gap: 4 }}>
          <Icon n="ccheck" s="sm" />
          Plan adds up to {inr(plan.value)}
        </span>
      )}
      {editing && <PhaseSheet plan={plan} editing={editing} project={project} onClose={() => setEditing(null)} onSave={setPlan} />}
    </div>
  )
}

// ---------- Project editor ----------

export function ProjectEditorPage({ id, leadId, mobile }: { id?: string; leadId?: string; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const r = useRoute()
  const existing = id ? state.projects.find((p) => p.id === id) : undefined
  const isNew = !existing || r.query.has('new')
  const won = wonLeads(state)
  const [lead, setLead] = useState<string>(existing?.leadId ?? leadId ?? '')
  const leadObj = state.leads.find((l) => l.id === lead)
  const [offeringId, setOfferingId] = useState<string>(existing?.offeringId ?? r.query.get('offering') ?? '')
  const [problem, setProblem] = useState(existing?.problem ?? leadObj?.problem ?? '')
  const [solution, setSolution] = useState(existing?.solution ?? '')
  const [links, setLinks] = useState<NonNullable<Project['links']>>(existing?.links ?? {})
  const [proof, setProof] = useState<FileRef[]>(existing?.proof ?? [])
  const [agreement, setAgreement] = useState<FileRef | undefined>(existing?.agreement)
  const [plan, setPlan] = useState<PlanDraft>(() => ({ value: existing?.value ?? 0, advance: existing?.advance ?? null, phases: existing?.phases ?? [] }))
  const [newOff, setNewOff] = useState(false)
  const [info, setInfo] = useState(false)
  const gate = useGate()

  if (id && !existing) {
    return (
      <Page mobile={mobile} desk="projects" header={<SubBar title="Project" fallback="/projects" />}>
        <Center icon="pkg" title="Project not found" />
      </Page>
    )
  }

  const offering = state.offerings.find((o) => o.id === offeringId)
  const client = existing?.client ?? (leadObj ? { business: leadObj.business, owner: leadObj.owner, phone: leadObj.phone, area: leadObj.area, city: leadObj.city, source: leadObj.source, location: !!leadObj.location } : undefined)
  const gateMissing = client ? [] : ['Client']
  const draftLeft = [...(offeringId ? [] : ['Project title']), ...(solution.trim() ? [] : ['Solution']), ...(proof.length ? [] : ['Conversation proof'])]
  const offline = !state.sys.online

  const save = () =>
    gate.run(gateMissing, () => {
      if (!client) {
        toast('Pick a won lead first. Opening Leads.', 'info')
        return go('/leads')
      }
      const pid = existing?.id ?? uid('prj')
      const now = new Date().toISOString()
      mutate((d) => {
        const base: Project = existing
          ? structuredClone(existing)
          : { id: pid, leadId: lead, client, offeringId: null, problem: '', solution: '', proof: [], value: 0, advance: null, phases: [], payments: [], createdAt: now, brd: { state: 'none', approved: 0, history: [] } }
        Object.assign(base, { offeringId: offeringId || null, problem: problem.trim(), solution: solution.trim(), links: cleanLinks(links), proof, agreement, value: plan.value, advance: plan.advance, phases: plan.phases, savedAt: now, pendingSync: offline || base.pendingSync })
        const i = d.projects.findIndex((p) => p.id === pid)
        if (i >= 0) d.projects[i] = base
        else d.projects.unshift(base)
      })
      if (offline) toast("Draft saved. It syncs when you're back online.")
      else if (draftLeft.length) toast(`Draft saved · still needed for the BRD: ${draftLeft.join(', ')}`, 'info')
      else toast('Project saved')
      go(`/projects/${pid}`, { replace: true })
    })

  const title = isNew ? 'New project' : 'Edit project'
  const clientCard = client ? (
    <div className="card" style={{ padding: '11px 12px', background: '#F7F5F1', gap: 8 }}>
      <button type="button" className="row" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setInfo((o) => !o)} aria-expanded={info}>
        <Icon n="lock" s="sm" className="fnt" />
        <div className="col f1" style={{ gap: 0 }}>
          <span className="b s13">Client info · {client.business}</span>
          <span className="s12 mut">From the lead</span>
        </div>
        <Icon n="down" className="fnt" style={{ transform: info ? 'rotate(180deg)' : undefined }} />
      </button>
      {info && (
        <div className="col s13" style={{ gap: 3 }}>
          <span>{[client.owner, client.phone && `+91 ${client.phone}`].filter(Boolean).join(' · ')}</span>
          <span className="mut">{[client.area, client.city].filter(Boolean).join(', ')}</span>
          {leadObj && (
            <button type="button" className="lnk s12" style={{ alignSelf: 'flex-start' }} onClick={() => go(`/leads/${leadObj.id}`)}>
              Open lead
            </button>
          )}
        </div>
      )}
    </div>
  ) : (
    <>
      <Banner tone="gry" icon="info">
        Projects start from a won lead. Pick the client first.
      </Banner>
      <Field label="Client" req error={gate.tried && !lead ? 'Pick a lead to continue' : undefined}>
        <Select value={lead} onChange={(v) => { setLead(v); setProblem(state.leads.find((l) => l.id === v)?.problem ?? '') }} placeholder="Select a won lead" bad={gate.tried && !lead} options={won.map((l) => ({ value: l.id, label: l.business }))} />
      </Field>
      <div className="col" style={{ gap: 6 }}>
        {won.slice(0, 4).map((l) => {
          const n = state.projects.filter((p) => p.leadId === l.id).length
          return (
            <button key={l.id} type="button" className={`opt ${lead === l.id ? 'on' : ''}`} onClick={() => { setLead(l.id); setProblem(l.problem) }}>
              <div className="rad" />
              <div className="col f1" style={{ gap: 1 }}>
                <span className="b s13">{l.business}</span>
                <span className="s12 mut">
                  Won {l.statusAt ? fmtDate(l.statusAt) : ''} · {n ? `${n} project${n > 1 ? 's' : ''}` : 'no project yet'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <span className="s12 mut" style={{ lineHeight: 1.5 }}>
        Client not here?{' '}
        <button type="button" className="lnk s12" onClick={() => go('/leads')}>
          Mark the lead Won in Leads first.
        </button>
      </span>
    </>
  )

  const offeringField = (
    <Field label="Project title (offering)" req>
      <Select
        icon="pkg"
        value={offeringId}
        onChange={(v) => (v === '__new' ? setNewOff(true) : setOfferingId(v))}
        placeholder="Pick from My offerings"
        options={[...state.offerings.map((o) => ({ value: o.id, label: o.name })), { value: '__new', label: '+ New offering…' }]}
        right={<span className="s12 fnt">My offerings</span>}
      />
    </Field>
  )
  const descField = offering && (
    <TextArea locked value={offering.description} boxStyle={{ minHeight: 52, color: '#57534D' }} className="s13" aria-label="Offering description" />
  )
  const problemField = (
    <Field label="Problem identified">
      <TextArea boxStyle={{ minHeight: 52 }} className="s13" value={problem} onChange={(e) => setProblem(e.target.value)} />
    </Field>
  )
  const solutionField = (
    <Field label="Solution proposed" req>
      <TextArea boxStyle={{ minHeight: 52 }} className="s13" placeholder="What you'll build for this client" value={solution} onChange={(e) => setSolution(e.target.value)} />
    </Field>
  )
  const linkRow = (k: keyof NonNullable<Project['links']>, icon: string, ph: string) => (
    <TextInput icon={icon} className="s13" inputMode="url" placeholder={ph} value={links[k] ?? ''} onChange={(e) => setLinks((x) => ({ ...x, [k]: e.target.value }))} aria-label={ph} />
  )
  const linksField = (
    <Field label="Solution links" hint="Optional · helps the reviewer see the work">
      <div className="col" style={{ gap: 8 }}>
        {linkRow('live', 'globe', 'Live link, e.g. ganeshjewellers.in')}
        {linkRow('demo', 'video', 'Demo video link')}
        {linkRow('files', 'link', 'Design or code link (Figma, Drive, GitHub)')}
      </div>
    </Field>
  )
  const proofField = (
    <Field label="Conversation proof" req hint={mobile ? undefined : '1–5 WhatsApp or chat screenshots showing the deal'}>
      <ImageList files={proof} onChange={setProof} max={5} size={mobile ? 64 : 88} />
    </Field>
  )
  const agreementField = (
    <Field label="Signed agreement" hint="optional">
      {agreement ? (
        <div className="row">
          <Thumb f={agreement} w={56} h={56} onRemove={() => setAgreement(undefined)} />
          <span className="s13 mut">{agreement.name}</span>
        </div>
      ) : (
        <FilePick className="btn sm dash" accept="application/pdf,image/*" onPick={(f) => setAgreement(f[0])} style={{ alignSelf: 'flex-start' }}>
          <Icon n="up" s="sm" />
          Upload PDF or photo
        </FilePick>
      )}
    </Field>
  )
  const plannerTitle = (
    <div className="row jb">
      <Label>Phase-wise plan</Label>
      <span className="s12 mut">Advance + milestones = project value</span>
    </div>
  )
  const offSheet = newOff && <OfferingSheet onClose={() => setNewOff(false)} onSaved={(oid) => setOfferingId(oid)} />

  if (mobile) {
    return (
      <Page
        mobile
        header={
          <>
            <SubBar left="x" title={title} onLeft={() => back(existing ? `/projects/${existing.id}` : '/projects')} right={<Tag cls="t-drf">Draft</Tag>} />
            {offline && (
              <div className="strip">
                <Icon n="cloud" s="sm" />
                <span className="f1">Offline · draft kept on this phone</span>
              </div>
            )}
          </>
        }
      >
        <div className="scr" style={{ gap: 10 }}>
          {clientCard}
          {client && (
            <>
              {offeringField}
              {descField}
              {problemField}
              {solutionField}
              {linksField}
              {proofField}
              {plannerTitle}
              <PlanEditor plan={plan} setPlan={setPlan} project={existing} compact />
              {agreementField}
            </>
          )}
        </div>
        <div className="bbar">
          <GateNote tried={gate.tried} missing={gateMissing} again="Tap again to pick a lead in Leads." />
          <button type="button" className={`btn pri w ${client ? '' : 'dis'}`} onClick={save}>
            Save
          </button>
        </div>
        {offSheet}
      </Page>
    )
  }

  return (
    <Page mobile={false} desk="projects" wide>
      <div className="row jb">
        <div className="col" style={{ gap: 3 }}>
          <span className="s12 fnt b">
            {isNew ? 'NEW PROJECT' : 'EDIT PROJECT'}
            {client ? ` · ${client.business.toUpperCase()}` : ''}
          </span>
          <span className="h1">{offering?.name ?? 'Untitled project'}</span>
        </div>
        <div className="row">
          <span className="s13 fnt">{existing?.savedAt ? `Draft saved ${ago(existing.savedAt)}` : 'Not saved yet'}</span>
          <button type="button" className="btn gh" onClick={() => back(existing ? `/projects/${existing.id}` : '/projects')}>
            Cancel
          </button>
          <button type="button" className="btn pri" onClick={save}>
            Save
          </button>
        </div>
      </div>
      <GateNote tried={gate.tried} missing={gateMissing} again="Tap Save again to pick a lead in Leads." />
      {!client ? (
        <div className="pan pad" style={{ maxWidth: 560 }}>
          {clientCard}
        </div>
      ) : (
        <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
          <div className="col f1" style={{ gap: 14 }}>
            <div className="pan pad" style={{ padding: 18, gap: 12 }}>
              <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <div className="f1">{offeringField}</div>
                <div className="f1">
                  <Field label="Description">{descField ?? <TextInput locked placeholder="From the offering" />}</Field>
                </div>
              </div>
              <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <div className="f1">{problemField}</div>
                <div className="f1">{solutionField}</div>
              </div>
              {linksField}
            </div>
            <div className="pan pad" style={{ padding: 18 }}>
              {plannerTitle}
              <PlanEditor plan={plan} setPlan={setPlan} project={existing} compact />
            </div>
          </div>
          <div className="col" style={{ width: 340, gap: 14 }}>
            {clientCard}
            <div className="pan pad">{proofField}</div>
            <div className="pan pad">{agreementField}</div>
          </div>
        </div>
      )}
      {offSheet}
    </Page>
  )
}

function cleanLinks(l: NonNullable<Project['links']>): Project['links'] {
  const out: NonNullable<Project['links']> = {}
  for (const k of ['live', 'demo', 'files'] as const) if (l[k]?.trim()) out[k] = l[k]!.trim()
  return Object.keys(out).length ? out : undefined
}
