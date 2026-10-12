import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarTrigger, DateField, DatePick } from '../Calendar'
import { CityInput } from '../CityInput'
import { fireConfetti } from '../confetti'
import { BUSINESS_TYPES, LOST_REASONS, MODES, MODE_ICON, MODE_LABEL, OTHER_TEAM_CLIENTS, SOURCE_LABEL, STAGES, STAGE_HINT, STAGE_LABEL, STAGE_TAG } from '../data/constants'
import { lastInteraction, progressCount } from '../data/derive'
import type { AppState, FileRef, GeoStamp, Lead, Mode, Source, Stage } from '../data/types'
import { addDays, daysFromToday, daysUntil, fmtDate, fmtTime, plural, today, uid } from '../lib/format'
import { go } from '../router'
import { SubBar } from '../Shell'
import { useStore } from '../store'
import {
  appendText,
  Banner,
  Chip,
  Confirm,
  Field,
  FilePick,
  GateNote,
  Icon,
  ImageList,
  Label,
  MicButton,
  Overlay,
  OverlayHead,
  Responsive,
  Seg,
  Select,
  Tag,
  TextArea,
  TextInput,
  Thumb,
  useGate,
  useIsMobile,
  useScrollLock,
} from '../ui'

// Quick actions open on the same page: add/edit lead, log interaction, Won, Lost, mute, recover.

export interface LogPreset {
  stage?: Stage
  mode?: Mode
  notes?: string
}

type Action =
  | { kind: 'add' }
  | { kind: 'edit'; leadId: string }
  | { kind: 'log'; leadId: string; preset?: LogPreset }
  | { kind: 'won'; leadId: string }
  | { kind: 'lost'; leadId: string }
  | { kind: 'more'; leadId: string }
  | { kind: 'recover'; leadId: string }
  | { kind: 'added'; leadId: string }

interface Api {
  addLead: () => void
  editLead: (l: Lead) => void
  logFor: (l: Lead, preset?: LogPreset) => void
  winFor: (l: Lead) => void
  loseFor: (l: Lead) => void
  moreFor: (l: Lead) => void
  recoverFor: (l: Lead) => void
}

const Ctx = createContext<Api | null>(null)

export function useLeadActions() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useLeadActions outside provider')
  return c
}

export function LeadActionsProvider({ children }: { children: ReactNode }) {
  const [a, setA] = useState<Action | null>(null)
  const close = useCallback(() => setA(null), [])
  // Overlays belong to the page they were opened on.
  useEffect(() => {
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [close])
  const api = useMemo<Api>(
    () => ({
      addLead: () => setA({ kind: 'add' }),
      editLead: (l) => setA({ kind: 'edit', leadId: l.id }),
      logFor: (l, preset) => setA({ kind: 'log', leadId: l.id, preset }),
      winFor: (l) => setA({ kind: 'won', leadId: l.id }),
      loseFor: (l) => setA({ kind: 'lost', leadId: l.id }),
      moreFor: (l) => setA({ kind: 'more', leadId: l.id }),
      recoverFor: (l) => setA({ kind: 'recover', leadId: l.id }),
    }),
    [],
  )
  return (
    <Ctx.Provider value={api}>
      {children}
      {a && <ActionHost a={a} onClose={close} setA={setA} />}
    </Ctx.Provider>
  )
}

function ActionHost({ a, onClose, setA }: { a: Action; onClose: () => void; setA: (a: Action) => void }) {
  const { state, mutate, toast } = useStore()
  const mobile = useIsMobile()
  if (a.kind === 'add') return <LeadForm mobile={mobile} onClose={onClose} onAdded={(id) => setA({ kind: 'added', leadId: id })} onOpen={(id) => { onClose(); go(`/leads/${id}`) }} />
  const lead = state.leads.find((l) => l.id === a.leadId)
  if (!lead) return null
  switch (a.kind) {
    case 'added':
      return <LeadAdded mobile={mobile} lead={lead} onClose={onClose} onAnother={() => setA({ kind: 'add' })} />
    case 'edit':
      return <LeadForm mobile={mobile} lead={lead} onClose={onClose} />
    case 'log':
      return <LogInteraction mobile={mobile} lead={lead} preset={a.preset} onClose={onClose} />
    case 'more':
      return <MoreSheet mobile={mobile} lead={lead} onClose={onClose} setA={setA} />
    case 'won':
      return (
        <Confirm
          icon="hand"
          iconBg="#EAE5DC"
          iconFg="#111111"
          title={`Won ${lead.business}?`}
          body="Move this lead to Projects. Next you'll add the offering, a phase plan and a conversation screenshot. You can save and finish later."
          confirm="Yes, create project"
          confirmCls="pri"
          confirmIcon="check"
          cancel="Not yet"
          onClose={onClose}
          onConfirm={() => {
            const pid = uid('prj')
            mutate((d) => winLead(d, lead.id, pid))
            onClose()
            fireConfetti()
            toast(`${lead.business} won · add the project details`)
            go(`/projects/${pid}/edit?new=1`)
          }}
        />
      )
    case 'lost':
      return <LostConfirm lead={lead} onClose={onClose} />
    case 'recover':
      return (
        <Confirm
          icon="undo"
          iconBg="#F3F0EB"
          iconFg="#111111"
          title={`Recover ${lead.business}?`}
          body={
            <>
              It goes back to <b>{STAGE_LABEL[lead.stage]}</b>, its last stage, with {plural(lead.interactions.length, 'interaction')}
              {lead.photo ? ' and its photo' : ''}.
            </>
          }
          confirm="Recover lead"
          confirmCls="drk"
          confirmIcon="undo"
          onClose={onClose}
          onConfirm={() => {
            mutate((d) => {
              const l = d.leads.find((x) => x.id === lead.id)!
              l.status = 'active'
              l.statusAt = undefined
              l.lostReason = undefined
              l.followUp = daysFromToday(1)
            })
            onClose()
            toast(`${lead.business} is back in Leads · follow up tomorrow`)
            go(`/leads/${lead.id}`)
          }}
        />
      )
  }
}

/** Won: close the lead and open a draft project with client info carried over. */
function winLead(d: AppState, leadId: string, pid: string) {
  const l = d.leads.find((x) => x.id === leadId)!
  const now = new Date().toISOString()
  l.status = 'won'
  l.statusAt = now
  l.muted = undefined
  l.interactions.unshift({ id: uid('ix'), at: now, date: today(), mode: lastInteraction(l)?.mode ?? 'visit', by: d.me, notes: 'Project created from this lead.', wonMarked: true })
  d.projects.unshift({
    id: pid,
    leadId,
    client: { business: l.business, owner: l.owner, phone: l.phone, area: l.area, city: l.city, source: l.source, location: !!l.location },
    offeringId: null,
    problem: l.problem,
    solution: '',
    proof: [],
    value: 0,
    advance: null,
    phases: [],
    payments: [],
    createdAt: now,
    brd: { state: 'none', approved: 0, history: [] },
  })
}

function LostConfirm({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { mutate, toast } = useStore()
  const [reason, setReason] = useState('')
  const gate = useGate()
  return (
    <Confirm
      icon="arch"
      iconBg="#FBE9E6"
      iconFg="#C0392B"
      title={`Mark ${lead.business} as lost?`}
      body="It moves to Archive with its timeline. You can recover it anytime."
      confirm="Move to Archive"
      confirmCls="dng"
      onClose={onClose}
      onConfirm={() =>
        gate.run(reason ? [] : ['Why it was lost'], () => {
          mutate((d) => {
            const l = d.leads.find((x) => x.id === lead.id)!
            l.status = 'lost'
            l.statusAt = new Date().toISOString()
            l.lostReason = reason || 'Not given'
            l.muted = undefined
          })
          onClose()
          toast(`${lead.business} moved to Archive`, 'ok', { label: 'Undo', run: () => mutate((d) => { const l = d.leads.find((x) => x.id === lead.id)!; l.status = 'active'; l.statusAt = undefined; l.lostReason = undefined }) })
          if (location.hash.includes(lead.id)) go('/leads')
        })
      }
    >
      <span className="lbl">Why was it lost?</span>
      <div className="row wr" style={{ gap: 6 }}>
        {LOST_REASONS.map((r) => (
          <Chip key={r} on={reason === r} onClick={() => setReason(r)}>
            {r}
          </Chip>
        ))}
      </div>
      <GateNote tried={gate.tried} missing={reason ? [] : ['Pick a reason']} />
    </Confirm>
  )
}

function MoreSheet({ mobile, lead, onClose, setA }: { mobile: boolean; lead: Lead; onClose: () => void; setA: (a: Action) => void }) {
  const { mutate, toast } = useStore()
  const mute = () => {
    mutate((d) => {
      const l = d.leads.find((x) => x.id === lead.id)!
      l.muted = { at: new Date().toISOString(), until: daysFromToday(15) }
    })
    onClose()
    toast(`${lead.business} muted for 15 days`, 'ok', { label: 'Undo', run: () => mutate((d) => { d.leads.find((x) => x.id === lead.id)!.muted = undefined }) })
  }
  const unmute = () => {
    mutate((d) => {
      d.leads.find((x) => x.id === lead.id)!.muted = undefined
    })
    onClose()
    toast(`${lead.business} unmuted · reminders are back on`)
  }
  return (
    <Overlay kind={mobile ? 'sheet' : 'dialog'} onClose={onClose} label="Lead actions" style={mobile ? undefined : { width: 400 }}>
      <div className="col" style={{ gap: 2 }}>
        <span className="h2">{lead.business}</span>
        <span className="s12 mut">{STAGE_LABEL[lead.stage]}</span>
      </div>
      <button type="button" className="mrow" onClick={() => setA({ kind: 'edit', leadId: lead.id })}>
        <Icon n="edit" className="mut" />
        <span className="b s13 f1">Edit lead info</span>
      </button>
      <div className="hr" />
      {lead.status === 'active' && (
        <>
          <button type="button" className="mrow" onClick={lead.muted ? unmute : mute}>
            <Icon n="mute" className="mut" />
            <div className="col f1" style={{ gap: 2 }}>
              <span className="b s13">{lead.muted ? 'Unmute lead' : 'Mute lead'}</span>
              <span className="s12 mut">{lead.muted ? `Muted until ${fmtDate(lead.muted.until)}` : 'Stops its triggers and reminders for 15 days'}</span>
            </div>
          </button>
          <div className="hr" />
          <button type="button" className="mrow" onClick={() => setA({ kind: 'lost', leadId: lead.id })}>
            <Icon n="arch" style={{ color: '#C0392B' }} />
            <span className="b s13 f1" style={{ color: '#C0392B' }}>
              Mark as Lost
            </span>
          </button>
          <Banner tone="gry" icon="info">
            Your mentor sees teams that mute a lot of leads.
          </Banner>
        </>
      )}
      {!mobile && (
        <button type="button" className="btn gh" onClick={onClose}>
          Close
        </button>
      )}
    </Overlay>
  )
}

// ---------- Lead added ----------

function LeadAdded({ mobile, lead, onClose, onAnother }: { mobile: boolean; lead: Lead; onClose: () => void; onAnother: () => void }) {
  useEffect(() => {
    fireConfetti()
  }, [])
  const wa = `https://wa.me/91${lead.phone}?text=${encodeURIComponent(`Hi${lead.owner ? ' ' + lead.owner : ''}, thank you for your time today! We're the student team from NIAT. Sharing our work with you soon.`)}`
  const steps: { icon: string; title: string; sub: ReactNode }[] = [
    { icon: 'msg', title: 'Say thanks on WhatsApp', sub: <a href={wa} target="_blank" rel="noreferrer">Open chat with a ready message{lead.photo ? ' and the storefront photo' : ''}</a> },
    { icon: 'cal', title: `Follow up ${lead.followUp ? fmtDate(lead.followUp) : 'in 2 days'}`, sub: 'Already set. It shows under Today when it is due.' },
    { icon: 'list', title: 'Follow up at least 3 times', sub: 'Spread across 3–4 days. Log each one.' },
  ]
  return (
    <Overlay kind={mobile ? 'sheet' : 'dialog'} onClose={onClose} label="Lead added" style={mobile ? undefined : { width: 440 }}>
      <div className="row" style={{ gap: 12 }}>
        <div className="icb" style={{ background: '#EAE5DC', color: '#111111', width: 48, height: 48, borderRadius: '50%' }}>
          <Icon n="check" s="lg" />
        </div>
        <div className="col" style={{ gap: 2 }}>
          <span className="h2">Lead added</span>
          <span className="s13 mut">
            {lead.business} is in your pipeline{lead.pending ? ', saved on this phone' : ''}.
          </span>
        </div>
      </div>
      <span className="grp" style={{ marginTop: 4 }}>
        What's next
      </span>
      <div className="col" style={{ gap: 10 }}>
        {steps.map((st, i) => (
          <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="icb" style={{ width: 28, height: 28, borderRadius: '50%', marginTop: 1 }}>
              <Icon n={st.icon} s="sm" />
            </span>
            <div className="col" style={{ gap: 1 }}>
              <span className="b s13">{st.title}</span>
              <span className="s12 mut">{st.sub}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 4 }}>
        <button type="button" className="btn f1" onClick={onAnother}>
          <Icon n="plus" s="sm" />
          Add another
        </button>
        <button
          type="button"
          className="btn pri f1"
          onClick={() => {
            onClose()
            go(`/leads/${lead.id}`)
          }}
        >
          View lead
        </button>
      </div>
    </Overlay>
  )
}

// ---------- Add / edit lead ----------

/**
 * Stand-in for real reverse geocoding: the browser's position, with a demo area/city.
 * TODO: swap for the platform's geocoding endpoint.
 */
function recordLocation(denied: boolean): Promise<GeoStamp | null> {
  if (denied) return new Promise((res) => setTimeout(() => res(null), 500))
  const stamp = (lat?: number, lng?: number): GeoStamp => ({ area: 'Ameerpet', city: 'Hyderabad', at: new Date().toISOString(), lat, lng })
  return new Promise((res) => {
    if (!navigator.geolocation) return setTimeout(() => res(stamp()), 600)
    navigator.geolocation.getCurrentPosition(
      (p) => res(stamp(p.coords.latitude, p.coords.longitude)),
      () => res(stamp()),
      { timeout: 5000, maximumAge: 60_000 },
    )
  })
}

const SOURCES: { value: Source; icon: string; long: string }[] = [
  { value: 'offline', icon: 'store', long: 'Offline / walk-in' },
  { value: 'online', icon: 'globe', long: 'Found them online' },
  { value: 'friends', icon: 'users', long: 'Friends, family or any acquaintance' },
]

type Clash = { kind: 'team'; lead: Lead } | { kind: 'other'; business: string; theirs: string }

function LeadForm({ mobile, lead, onClose, onAdded, onOpen }: { mobile: boolean; lead?: Lead; onClose: () => void; onAdded?: (id: string) => void; onOpen?: (id: string) => void }) {
  const { state, mutate, toast } = useStore()
  useScrollLock(mobile)
  const editing = !!lead
  const [f, setF] = useState(() => ({
    source: (lead?.source ?? (mobile ? '' : 'offline')) as Source | '',
    sourceNote: lead?.sourceNote ?? '',
    business: lead?.business ?? '',
    owner: lead?.owner ?? '',
    phone: lead?.phone ? lead.phone.replace(/(\d{5})(\d{5})/, '$1 $2') : '',
    type: lead?.type ? (BUSINESS_TYPES.includes(lead.type) ? lead.type : 'Other') : '',
    location: lead?.location ?? null,
    city: lead?.city ?? '',
    area: lead?.area ?? '',
    met: lead?.firstContact ?? today(),
    problem: lead?.problem ?? '',
    notes: lead?.notes ?? '',
    photo: lead?.photo ?? null as FileRef | null,
    proof: lead?.proof ?? ([] as FileRef[]),
  }))
  const [locating, setLocating] = useState(false)
  const [locDenied, setLocDenied] = useState(false)
  const [clash, setClash] = useState<Clash | null>(null)
  const [olderProof, setOlderProof] = useState<{ date: string; files: FileRef[] } | null>(null)
  const gate = useGate()
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const friends = f.source === 'friends'
  const backdated = !editing && f.met < today()
  const digits = f.phone.replace(/\D/g, '')
  const phoneOk = /^\d{10}$/.test(digits)

  const missing: [key: string, label: string][] = []
  if (!f.source) missing.push(['source', 'How you found them'])
  if (friends && !f.sourceNote.trim()) missing.push(['sourceNote', 'How you know them'])
  if (!f.business.trim()) missing.push(['business', 'Business name'])
  if (!phoneOk) missing.push(['phone', digits ? 'Phone (10 digits)' : 'Phone number'])
  if (!f.problem.trim()) missing.push(['problem', 'Problem identified'])
  if (backdated && !f.proof.length) missing.push(['proof', 'Proof of first contact'])
  const bad = (k: string) => gate.tried && missing.some(([m]) => m === k)

  const locate = async () => {
    setLocating(true)
    const g = await recordLocation(state.sys.locationDenied)
    setLocating(false)
    if (!g) {
      setLocDenied(true)
      return
    }
    setLocDenied(false)
    setF((p) => ({ ...p, location: g, city: g.city, area: g.area }))
  }

  const save = (opts: { met?: string; proof?: FileRef[] } = {}) => {
    const phone = digits
    const type = f.type || undefined
    const met = opts.met ?? f.met
    const proof = opts.proof ?? f.proof
    if (editing) {
      mutate((d) => {
        const l = d.leads.find((x) => x.id === lead!.id)!
        Object.assign(l, {
          source: f.source || l.source,
          sourceNote: f.source === 'friends' ? f.sourceNote.trim() : undefined,
          business: f.business.trim() || l.business,
          owner: f.owner.trim() || undefined,
          phone: phone || l.phone,
          type,
          location: f.location ?? undefined,
          city: f.city.trim() || undefined,
          area: f.area.trim() || undefined,
          problem: f.problem.trim() || l.problem,
          notes: f.notes.trim() || undefined,
          photo: f.photo ?? undefined,
        })
      })
      toast('Lead info saved')
      onClose()
      return
    }
    const id = uid('lead')
    const now = new Date().toISOString()
    const offline = !state.sys.online
    mutate((d) => {
      d.leads.unshift({
        id,
        business: f.business.trim() || 'Untitled business',
        owner: f.owner.trim() || undefined,
        phone,
        type,
        source: (f.source || 'offline') as Source,
        sourceNote: f.source === 'friends' ? f.sourceNote.trim() : undefined,
        city: f.city.trim() || undefined,
        area: f.area.trim() || undefined,
        location: f.location ?? undefined,
        problem: f.problem.trim(),
        notes: f.notes.trim() || undefined,
        photo: f.photo ?? undefined,
        proof: proof.length ? proof : undefined,
        firstContact: met,
        stage: 'raw',
        followUp: addDays(today(), 2),
        status: 'active',
        addedAt: now,
        addedBy: d.me,
        pending: offline,
        interactions: [
          {
            id: uid('ix'),
            at: now,
            date: met,
            mode: f.source === 'online' ? 'call' : 'visit',
            by: d.me,
            notes: [f.problem.trim(), f.notes.trim()].filter(Boolean).join(' '),
            leadAdded: true,
            location: f.location ? 'ok' : 'none',
            place: f.location?.area,
            pending: offline,
          },
        ],
      })
    })
    if (onAdded) onAdded(id)
    else onClose()
  }

  const submit = () =>
    gate.run(
      missing.map(([, l]) => l),
      () => {
        if (editing) return save()
        const same = state.leads.find((l) => digits && l.phone === digits)
        if (same) return setClash({ kind: 'team', lead: same })
        const other = OTHER_TEAM_CLIENTS.find((o) => o.phone === digits || o.business.toLowerCase() === f.business.trim().toLowerCase())
        if (other) return setClash({ kind: 'other', business: f.business.trim() || other.business, theirs: daysFromToday(other.date) })
        save()
      },
    )

  const saveToday = () => {
    set('met', today())
    gate.reset()
    toast("First contact set to today. No proof needed.", 'info')
  }

  // ---- blocks ----

  const sourceNote = friends && (
    <>
      <div className="tip n">
        <Icon n="info" s="sm" style={{ marginTop: 1 }} />
        <span>This is allowed. These leads are reviewed more closely.</span>
      </div>
      <Field label="Clearly explain how you know them" req>
        <TextArea bad={bad('sourceNote')} value={f.sourceNote} onChange={(ev) => set('sourceNote', ev.target.value)} placeholder="e.g. Owner is my father's friend from the same colony." />
      </Field>
    </>
  )

  const locationBlock = f.location ? (
    <div className="card" style={{ background: '#F7F5F1', gap: 8, padding: 12 }}>
      <div className="row">
        <div className="icb" style={{ background: '#EAE5DC', color: '#111111', width: 34, height: 34 }}>
          <Icon n="pin" s="sm" />
        </div>
        <div className="col f1" style={{ gap: 1 }}>
          <span className="b s13">Client location recorded</span>
          <span className="s12 mut">
            {f.location.area}, {f.location.city} · {fmtTime(f.location.at)}
          </span>
        </div>
        <button type="button" className="lnk mut s12" onClick={locate} disabled={locating}>
          {locating ? 'Locating…' : 'Redo'}
        </button>
      </div>
      <span className="s12 mut">Proof that you visited. Can also be recorded later.</span>
    </div>
  ) : (
    <div className="col" style={{ gap: 8 }}>
      <button type="button" className="loc-btn" onClick={locate} disabled={locating}>
        <div className="icb">
          <Icon n="pin" s="sm" />
        </div>
        <div className="col f1" style={{ gap: 1 }}>
          <span className="b s13">{locating ? 'Recording location…' : 'Record client location'}</span>
          <span className="s12 mut">Proof of visit · fills city & area</span>
        </div>
        <Icon n="right" className="fnt" />
      </button>
      {locDenied && (
        <Banner tone="amb" icon="pin">
          Location is off. This lead saves as <b>no location</b> and counts after a review.{' '}
          <button
            type="button"
            className="lnk"
            onClick={() => {
              mutate((d) => {
                d.sys.locationDenied = false
              })
              setLocDenied(false)
              toast('Location turned on · tap Record again', 'info')
            }}
          >
            Turn on location
          </button>
        </Banner>
      )}
    </div>
  )

  const metChips = (
    <div className="chips">
      <Chip on={f.met === today()} onClick={() => set('met', today())}>
        Today
      </Chip>
      <Chip on={f.met === addDays(today(), -1)} onClick={() => set('met', addDays(today(), -1))}>
        Yesterday
      </Chip>
      <DatePick value={f.met} on={f.met < addDays(today(), -1)} onChange={(v) => set('met', v)} label="Pick" max={today()} title="First contact" />
    </div>
  )

  const backdatedBlock = backdated && (
    <>
      <Banner tone="amb" icon="clock">
        {fmtDate(f.met)} is {plural(-daysUntil(f.met), 'day')} ago. Leads older than today need proof of that first contact.
      </Banner>
      <Field label="Proof of first contact" req>
        {f.proof.length ? (
          <ImageList files={f.proof} onChange={(x) => set('proof', x)} max={3} />
        ) : (
          <FilePick className={`in ${bad('proof') ? 'err' : ''}`} multiple style={{ minHeight: 92, flexDirection: 'column', justifyContent: 'center', gap: 4, borderStyle: 'dashed', width: '100%' }} onPick={(x) => set('proof', x.slice(0, 3))}>
            <Icon n="cam" />
            <span className="b s13">Add screenshot or photo</span>
            <span className="s12 mut">Chat, call log or visit photo showing the date</span>
          </FilePick>
        )}
      </Field>
    </>
  )

  const notesBox = (
    <div className="in" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: '10px 12px' }}>
      <textarea placeholder="Anything else about this client" value={f.notes} onChange={(ev) => set('notes', ev.target.value)} rows={2} style={{ resize: 'none' }} aria-label="Additional notes" />
      {f.photo && (
        <div className="row" style={{ gap: 10 }}>
          <Thumb f={f.photo} w={48} h={48} onRemove={() => set('photo', null)} />
          <div className="col f1" style={{ gap: 1 }}>
            <span className="b s12">Storefront photo</span>
            <span className="s12 mut">Send it to the owner with a thank-you.</span>
          </div>
        </div>
      )}
      <div className="row" style={{ gap: 8, borderTop: '1px solid #EEEAE4', paddingTop: 8 }}>
        <FilePick className="mic-in" onPick={(x) => set('photo', x[0])} label="Add storefront photo">
          <Icon n="cam" s="sm" />
        </FilePick>
        <MicButton inline onText={(t) => set('notes', appendText(f.notes, t))} />
        <span className="s12 fnt">{f.photo ? '' : 'Photo of the shop, or a voice note'}</span>
      </div>
    </div>
  )

  const businessField = (
    <Field label="Business name" req style={{ flex: 1 }}>
      <TextInput bad={bad('business')} placeholder="e.g. Sharma Sweets" value={f.business} onChange={(ev) => set('business', ev.target.value)} autoFocus={!mobile && !editing} />
    </Field>
  )
  const ownerField = (
    <Field label="Owner name" style={{ flex: 1 }}>
      <TextInput placeholder="Optional" value={f.owner} onChange={(ev) => set('owner', ev.target.value)} />
    </Field>
  )
  const phoneField = (
    <Field label="Phone number" req style={{ flex: 1 }} error={bad('phone') && digits ? 'Enter 10 digits' : undefined}>
      <div className="row">
        <div className="in" style={{ width: mobile ? 72 : 64, flex: 'none' }}>
          +91{mobile && <Icon n="down" s="sm" className="fnt" />}
        </div>
        <TextInput boxStyle={{ flex: 1 }} bad={bad('phone')} inputMode="numeric" placeholder="10 digits" value={f.phone} onChange={(ev) => set('phone', ev.target.value.replace(/[^\d ]/g, '').slice(0, 11))} />
      </div>
    </Field>
  )
  const typeSelect = <Select value={f.type} onChange={(v) => set('type', v)} placeholder="Select" options={BUSINESS_TYPES.map((t) => ({ value: t, label: t }))} label="Type of business" />
  const problem = (
    <Field label="What business problem did you identify?" req>
      <TextArea bad={bad('problem')} boxStyle={{ minHeight: 60 }} placeholder="What's slowing them down or costing them money?" value={f.problem} onChange={(ev) => set('problem', ev.target.value)} />
    </Field>
  )

  const title = editing ? 'Edit lead info' : 'Add a lead'
  const cta = editing ? 'Save changes' : 'Add lead'
  const proofMissing = backdated && !f.proof.length
  const gateNote = <GateNote tried={gate.tried} missing={missing.map(([, l]) => l)} />

  const clashSheet = clash && (
    <ClashSheet
      clash={clash}
      mobile={mobile}
      met={f.met}
      older={olderProof}
      setOlder={setOlderProof}
      onClose={() => setClash(null)}
      onOpen={(id) => onOpen?.(id)}
      onDifferent={() => {
        setClash(null)
        save()
      }}
      onDiscard={() => {
        setClash(null)
        onClose()
        toast('Lead discarded', 'info')
      }}
      onOlder={(date, files) => {
        setClash(null)
        save({ met: date, proof: files })
        toast(`Saved with proof from ${fmtDate(date)} · checked against the other team's`, 'info')
      }}
    />
  )

  if (mobile) {
    return (
      <div className="fullpage" role="dialog" aria-modal="true" aria-label={title}>
        <SubBar left="x" title={title} onLeft={onClose} />
        <div className="scr" style={{ paddingTop: 14 }}>
          <Label req>How did you find this business?</Label>
          {SOURCES.map((s) => {
            const on = f.source === s.value
            return (
              <div key={s.value} className={`opt ${on ? 'on' : ''} ${bad('source') ? 'err' : ''}`} style={on && s.value === 'friends' ? { flexDirection: 'column', alignItems: 'stretch', gap: 10 } : undefined}>
                <button type="button" role="radio" aria-checked={on} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }} onClick={() => set('source', s.value)}>
                  <div className="rad" style={on ? { border: '5px solid #111111' } : undefined} />
                  <Icon n={s.icon} className="mut" />
                  <span className="b s13">{s.long}</span>
                </button>
                {on && s.value === 'friends' && sourceNote}
              </div>
            )
          })}
          {businessField}
          {ownerField}
          {phoneField}
          <Field label="Type of business">{typeSelect}</Field>
          {locationBlock}
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <Field label="City" style={{ flex: 1, minWidth: 0 }}>
              <CityInput value={f.city} onChange={(v) => set('city', v)} locked={!!f.location} />
            </Field>
            <Field label="Area" style={{ flex: 1, minWidth: 0 }}>
              <TextInput boxStyle={{ flex: 1 }} className="s13" placeholder="Area / locality" value={f.area} locked={!!f.location} onChange={(ev) => set('area', ev.target.value)} />
            </Field>
          </div>
          {!editing && <Field label="First meeting">{metChips}</Field>}
          {backdatedBlock}
          {problem}
          <Label hint="optional">Additional notes</Label>
          {notesBox}
        </div>
        <div className="bbar" style={{ bottom: 0 }}>
          {gateNote}
          <button type="button" className={`btn pri w ${proofMissing ? 'dis' : ''}`} onClick={submit}>
            {cta}
          </button>
          {backdated && (
            <button type="button" className="btn gh w" onClick={saveToday}>
              Save with today's date instead
            </button>
          )}
        </div>
        {clashSheet}
      </div>
    )
  }

  return (
    <Overlay kind="drawer" onClose={onClose} label={title}>
      <div className="row jb" style={{ padding: '18px 24px', borderBottom: '1px solid #EEEAE4' }}>
        <span className="h2">{title}</span>
        <button type="button" className="btn gh sm" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose} aria-label="Close">
          <Icon n="x" className="mut" />
        </button>
      </div>
      <div className="col" style={{ padding: '18px 24px', gap: 12, flex: 1, overflowY: 'auto' }}>
        <span className="lbl">How did you find this business?</span>
        <Seg<Source> value={(f.source || 'offline') as Source} onChange={(v) => set('source', v)} options={(['offline', 'online', 'friends'] as Source[]).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))} />
        {sourceNote}
        <div className="row" style={{ alignItems: 'flex-start' }}>
          {businessField}
          {ownerField}
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          {phoneField}
          <Field label="Type of business" style={{ flex: 1 }}>
            {typeSelect}
          </Field>
        </div>
        {locationBlock}
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <CityInput value={f.city} onChange={(v) => set('city', v)} locked={!!f.location} />
          <TextInput boxStyle={{ flex: 1 }} className="s13" placeholder="Area / locality" value={f.area} locked={!!f.location} onChange={(ev) => set('area', ev.target.value)} aria-label="Area" />
          {!editing && <DateField title="First meeting" value={f.met} onChange={(v) => set('met', v)} max={today()} style={{ width: 140, flex: 'none' }} display={(v) => (v === today() ? 'Today' : v === addDays(today(), -1) ? 'Yesterday' : fmtDate(v))} />}
        </div>
        {backdatedBlock}
        {problem}
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <TextInput boxStyle={{ flex: 1 }} placeholder="Additional notes" value={f.notes} onChange={(ev) => set('notes', ev.target.value)} right={<MicButton inline onText={(t) => set('notes', appendText(f.notes, t))} />} />
          {f.photo ? (
            <Thumb f={f.photo} w={44} h={44} onRemove={() => set('photo', null)} />
          ) : (
            <FilePick className="btn sm" style={{ height: 44 }} onPick={(x) => set('photo', x[0])}>
              <Icon n="cam" s="sm" />
              Photo
            </FilePick>
          )}
        </div>
      </div>
      <div className="col" style={{ padding: '14px 24px', borderTop: '1px solid #EEEAE4', gap: 8 }}>
        {gateNote}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {backdated && (
            <button type="button" className="btn gh" onClick={saveToday} style={{ marginRight: 'auto' }}>
              Save with today's date instead
            </button>
          )}
          <button type="button" className="btn gh" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`btn pri ${proofMissing ? 'dis' : ''}`} onClick={submit}>
            {cta}
          </button>
        </div>
      </div>
      {clashSheet}
    </Overlay>
  )
}

function ClashSheet({
  clash,
  mobile,
  met,
  older,
  setOlder,
  onClose,
  onOpen,
  onDifferent,
  onDiscard,
  onOlder,
}: {
  clash: Clash
  mobile: boolean
  met: string
  older: { date: string; files: FileRef[] } | null
  setOlder: (o: { date: string; files: FileRef[] } | null) => void
  onClose: () => void
  onOpen: (id: string) => void
  onDifferent: () => void
  onDiscard: () => void
  onOlder: (date: string, files: FileRef[]) => void
}) {
  const gate = useGate()
  if (clash.kind === 'team') {
    const l = clash.lead
    return (
      <Responsive mobile={mobile} onClose={onClose} label="Already in your team" width={440}>
        <div className="icb" style={{ background: '#F3F0EB', color: '#111111', width: 44, height: 44, borderRadius: 13 }}>
          <Icon n="copy" />
        </div>
        <span className="h2">Already in your team</span>
        <span className="s13 mut">Same phone number as a lead {l.addedBy} added.</span>
        <div className="card" style={{ padding: 12, gap: 4, background: '#F4F1EC' }}>
          <div className="row jb">
            <span className="b">{l.business}</span>
            {l.status === 'active' ? <Tag cls={STAGE_TAG[l.stage]}>{STAGE_LABEL[l.stage]}</Tag> : <Tag cls={l.status === 'won' ? 't-grn' : 't-drf'}>{l.status === 'won' ? 'Won' : 'Archived'}</Tag>}
          </div>
          <span className="s12 mut">
            +91 {l.phone.replace(/(\d{5})(\d{5})/, '$1 $2')} · added by {l.addedBy}, {fmtDate(l.addedAt)}
          </span>
        </div>
        <button type="button" className="btn drk" onClick={() => onOpen(l.id)}>
          Open existing lead
        </button>
        <button type="button" className="btn gh" onClick={onDifferent}>
          It's a different business
        </button>
      </Responsive>
    )
  }
  if (older) {
    const ok = older.date < clash.theirs
    const miss = [...(older.files.length ? [] : ['A screenshot or photo']), ...(ok ? [] : [`A date before ${fmtDate(clash.theirs)}`])]
    return (
      <Responsive mobile={mobile} onClose={onClose} label="Add older proof" width={440}>
        <OverlayHead title="Add older proof" sub={`Their first contact: ${fmtDate(clash.theirs)}`} onClose={onClose} />
        <Field label="When did you first contact them?">
          <DateField title="First contact" value={older.date} onChange={(d) => setOlder({ ...older, date: d })} max={today()} bad={gate.tried && !ok} />
        </Field>
        <Field label="Proof showing that date" req>
          <ImageList files={older.files} onChange={(files) => setOlder({ ...older, files })} max={3} bad={gate.tried && !older.files.length} />
        </Field>
        <GateNote tried={gate.tried} missing={miss} />
        <button type="button" className="btn pri" onClick={() => gate.run(miss, () => onOlder(older.date, older.files))}>
          Save lead with this proof
        </button>
        <button type="button" className="btn gh" onClick={() => setOlder(null)}>
          Back
        </button>
      </Responsive>
    )
  }
  return (
    <Responsive mobile={mobile} onClose={onClose} label="Another team has this client" width={440}>
      <div className="icb" style={{ background: '#FBE9E6', color: '#C0392B', width: 44, height: 44, borderRadius: 13 }}>
        <Icon n="users" />
      </div>
      <span className="h2">Another team has this client</span>
      <span className="s13 mut" style={{ lineHeight: 1.5 }}>
        A team on your campus saved {clash.business} first. The earlier proof of contact wins.
      </span>
      <div className="card" style={{ padding: 12, gap: 8, background: '#F4F1EC' }}>
        <div className="row jb s13">
          <span className="mut">Their first contact</span>
          <span className="b">{fmtDate(clash.theirs)} · proof ✓</span>
        </div>
        <div className="row jb s13">
          <span className="mut">Yours</span>
          <span className="b">{fmtDate(met)}</span>
        </div>
      </div>
      <Banner tone="gry" icon="info">
        Met them before {fmtDate(clash.theirs)}? Add proof with that date and it's checked.
      </Banner>
      <button type="button" className="btn drk" onClick={() => setOlder({ date: addDays(clash.theirs, -2), files: [] })}>
        <Icon n="cam" />
        Add older proof
      </button>
      <button type="button" className="btn gh" onClick={onDiscard}>
        Discard lead
      </button>
    </Responsive>
  )
}

// ---------- Log interaction ----------

const FOLLOW = [
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
  { key: '2d', label: 'In 2 days', days: 2 },
  { key: 'week', label: 'In a week', days: 7 },
] as const

function LogInteraction({ mobile, lead, preset, onClose }: { mobile: boolean; lead: Lead; preset?: LogPreset; onClose: () => void }) {
  const { state, mutate, toast } = useStore()
  const last = lastInteraction(lead)
  const [date, setDate] = useState(today())
  const [mode, setMode] = useState<Mode>(preset?.mode ?? state.lastMode ?? last?.mode ?? 'whatsapp')
  const [stage, setStage] = useState<Stage>(preset?.stage ?? lead.stage)
  const [follow, setFollow] = useState<string>(addDays(today(), 2))
  const [notes, setNotes] = useState(preset?.notes ?? '')
  const [listening, setListening] = useState(false)
  const [at] = useState(() => new Date().toISOString())
  const gate = useGate()
  const denied = state.sys.locationDenied
  const place = lead.area ?? 'Ameerpet'

  const presetOn = (days: number) => follow === addDays(today(), days)
  const custom = !FOLLOW.some((x) => presetOn(x.days))
  const missing = notes.trim() ? [] : ['Notes / next steps']
  const curIdx = STAGES.indexOf(lead.stage)

  const save = () =>
    gate.run(missing, () => {
      const offline = !state.sys.online
      const moved = stage !== lead.stage
      const now = new Date().toISOString()
      let flagged = false
      mutate((d) => {
        const l = d.leads.find((x) => x.id === lead.id)!
        const note = notes.trim() || 'No notes'
        // Burst check: 3 near-identical logs on one lead within 2 minutes earn no credit until reviewed.
        const recent = l.interactions.filter((x) => !x.leadAdded && Date.now() - new Date(x.at).getTime() < 120_000 && x.notes.trim().toLowerCase() === note.toLowerCase())
        flagged = recent.length >= 2
        if (flagged) recent.forEach((x) => (x.flagged = true))
        l.interactions.unshift({
          id: uid('ix'),
          at: now,
          date,
          mode,
          by: d.me,
          notes: note,
          ...(moved ? { stageFrom: lead.stage, stageTo: stage } : {}),
          location: denied ? 'none' : 'ok',
          place: denied ? undefined : place,
          flagged,
          pending: offline,
        })
        l.stage = stage
        l.followUp = follow
        d.lastMode = mode
      })
      onClose()
      if (flagged) toast('Logged · 3 identical logs in 2 minutes are flagged for your mentor to review', 'warn')
      else if (offline) toast(`Saved on this phone. It syncs with the original time, ${fmtTime(now)}.`)
      else if (denied) toast('Saved without location · counts after a review', 'warn')
      else toast(`Logged · next follow-up ${fmtDate(follow)}${moved ? ` · now ${STAGE_LABEL[stage]}` : ''}`)
    })

  const notesBox = (
    <div className="row" style={{ alignItems: 'stretch' }}>
      <TextArea
        bad={gate.tried && !!missing.length}
        boxStyle={{ flex: 1, minHeight: mobile ? 64 : 80 }}
        placeholder="What happened? What's the next step?"
        value={notes}
        onChange={(ev) => setNotes(ev.target.value)}
        aria-label="Notes"
      />
      <MicButton h={mobile ? 64 : 80} onText={(t) => setNotes((n) => appendText(n, t))} onListening={setListening} />
    </div>
  )
  const listen = listening && (
    <div className="row s12" style={{ gap: 6 }}>
      <span className="b" style={{ color: '#C0392B' }}>
        ● Listening
      </span>
      <span className="mut">Hindi or English · edit before you save</span>
    </div>
  )
  const locLine = denied ? (
    <Banner tone="amb" icon="pin">
      Location is off. This log saves as <b>no location</b> and counts after a review.{' '}
      <button
        type="button"
        className="lnk"
        onClick={() => {
          mutate((d) => {
            d.sys.locationDenied = false
          })
          toast('Location turned on')
        }}
      >
        Turn on location
      </button>
    </Banner>
  ) : (
    <div className="row s12" style={{ gap: 6 }}>
      <Icon n="pin" s="sm" className="gd" />
      <span className="mut">
        Location captured · {place} · {fmtTime(at)}
      </span>
    </div>
  )

  const followChips = (
    <div className="chips">
      {FOLLOW.map((x) => (
        <Chip key={x.key} on={presetOn(x.days)} onClick={() => setFollow(addDays(today(), x.days))}>
          {x.label}
          {!mobile && presetOn(x.days) && ` · ${fmtDate(follow)}`}
        </Chip>
      ))}
      <DatePick value={follow} on={custom} onChange={setFollow} label="Pick date" min={today()} iconOnly={mobile} title="Next follow-up" />
    </div>
  )

  if (mobile) {
    return (
      <Responsive mobile onClose={onClose} label="Log interaction">
        <OverlayHead title="Log interaction" sub={lead.business} onClose={onClose} />
        <div className="chips">
          <Chip on={date === today()} onClick={() => setDate(today())}>
            Today
          </Chip>
          <Chip on={date === addDays(today(), -1)} onClick={() => setDate(addDays(today(), -1))}>
            Yesterday
          </Chip>
          <DatePick value={date} on={date < addDays(today(), -1)} onChange={setDate} label="Select date" max={today()} title="When did it happen?" />
        </div>
        <div className="row" style={{ gap: 6 }}>
          {MODES.map((m) => (
            <button type="button" key={m} aria-pressed={mode === m} className={`btn sm f1 ${mode === m ? 'drk' : ''}`} style={{ flexDirection: 'column', height: 56, gap: 3, padding: 0 }} onClick={() => setMode(m)}>
              <Icon n={MODE_ICON[m]} />
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <span className="lbl">Lead stage</span>
        <div className="row s12" style={{ gap: 6 }}>
          <span className="mut">Now</span>
          <Tag cls={STAGE_TAG[lead.stage]}>{STAGE_LABEL[lead.stage]}</Tag>
          <Icon n="right" s="sm" className="fnt" />
          <span className="mut">after this talk</span>
        </div>
        <div className="col" style={{ gap: 6 }} role="radiogroup" aria-label="Lead stage after this talk">
          {STAGES.slice(curIdx).map((s) => (
            <button type="button" role="radio" aria-checked={stage === s} key={s} className={`opt ${stage === s ? 'on' : ''}`} style={{ padding: '9px 12px' }} onClick={() => setStage(s)}>
              <div className="rad" />
              <span className="s13 b f1">{s === lead.stage ? `Stays at ${STAGE_LABEL[s]}` : STAGE_LABEL[s]}</span>
              <span className="s12 mut">{s === lead.stage ? 'No change' : STAGE_HINT[s]}</span>
            </button>
          ))}
        </div>
        <span className="s12 mut">Won and Lost are set from the lead page.</span>
        <span className="lbl">Next follow-up</span>
        {followChips}
        {notesBox}
        {listen}
        {locLine}
        <GateNote tried={gate.tried} missing={missing} />
        <button type="button" className="btn pri" onClick={save}>
          Save interaction
        </button>
      </Responsive>
    )
  }

  return (
    <Responsive mobile={false} onClose={onClose} label="Log interaction" width={540}>
      <OverlayHead title="Log interaction" sub={<span className="s13">{lead.business} · currently {STAGE_LABEL[lead.stage]}</span>} onClose={onClose} />
      <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
        <div className="col f1" style={{ gap: 6 }}>
          <Label>When</Label>
          <div className="seg">
            <button type="button" className={date === today() ? 'on' : ''} onClick={() => setDate(today())}>
              Today
            </button>
            <button type="button" className={date === addDays(today(), -1) ? 'on' : ''} onClick={() => setDate(addDays(today(), -1))}>
              Yesterday
            </button>
            <CalendarTrigger className={date < addDays(today(), -1) ? 'on' : ''} title="When did it happen?" value={date} max={today()} onChange={setDate}>
              {date < addDays(today(), -1) ? fmtDate(date) : 'Date'}
            </CalendarTrigger>
          </div>
        </div>
        <div className="col" style={{ gap: 6, flex: 1.3 }}>
          <Label>Mode</Label>
          <Seg<Mode> value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))} />
        </div>
      </div>
      <span className="lbl">Lead stage</span>
      <div className="row wr" style={{ gap: 6 }}>
        {STAGES.map((s) => (
          <Chip key={s} on={stage === s} onClick={() => setStage(s)}>
            {STAGE_LABEL[s]}
          </Chip>
        ))}
      </div>
      <span className="lbl">Next follow-up</span>
      {followChips}
      <Label req>Notes / next steps</Label>
      {notesBox}
      {listen}
      {locLine}
      <GateNote tried={gate.tried} missing={missing} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <span className="s12 fnt f1">
          {progressCount(lead)} of 3 progress logs · timestamped by {state.me}
        </span>
        <button type="button" className="btn gh" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn pri" onClick={save}>
          Save interaction
        </button>
      </div>
    </Responsive>
  )
}
