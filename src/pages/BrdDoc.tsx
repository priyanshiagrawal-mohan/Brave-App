import { useEffect, useState } from 'react'
import { fireConfetti } from '../confetti'
import { MODE_LABEL, SOURCE_LABEL } from '../data/constants'
import { brdAmounts, brdView, BRD_TAG, deadlineLeft, loggedOn, offeringName, paymentsFor, projectMissing, targets, verifiedOf } from '../data/derive'
import type { AppState, FileRef, Project } from '../data/types'
import { atDay, fmtDate, fmtDateTime, fmtRange, inr, plural, today, uid } from '../lib/format'
import { go, useRoute } from '../router'
import { Page, SubBar } from '../Shell'
import { useStore, type Tone } from '../store'
import { Banner, Bar, Center, FilePick, GateNote, Icon, Tag, TextArea, Thumb, useGate } from '../ui'
import { ReviewTimeline, Simulate } from './Brds'

type Mutate = (fn: (d: AppState) => void) => void
type Toast = (t: string, tone?: Tone) => void

/** Prototype: stand in for the auto-review's decision. */
export function decide(state: AppState, mutate: Mutate, toast: Toast, pid: string, kind: 'approve' | 'reject') {
  const first = !state.projects.some((p) => p.brd.approved > 0)
  const p = state.projects.find((x) => x.id === pid)!
  const now = new Date().toISOString()
  if (kind === 'approve') {
    const amount = Math.min(p.value, p.brd.claimed ?? verifiedOf(p))
    mutate((d) => {
      const pp = d.projects.find((x) => x.id === pid)!
      pp.brd = { ...pp.brd, state: 'approved', approved: amount, approvedAt: now, delayed: false, history: [...pp.brd.history, { at: now, text: `${amount < pp.value ? 'Partly approved' : 'Approved'} · ${inr(amount)}`, kind: 'check' }] }
      d.points.unshift({ id: uid('pt'), at: now, xp: Math.round(amount * 0.015), title: amount < pp.value ? 'BRD partly approved' : 'BRD approved', sub: `${pp.client.business} · ${inr(amount)} verified` })
      d.triggers.unshift({ id: uid('tr'), code: 'N12', pri: null, title: 'BRD decision', firedAt: now, due: today(), clearedAt: now, done: `BRD approved · ${inr(amount)}, ${pp.client.business}` })
    })
    toast(`BRD approved · ${inr(amount)} · +${Math.round(amount * 0.015)} XP`)
    go(`/brds/${pid}${first ? '?approved=1' : ''}`)
  } else {
    const pay = p.payments.find((x) => x.status === 'verified')
    mutate((d) => {
      const pp = d.projects.find((x) => x.id === pid)!
      const deadline = atDay(3, '18:00')
      pp.brd = {
        ...pp.brd,
        state: 'rejected',
        rejectedAt: now,
        deadline,
        reason: pay ? `${pay.target === 'advance' ? 'Advance' : 'Milestone'} payment screenshot doesn't show the amount or date. Upload the full UPI receipt.` : "Conversation proof doesn't show the price agreed. Add the chat where the owner agrees.",
        flaggedPaymentId: pay?.id,
        flaggedSection: pay ? `6. Payments → ${pay.target === 'advance' ? 'Advance' : 'Milestone'}` : '5. Proof & agreement',
        history: [...pp.brd.history, { at: now, text: 'Rejected, 1 item flagged', kind: 'reject' }],
      }
      if (pay) pp.payments.find((x) => x.id === pay.id)!.flagged = 'cropped'
      d.triggers.unshift({ id: uid('tr'), code: 'T7', pri: 'P1', title: `BRD rejected: ${pp.client.business}`, firedAt: now, due: deadline.slice(0, 10), dueAt: deadline, projectId: pid })
    })
    toast('BRD rejected · 3 days to resubmit, added to your Inbox', 'warn')
    go(`/brds/${pid}/fix`)
  }
}

// ---------- The document ----------

const SECTIONS = ['Client & source', 'Interactions', 'Problem & solution', 'Phase plan', 'Proof & agreement', 'Payments']

function sectionOk(p: Project) {
  const miss = projectMissing(p).map((m) => m.key)
  const left = p.value - verifiedOf(p)
  return [true, true, !miss.includes('solution'), !miss.some((k) => k === 'plan' || k.startsWith('dates')), !miss.includes('proof'), left <= 0]
}

function BrdDocument({ p, compact }: { p: Project; compact?: boolean }) {
  const { state } = useStore()
  const lead = state.leads.find((l) => l.id === p.leadId)
  const ix = lead ? [...lead.interactions].filter((x) => !x.wonMarked).sort((a, b) => a.at.localeCompare(b.at)) : []
  const notYet = Math.max(0, p.value - verifiedOf(p))
  const flagged = p.brd.state === 'rejected' ? p.brd.flaggedPaymentId : undefined
  const head = (n: number, right: React.ReactNode) => (
    <div className="row jb" id={`s${n}`}>
      <span className="b">
        {n}. {SECTIONS[n - 1]}
      </span>
      {right}
    </div>
  )
  const grid = compact ? '1fr 1fr' : 'repeat(3,1fr)'
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row jb" style={{ alignItems: 'flex-start' }}>
        <div className="col" style={{ gap: 3 }}>
          <span className="s12 fnt b">BUSINESS REQUIREMENT DOCUMENT</span>
          <span className={compact ? 'h2' : 'h1'}>
            {offeringName(state, p)} for {p.client.business}
          </span>
        </div>
        <Tag cls="t-drf">Auto-generated</Tag>
      </div>
      <div className="hr" />
      {head(1, <span className="s12 mut">from lead</span>)}
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10 }} className="s13">
        <div className="col" style={{ gap: 1 }}>
          <span className="s12 fnt">Business</span>
          {p.client.business}
        </div>
        <div className="col" style={{ gap: 1 }}>
          <span className="s12 fnt">Point of contact</span>
          {p.client.owner ?? '—'}
        </div>
        <div className="col" style={{ gap: 1 }}>
          <span className="s12 fnt">Source</span>
          {p.client.source ? SOURCE_LABEL[p.client.source] : '—'}
          {p.client.location ? ' · location ✓' : ''}
        </div>
      </div>
      {head(2, <span className="s12 mut">{ix.length ? `${ix.length} logged · ${fmtDate(ix[0].date)} – ${fmtDate(ix[ix.length - 1].date)}` : 'none logged'}</span>)}
      <div className="col s13 mut" style={{ gap: 4 }}>
        {ix.slice(-4).map((x) => (
          <span key={x.id}>
            {fmtDate(x.date)} · {MODE_LABEL[x.mode]} · {x.notes}
          </span>
        ))}
      </div>
      {head(
        3,
        <button type="button" className="lnk s12" onClick={() => go(`/projects/${p.id}/edit`)}>
          Edit in project
        </button>,
      )}
      <span className="s13 mut" style={{ lineHeight: 1.5 }}>
        {p.problem} {p.solution || <span className="od">Solution proposed is missing.</span>}
      </span>
      <div className="hr" />
      {head(4, <span className="s12 mut">from project</span>)}
      <div style={{ border: '1px solid #F0ECE6', borderRadius: 10, overflow: 'hidden' }}>
        <div className="tr th s13" style={{ gridTemplateColumns: compact ? '1fr .9fr .8fr' : '1fr 2fr 1.1fr .8fr', minHeight: 34 }}>
          <span>Milestone</span>
          {!compact && <span>Deliverables</span>}
          <span>Dates</span>
          <span>Amount</span>
        </div>
        {targets(p).map((t) => (
          <div key={t.key} className="tr s13" style={{ gridTemplateColumns: compact ? '1fr .9fr .8fr' : '1fr 2fr 1.1fr .8fr', minHeight: 40 }}>
            <span className="b">{t.short}</span>
            {!compact && <span className="mut">{t.deliverables ?? '—'}</span>}
            <span className={t.key !== 'advance' && (!t.start || !t.end) ? 'od' : 'mut'}>{t.key === 'advance' ? `Due ${fmtDate(t.due!)}` : t.start && t.end ? fmtRange(t.start, t.end) : 'Dates missing'}</span>
            <span>{inr(t.expected)}</span>
          </div>
        ))}
      </div>
      {head(5, <span className="s12 mut">from project</span>)}
      <div className="row wr" style={{ gap: 10, alignItems: 'flex-start' }}>
        {p.proof.map((f) => (
          <Thumb key={f.id} f={f} w={compact ? 64 : 84} h={compact ? 64 : 84} />
        ))}
        {p.agreement && <Thumb f={{ ...p.agreement, label: 'agreement PDF' }} w={compact ? 64 : 84} h={compact ? 64 : 84} />}
        <div className="col f1 s12 mut" style={{ gap: 3, minWidth: 160 }}>
          <span className={p.proof.length ? '' : 'od'}>{p.proof.length ? plural(p.proof.length, 'conversation screenshot') : 'No conversation proof'}</span>
          <span>{p.agreement ? 'Signed agreement attached' : 'No signed agreement (optional)'}</span>
          {lead?.location && <span className="gd">Client location recorded {fmtDate(lead.location.at)}</span>}
        </div>
      </div>
      {head(6, notYet ? <span className="s12 td b">{inr(notYet)} not yet received</span> : <span className="s12 gd b">Fully received</span>)}
      <div style={{ border: '1px solid #F0ECE6', borderRadius: 10, overflow: 'hidden' }}>
        <div className="tr th s13" style={{ gridTemplateColumns: compact ? '1fr .9fr .9fr 48px' : '1.2fr 1fr 1fr 1fr 70px', minHeight: 34 }}>
          <span>Phase</span>
          {!compact && <span>Expected</span>}
          <span>Received</span>
          <span>Date</span>
          <span>Proof</span>
        </div>
        {targets(p).map((t) => {
          const got = loggedOn(p, t.key)
          const pays = paymentsFor(p, t.key).filter((x) => x.status === 'verified' || x.status === 'pending')
          const last = pays[pays.length - 1]
          const isFlag = pays.some((x) => x.id === flagged)
          return (
            <div key={t.key} className="tr s13" style={{ gridTemplateColumns: compact ? '1fr .9fr .9fr 48px' : '1.2fr 1fr 1fr 1fr 70px', minHeight: 48, background: isFlag ? '#FDF6F5' : undefined }}>
              <span className="b">{t.short}</span>
              {!compact && <span>{inr(t.expected)}</span>}
              <span className={got >= t.expected ? 'gd' : got ? 'td' : 'mut'}>{got ? inr(got) : '—'}</span>
              <span className="mut">{last ? `${fmtDate(last.date)} · UPI` : t.due ? `Due ${fmtDate(t.due)}` : '—'}</span>
              {last ? <Thumb f={last.receipts[0]?.proof} w={40} h={32} /> : <span className="mut">—</span>}
            </div>
          )
        })}
      </div>
      <div className="row" style={{ gap: 8, padding: '12px 14px', borderRadius: 10, background: '#F7F5F1' }}>
        <Icon n="edit" s="sm" className="mut" />
        <span className="s13 mut f1">Something wrong? Edits happen in the project and this document updates.</span>
        <button type="button" className="lnk" onClick={() => go(`/projects/${p.id}`)}>
          Open project
        </button>
      </div>
    </div>
  )
}

function FirstApproved({ p }: { p: Project }) {
  const { state, toast } = useStore()
  useEffect(() => {
    fireConfetti()
  }, [])
  return (
    <div className="fullpage" role="dialog" aria-label="First BRD approved">
      <Center icon="ccheck" iconBg="#EAE5DC" iconFg="#111111" title={<span className="h1" style={{ fontSize: 26 }}>First BRD approved</span>} full>
        <span className="mut" style={{ lineHeight: 1.5 }}>
          {p.client.business} · {offeringName(state, p)} · {inr(p.brd.approved)} verified
        </span>
        <div className="col" style={{ width: '100%', maxWidth: 340 }}>
          <button type="button" className="btn pri w" onClick={() => go(`/brds/${p.id}`, { replace: true })}>
            <Icon n="file" />
            View BRD
          </button>
          <div className="row">
            <button type="button" className="btn f1" onClick={() => window.print()}>
              <Icon n="dl" />
              PDF
            </button>
            <button type="button" className="btn f1" onClick={() => toast('Share sheet opens on the phone', 'info')}>
              <Icon n="share" />
              Share
            </button>
          </div>
          <button type="button" className="card click" style={{ textAlign: 'left', flexDirection: 'row', alignItems: 'center', marginTop: 6 }} onClick={() => go(`/testimonials/${p.id}`)}>
            <Icon n="video" className="mut" />
            <div className="col f1" style={{ gap: 1 }}>
              <span className="b s13">Ask {p.client.owner ?? p.client.business} for a video</span>
              <span className="s12 mut">Client testimonial</span>
            </div>
            <Icon n="right" className="fnt" />
          </button>
        </div>
      </Center>
    </div>
  )
}

// ---------- BRD page ----------

export function BrdPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const r = useRoute()
  const p = state.projects.find((x) => x.id === id)
  const [showDoc, setShowDoc] = useState(false)
  const gate = useGate()
  useEffect(() => {
    if (r.query.has('print')) window.setTimeout(() => window.print(), 300)
  }, [r])
  if (!p) {
    return (
      <Page mobile={mobile} desk="brds" header={<SubBar title="BRD" fallback="/brds" />}>
        <Center icon="file" title="BRD not found" />
      </Page>
    )
  }
  if (r.query.has('approved')) return <FirstApproved p={p} />
  const v = brdView(p)
  const a = brdAmounts(p)
  const miss = projectMissing(p)
  const noPay = verifiedOf(p) === 0
  const missing = [...miss.map((m) => m.label), ...(noPay ? ['A verified payment'] : [])]
  const ok = sectionOk(p)
  const editable = v === 'draft' || v === 'ready'

  const submit = () =>
    gate.run(missing, () => {
      const now = new Date().toISOString()
      mutate((d) => {
        const pp = d.projects.find((x) => x.id === p.id)!
        pp.brd = { ...pp.brd, state: 'submitted', submittedAt: now, submittedBy: d.me, claimed: verifiedOf(pp), decisionBy: atDay(5, '18:00').slice(0, 10), delayed: false, history: [...pp.brd.history, { at: now, text: `Submitted by ${d.me}`, kind: 'send' }] }
      })
      fireConfetti()
      toast(`BRD submitted · ${inr(verifiedOf(p))} claimed · auto-review starts shortly`)
    })

  const fixLink = (key: string) => (key === 'plan' || key.startsWith('dates') ? `/projects/${p.id}/plan` : `/projects/${p.id}/edit`)
  const delayed = (v === 'auto' || v === 'submitted') && (p.brd.delayed || (p.brd.decisionBy && new Date(p.brd.decisionBy) < new Date(today())))

  const panel = (
    <div className="col" style={{ gap: 14 }}>
      {editable && (
        <div className="pan pad" style={{ padding: 18, gap: 12 }}>
          <span className="b">Revenue claimed</span>
          <div className="row jb s13">
            <span className="mut">Received, with proof</span>
            <span className="b gd">{inr(a.verified)}</span>
          </div>
          <div className="row jb s13">
            <span className="mut">Pending</span>
            <span className="b">{inr(Math.max(0, p.value - a.verified))}</span>
          </div>
          <Bar pct={p.value ? (a.verified / p.value) * 100 : 0} g />
          <div className="tip n">
            <Icon n="info" s="sm" style={{ marginTop: 1 }} />
            <span>Only verified payments count. {inr(a.verified)} is verified now; later payments are added once verified.</span>
          </div>
          {miss.length > 0 && (
            <div className="col" style={{ gap: 6 }}>
              {miss.map((m) => (
                <div key={m.key} className="row s13">
                  <Icon n="alert" s="sm" className="od" />
                  <span className="f1 b">{m.label}</span>
                  <button type="button" className="lnk s12" onClick={() => go(fixLink(m.key))}>
                    Fix
                  </button>
                </div>
              ))}
            </div>
          )}
          <GateNote tried={gate.tried} missing={missing} again="Tap again to submit anyway." />
          <button type="button" className={`btn pri ${missing.length ? 'dis' : ''}`} onClick={submit}>
            <Icon n="send" />
            Submit for review
          </button>
          <button type="button" className="btn sm gh" onClick={() => window.print()}>
            <Icon n="dl" s="sm" />
            Download PDF
          </button>
        </div>
      )}
      {(v === 'submitted' || v === 'auto') && (
        <div className="pan pad" style={{ padding: 18, gap: 12 }}>
          <div className="row jb">
            <span className="b">Review status</span>
            <Tag cls={BRD_TAG[v].cls}>{BRD_TAG[v].text}</Tag>
          </div>
          <ReviewTimeline p={p} />
          {delayed && (
            <Banner tone="gry" icon="info">
              The BRAVE team has been alerted. Nothing to do on your side; the BRD stays Submitted.
            </Banner>
          )}
          <span className="s12 fnt">{inr(a.claimed)} claimed · locked while the auto-review runs.</span>
          <Simulate p={p} />
        </div>
      )}
      {(v === 'approved' || v === 'partly') && (
        <div className="pan pad" style={{ padding: 18, gap: 12, borderColor: '#CFC7BA' }}>
          <div className="row jb">
            <span className="b">{v === 'partly' ? 'Partly approved' : 'Approved'}</span>
            <Tag cls={BRD_TAG[v].cls}>{p.brd.approvedAt ? fmtDate(p.brd.approvedAt) : ''}</Tag>
          </div>
          <Bar pct={(a.approved / p.value) * 100} g h={8} />
          <div className="row jb s13">
            <span className="gd b">{inr(a.approved)} approved</span>
            {v === 'partly' && <span className="td b">{inr(p.value - a.approved)} pending</span>}
          </div>
          {v === 'partly' && (
            <>
              <span className="s12 mut">When you log the next payment in the project, it's added here for a quick review of that amount only.</span>
              <button type="button" className="btn sm" onClick={() => go(`/projects/${p.id}`)}>
                <Icon n="wallet" s="sm" />
                Log next payment
              </button>
            </>
          )}
          <button type="button" className="btn sm gh" onClick={() => window.print()}>
            <Icon n="dl" s="sm" />
            Download PDF
          </button>
        </div>
      )}
      {(v === 'rejected' || v === 'closed') && (
        <div className="pan pad" style={{ padding: 18, gap: 12, borderColor: '#F0C8C2' }}>
          <div className="row jb">
            <span className="b">Rejected</span>
            <Tag cls="t-red">{p.brd.rejectedAt ? fmtDate(p.brd.rejectedAt) : ''}</Tag>
          </div>
          <span className="s13" style={{ lineHeight: 1.5 }}>
            {p.brd.reason}
          </span>
          <span className="s12 td">
            Resubmit by {p.brd.deadline ? fmtDateTime(p.brd.deadline) : ''} · {deadlineLeft(p.brd.deadline)}
          </span>
          <button type="button" className="btn pri" onClick={() => go(`/brds/${p.id}/fix`)}>
            <Icon n="redo" />
            Fix and resubmit
          </button>
        </div>
      )}
      <span className="s12 fnt" style={{ lineHeight: 1.5 }}>
        Submitted BRDs are locked. Edits to the project after approval start a new review.
      </span>
    </div>
  )

  if (!mobile) {
    return (
      <Page mobile={false} desk="brds" wide>
        <a href="#/brds" className="s13 mut no-print" style={{ textDecoration: 'none' }}>
          ‹ BRDs
        </a>
        <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
          <div className="col no-print" style={{ width: 210, gap: 4, position: 'sticky', top: 80 }}>
            <span className="s12 fnt b" style={{ marginBottom: 6 }}>
              SECTIONS
            </span>
            {SECTIONS.map((s, i) => (
              <a key={s} href={`#/brds/${p.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`s${i + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className="row s13" style={{ padding: '8px 10px', borderRadius: 8, color: 'inherit', textDecoration: 'none' }}>
                <Icon n={ok[i] ? 'ccheck' : 'alert'} s="sm" className={ok[i] ? 'gd' : 'td'} />
                {s}
              </a>
            ))}
          </div>
          <div className="pan f1" style={{ padding: '28px 34px' }}>
            <BrdDocument p={p} />
          </div>
          <div className="no-print" style={{ width: 300, position: 'sticky', top: 80 }}>
            {panel}
          </div>
        </div>
      </Page>
    )
  }

  // ---- phone ----
  if (v === 'submitted' || v === 'auto') {
    return (
      <Page mobile header={<SubBar title="BRD" fallback="/brds" />}>
        <div className="scr">
          <div className="col" style={{ gap: 6 }}>
            <span className="h2">
              {p.client.business} · {offeringName(state, p).replace('WhatsApp ', '')}
            </span>
            <div className="row">
              <Tag cls={BRD_TAG[v].cls}>{v === 'auto' ? 'Auto-review running' : 'Submitted'}</Tag>
              <span className="s12 mut">{inr(a.claimed)} claimed</span>
            </div>
          </div>
          <div className="card">
            <ReviewTimeline p={p} />
          </div>
          {delayed && (
            <Banner tone="gry" icon="info">
              The BRAVE team has been alerted. Nothing to do on your side; the BRD stays Submitted.
            </Banner>
          )}
          <button type="button" className="btn" onClick={() => setShowDoc((s) => !s)}>
            <Icon n="file" />
            {showDoc ? 'Hide submitted BRD' : 'View submitted BRD'}
          </button>
          {showDoc && (
            <div className="card">
              <BrdDocument p={p} compact />
            </div>
          )}
          <Simulate p={p} />
        </div>
      </Page>
    )
  }
  return (
    <Page mobile header={<SubBar title={editable ? 'BRD preview' : 'BRD'} fallback="/brds" right={!editable ? <Tag cls={BRD_TAG[v].cls}>{BRD_TAG[v].text}</Tag> : undefined} />}>
      <div className="scr">
        {editable && miss.length > 0 ? (
          <>
            <div className="img" style={{ width: '100%', height: 150 }}>
              BRD PDF · generated {fmtDate(today())}
            </div>
            <div className="col" style={{ gap: 2 }}>
              <span className="h2">
                {p.client.business} · {offeringName(state, p)}
              </span>
              <span className="s13 mut">Built from the lead, project and payments</span>
            </div>
            <Banner tone="red" icon="alert">
              <b>{plural(miss.length, 'thing is', 'things are')} missing.</b> Fix {miss.length === 1 ? 'it' : 'them'} in the project and the BRD updates.
            </Banner>
            {miss.map((m) => (
              <div key={m.key} className="row s13" style={{ padding: '4px 0' }}>
                <Icon n="alert" s="sm" className="od" />
                <span className="f1 b">{m.label}</span>
                <button type="button" className="lnk" onClick={() => go(fixLink(m.key))}>
                  Fix
                </button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => setShowDoc((s) => !s)}>
              <Icon n="file" />
              {showDoc ? 'Hide the draft' : 'Read the draft'}
            </button>
            {showDoc && (
              <div className="card">
                <BrdDocument p={p} compact />
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <BrdDocument p={p} compact />
          </div>
        )}
        {!editable && panel}
        {editable && noPay && miss.length === 0 && (
          <Banner tone="amb" icon="wallet">
            Log a payment and let it verify before submitting.
          </Banner>
        )}
      </div>
      {editable && (
        <div className="bbar">
          <GateNote tried={gate.tried} missing={missing} again="Tap again to submit anyway." />
          <button type="button" className={`btn pri w ${missing.length ? 'dis' : ''}`} onClick={submit}>
            <Icon n="send" />
            Submit BRD{a.verified ? ` · ${inr(a.verified)}` : ''}
          </button>
        </div>
      )}
    </Page>
  )
}

// ---------- Fix & resubmit ----------

export function BrdFixPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const p = state.projects.find((x) => x.id === id)
  const [newProof, setNewProof] = useState<FileRef | null>(null)
  const [note, setNote] = useState('')
  const gate = useGate()
  if (!p) return <Center icon="file" title="BRD not found" />
  const v = brdView(p)
  if (v !== 'rejected' && v !== 'closed') {
    return (
      <Page mobile={mobile} desk="brds" header={<SubBar title="Fix & resubmit" fallback="/brds" />}>
        <Center icon="ccheck" iconBg="#EAE5DC" iconFg="#111111" title="Nothing to fix">
          <span className="s13 mut">This BRD is {BRD_TAG[v].text.toLowerCase()}.</span>
          <button type="button" className="btn" onClick={() => go(`/brds/${p.id}`)}>
            Open BRD
          </button>
        </Center>
      </Page>
    )
  }
  const flagged = p.payments.find((x) => x.id === p.brd.flaggedPaymentId)
  const tFlag = flagged ? targets(p).find((t) => t.key === flagged.target) : undefined
  const missing = flagged && !newProof ? ['Replace the flagged receipt'] : []
  const resubmit = () =>
    gate.run(missing, () => {
      const now = new Date().toISOString()
      mutate((d) => {
        const pp = d.projects.find((x) => x.id === p.id)!
        if (flagged && newProof) {
          const pay = pp.payments.find((x) => x.id === flagged.id)!
          pay.replacedFrom = pay.receipts[0]?.proof
          pay.receipts[0] = { ...pay.receipts[0], proof: newProof }
          pay.flagged = 'replaced'
        }
        pp.brd = {
          ...pp.brd,
          state: 'submitted',
          submittedAt: now,
          submittedBy: d.me,
          note: note.trim() || undefined,
          decisionBy: atDay(3, '18:00').slice(0, 10),
          history: [...pp.brd.history, ...(newProof ? [{ at: now, text: `Receipt replaced by ${d.me}`, kind: 'edit' as const }] : []), { at: now, text: `Resubmitted by ${d.me}`, kind: 'send' as const }],
        }
      })
      toast('Resubmitted · auto-review runs again now')
      go(`/brds/${p.id}`, { replace: true })
    })

  const reason = (
    <div className="pan pad" style={{ padding: '16px 18px', gap: 8, borderColor: '#F0C8C2', background: '#FDF6F5' }}>
      <div className="row">
        <Icon n="alert" style={{ color: '#C0392B' }} />
        <span className="b" style={{ color: '#A93226' }}>
          Auto-review reason · {p.brd.rejectedAt ? fmtDate(p.brd.rejectedAt) : ''}
        </span>
      </div>
      <span className="s13" style={{ lineHeight: 1.5 }}>
        {p.brd.reason} Everything else is fine.
      </span>
      <span className="s12 mut">Flagged section: {p.brd.flaggedSection}</span>
    </div>
  )
  const deadline = (
    <div className="row" style={{ gap: 8, padding: '8px 14px', borderRadius: 10, background: v === 'closed' ? '#FBE9E6' : '#EAE5DC', color: v === 'closed' ? '#A93226' : '#111111' }}>
      <Icon n="clock" />
      <span className="s13 b">{v === 'closed' ? 'The 3-day window has closed. Resubmitting goes to your mentor.' : `Resubmit by ${p.brd.deadline ? fmtDateTime(p.brd.deadline) : ''} · ${deadlineLeft(p.brd.deadline)}`}</span>
    </div>
  )
  const payments = (
    <div className="pan">
      <div className="row jb" style={{ padding: '14px 18px', borderBottom: '1px solid #F0ECE6' }}>
        <span className="b">6. Payments</span>
        <span className="s12 mut">only flagged items need changes</span>
      </div>
      {targets(p).map((t) => {
        const isFlag = flagged && flagged.target === t.key
        const got = loggedOn(p, t.key)
        return isFlag ? (
          <div key={t.key} className={mobile ? 'col' : 'row'} style={{ padding: '16px 18px', gap: 14, background: '#FDF6F5', boxShadow: 'inset 3px 0 0 #C0392B', borderBottom: '1px solid #F0ECE6' }}>
            <div className="col f1" style={{ gap: 3 }}>
              <span className="b">
                {t.short} · {inr(flagged!.amount)}
              </span>
              <span className="s12 mut">Received {fmtDate(flagged!.date)} · UPI</span>
            </div>
            <div className="row" style={{ gap: 14 }}>
              <div className="col" style={{ gap: 4, alignItems: 'center' }}>
                <Thumb f={flagged!.receipts[0]?.proof ?? { id: 'x', name: 'old', label: 'old' }} w={60} h={48} style={{ opacity: 0.5 }} />
                <span className="s12 od">Cropped</span>
              </div>
              <Icon n="arrow" className="fnt" />
              <div className="col" style={{ gap: 4, alignItems: 'center' }}>
                {newProof ? <Thumb f={newProof} w={60} h={48} style={{ outline: '2px solid #111111' }} /> : <div className="img" style={{ width: 60, height: 48, outline: gate.tried ? '2px solid #E3A59C' : undefined }}>new</div>}
                <span className={`s12 ${newProof ? 'gd' : 'mut'}`}>{newProof ? 'Replaced' : 'Not yet'}</span>
              </div>
              <div className="col" style={{ gap: 6 }}>
                <FilePick className="btn sm" onPick={(f) => setNewProof(f[0])}>
                  <Icon n="up" s="sm" />
                  {newProof ? 'Replace again' : 'Upload full receipt'}
                </FilePick>
                {!newProof && (
                  <button type="button" className="lnk s12" onClick={() => setNewProof({ id: uid('f'), name: 'full_receipt.jpg', label: 'full receipt' })}>
                    Use a sample receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div key={t.key} className="row" style={{ padding: '16px 18px', gap: 14, borderBottom: '1px solid #F0ECE6' }}>
            <div className="col f1" style={{ gap: 3 }}>
              <span className="b">
                {t.short} · {inr(t.expected)}
              </span>
              <span className="s12 mut">{got ? `${inr(got)} received` : `Due ${t.due ? fmtDate(t.due) : ''} · not received yet`}</span>
            </div>
            <Tag cls={got >= t.expected ? 't-grn' : 't-drf'}>{got >= t.expected ? 'Accepted' : 'Pending'}</Tag>
          </div>
        )
      })}
    </div>
  )
  const side = (
    <>
      <div className="pan pad" style={{ padding: 18, gap: 12 }}>
        <span className="b">Resubmit</span>
        {flagged && (
          <div className="row s13">
            <Icon n={newProof ? 'ccheck' : 'circle'} s="sm" className={newProof ? 'gd' : 'fnt'} />
            <span className="f1">{tFlag?.short ?? 'Payment'} receipt replaced</span>
            <span className={`b ${newProof ? 'gd' : 'mut'}`}>{newProof ? 1 : 0} / 1</span>
          </div>
        )}
        <span className="lbl">
          What you changed <span className="s12 fnt" style={{ fontWeight: 500 }}>optional</span>
        </span>
        <TextArea boxStyle={{ minHeight: 76 }} className="s13" placeholder="e.g. Uploaded the full PhonePe receipt with amount and date." value={note} onChange={(e) => setNote(e.target.value)} />
        <GateNote tried={gate.tried} missing={missing} again="Tap again to resubmit anyway." />
        <button type="button" className={`btn pri ${missing.length ? 'dis' : ''}`} onClick={resubmit}>
          <Icon n="send" />
          Resubmit for review
        </button>
        <span className="s12 fnt" style={{ lineHeight: 1.5 }}>
          Auto-review runs again as soon as you resubmit.
        </span>
      </div>
      <div className="pan pad" style={{ padding: 18 }}>
        <span className="b s13">History</span>
        {p.brd.history.map((h, i) => (
          <div key={i} className="row s13">
            <Icon n={h.kind === 'reject' ? 'x' : h.kind === 'edit' ? 'edit' : h.kind === 'send' ? 'send' : 'check'} s="sm" className="fnt" style={h.kind === 'reject' ? { color: '#C0392B' } : undefined} />
            <span className="f1">{h.text}</span>
            <span className="s12 fnt">{fmtDate(h.at)}</span>
          </div>
        ))}
        {newProof && (
          <div className="row s13">
            <Icon n="edit" s="sm" className="fnt" />
            <span className="f1">Receipt replaced by {state.me}</span>
            <span className="s12 fnt">Today</span>
          </div>
        )}
      </div>
    </>
  )
  const accepted = (
    <div className="pan" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon n="ccheck" className="gd" />
      <span className="s13 f1">Sections 1–5 were accepted and stay as they are.</span>
      <button type="button" className="lnk" onClick={() => go(`/brds/${p.id}`)}>
        View full BRD
      </button>
    </div>
  )
  if (mobile) {
    return (
      <Page mobile header={<SubBar title="Fix & resubmit" fallback="/brds" />}>
        <div className="scr">
          <div className="col" style={{ gap: 4 }}>
            <span className="h2">
              {p.client.business} · {offeringName(state, p)}
            </span>
            <Tag cls="t-red" style={{ alignSelf: 'flex-start' }}>
              Rejected
            </Tag>
          </div>
          {deadline}
          {reason}
          {payments}
          {accepted}
          {side}
        </div>
      </Page>
    )
  }
  return (
    <Page mobile={false} desk="brds" wide>
      <div className="row jb">
        <div className="col" style={{ gap: 3 }}>
          <span className="s13 mut">
            <a href="#/brds" style={{ color: 'inherit', textDecoration: 'none' }}>
              BRDs
            </a>{' '}
            › Rejected
          </span>
          <div className="row" style={{ gap: 10 }}>
            <span className="h1">
              {p.client.business} · {offeringName(state, p)}
            </span>
            <Tag cls="t-red">Rejected</Tag>
          </div>
        </div>
        {deadline}
      </div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div className="col f1" style={{ gap: 14 }}>
          {reason}
          {payments}
          {accepted}
        </div>
        <div className="col" style={{ width: 340, gap: 14 }}>
          {side}
        </div>
      </div>
    </Page>
  )
}
