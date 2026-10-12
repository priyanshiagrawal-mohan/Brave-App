import { useState } from 'react'
import { brdView, BRD_TAG, leftOn, loggedOn, offeringName, paymentsFor, planTotal, projectMissing, projectStatus, receivedOf, targets, utrIndex, verifiedOf, verifiedOn, type Target } from '../data/derive'
import type { FileRef, Payment, PayStatus, Project, Receipt } from '../data/types'
import { daysFromToday, fmtDate, fmtRange, fmtUtr, inr, plural, today, uid } from '../lib/format'
import { isUtr, readReceipt } from '../lib/receipt'
import { back, go } from '../router'
import { Page, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, Bar, Center, Chip, FilePick, GateNote, Icon, OverlayHead, Responsive, Tag, TextInput, Thumb, useGate, useIsMobile } from '../ui'
import { PlanEditor, planSum, type PlanDraft } from './ProjectEditor'

const PAY_TAG: Record<PayStatus, { text: string; cls: string }> = {
  verified: { text: 'Verified', cls: 't-grn' },
  pending: { text: 'Pending', cls: 't-ter' },
  rejected: { text: 'Rejected', cls: 't-red' },
  refunded: { text: 'Refunded', cls: 't-drf' },
}

// ---------- Log payment ----------

interface Shot {
  ref: FileRef
  reading: boolean
  utr: string
  amount: number | null
  dup?: boolean
}

function sampleUtr(taken: Map<string, unknown>) {
  let u = ''
  do u = String(5_000_000_00000 + Math.floor(Math.random() * 4_999_999_99999)).slice(0, 12)
  while (taken.has(u))
  return u
}

export function LogPayment({ p, target, onClose }: { p: Project; target?: string; onClose: () => void }) {
  const { state, mutate, toast } = useStore()
  const mobile = useIsMobile()
  const ts = targets(p)
  const firstOpen = ts.find((t) => leftOn(p, t.key) > 0)?.key ?? ts[0]?.key ?? 'advance'
  const [tk, setTk] = useState(target ?? firstOpen)
  const t = ts.find((x) => x.key === tk)
  const left = t ? leftOn(p, t.key) : 0
  const [amount, setAmount] = useState(left)
  const [part, setPart] = useState(false)
  const [shots, setShots] = useState<Shot[]>([])
  const [utr, setUtr] = useState('')
  const [utrRead, setUtrRead] = useState(false)
  const [editUtr, setEditUtr] = useState(false)
  const gate = useGate()

  const taken = utrIndex(state)
  const usedSrc = new Set(state.projects.flatMap((x) => x.payments.flatMap((y) => y.receipts.map((r) => r.proof.src).filter(Boolean))))
  const reading = shots.some((s) => s.reading)
  const dupImg = shots.some((s) => s.dup)
  const dupUtr = isUtr(utr) ? taken.get(utr) : undefined
  const over = amount > left && left > 0

  const addShots = (refs: FileRef[], files: File[]) => {
    const fresh = refs.slice(0, 5 - shots.length).map((ref) => ({ ref, reading: true, utr: '', amount: null, dup: !!ref.src && usedSrc.has(ref.src) }))
    setShots((s) => [...s, ...fresh])
    fresh.forEach(async (sh, i) => {
      const r = await readReceipt(files[i])
      setShots((s) => s.map((x) => (x.ref.id === sh.ref.id ? { ...x, reading: false, utr: r.utr ?? '', amount: r.amount } : x)))
      if (r.utr) {
        setUtr((u) => u || r.utr!)
        setUtrRead(true)
      } else if (!utr) setUtrRead(false)
      if (r.amount && !part) setAmount((a) => (shots.length === 0 && i === 0 ? Math.min(r.amount!, Math.max(left, r.amount!)) : a))
    })
  }
  const addSample = () => {
    const u = sampleUtr(taken)
    setShots((s) => [...s, { ref: { id: uid('f'), name: 'phonepe_receipt.jpg', label: `UPI ${s.length + 1}` }, reading: false, utr: u, amount: left }])
    setUtr((x) => x || u)
    setUtrRead(true)
  }
  const replace = (refs: FileRef[], files: File[]) => {
    setShots([])
    setUtr('')
    setUtrRead(false)
    addShots(refs, files)
  }

  const missing = [
    ...(shots.length ? [] : ['A UPI screenshot']),
    ...(amount > 0 ? [] : ['Amount received']),
    ...(isUtr(utr) ? [] : ['The 12-digit UTR']),
  ]

  const submit = (opts: { mismatch?: boolean } = {}) =>
    gate.run([...missing, ...(dupUtr || dupImg ? ['A screenshot and UTR not used before'] : []), ...(reading ? ['Screenshots still reading'] : [])], () => {
      const now = new Date().toISOString()
      const offline = !state.sys.online
      const receipts: Receipt[] = (shots.length ? shots : [{ ref: { id: uid('f'), name: 'upi.jpg', label: 'UPI' }, reading: false, utr, amount }]).map((s) => ({
        id: uid('rc'),
        proof: s.ref,
        amount: shots.length > 1 ? s.amount ?? Math.round(amount / shots.length) : amount,
        utr: utr || s.utr,
        amountRead: s.amount != null,
        utrRead,
      }))
      const dup = !!(dupUtr || dupImg)
      const pay: Payment = {
        id: uid('pay'),
        target: tk,
        amount,
        date: today(),
        receipts,
        status: dup ? 'rejected' : 'pending',
        manual: !utrRead,
        reason: dup ? (dupUtr ? `Duplicate UTR · already on ${dupUtr.project.client.business} · ${dupUtr.label} (${fmtDate(dupUtr.date)})` : 'Same screenshot as an earlier payment') : undefined,
        submittedAt: now,
        mismatch: opts.mismatch || over,
        pendingSync: offline,
      }
      mutate((d) => {
        d.projects.find((x) => x.id === p.id)!.payments.push(pay)
      })
      onClose()
      if (dup) toast('Rejected as a duplicate. Each payment needs its own screenshot and UTR.', 'err')
      else if (offline) toast('Saved on this phone · goes for verification when you are back online')
      else if (opts.mismatch || over) toast("Saved as pending. Fix the amount or the plan so it can be verified.", 'warn')
      else if (!utrRead) toast('Submitted for review · typed UTRs get a manual check')
      else toast(`Submitted for verification · ${inr(amount)} for ${t?.short ?? 'the payment'}`)
    })

  return (
    <Responsive mobile={mobile} onClose={onClose} label="Log payment" width={500}>
      <OverlayHead title="Log payment" sub={`${p.client.business} · ${offeringName(state, p).toLowerCase()}`} onClose={onClose} />
      <span className="lbl">Which part of the plan?</span>
      <div className="col" style={{ gap: 6 }}>
        {ts.map((x) => {
          const l = leftOn(p, x.key)
          const full = l === 0
          return (
            <button
              key={x.key}
              type="button"
              className={`opt ${tk === x.key ? 'on' : ''}`}
              style={{ padding: '10px 12px', opacity: full ? 0.55 : 1 }}
              onClick={() => {
                if (full) return toast(`${x.short} is fully logged`, 'info')
                setTk(x.key)
                setAmount(l)
                setPart(false)
              }}
            >
              {full ? <Icon n="ccheck" s="sm" className="gd" /> : <div className="rad" />}
              <span className="f1 s13 b">{x.label}</span>
              <span className="s12 mut">{full ? `${inr(loggedOn(p, x.key))} received` : loggedOn(p, x.key) ? `${inr(l)} left` : inr(x.expected)}</span>
            </button>
          )
        })}
      </div>
      <span className="lbl">Amount received</span>
      <TextInput boxClass={`big ${over ? 'err' : ''}`} inputMode="numeric" value={amount ? `₹ ${amount.toLocaleString('en-IN')}` : ''} placeholder="₹ 0" onChange={(e) => setAmount(Number(e.target.value.replace(/[^\d]/g, '')) || 0)} aria-label="Amount received" />
      <div className="chips">
        <Chip on={!part && amount === left} onClick={() => { setPart(false); setAmount(left) }}>
          Full remaining
        </Chip>
        <Chip on={part || (amount !== left && amount > 0 && amount < left)} onClick={() => { setPart(true); setAmount(0) }}>
          Part payment
        </Chip>
        <Chip on>Today</Chip>
      </div>
      {over && (
        <>
          <Banner tone="amb" icon="warn">
            {inr(amount)} is more than what's left on {t?.short} ({inr(left)}). It can't be verified until the amount or the plan is fixed.
          </Banner>
          <div className="row">
            <button type="button" className="btn f1" onClick={() => setAmount(left)}>
              Change amount
            </button>
            <button type="button" className="btn f1" onClick={() => { onClose(); go(`/projects/${p.id}/plan`) }}>
              Edit plan
            </button>
          </div>
          <button type="button" className="btn gh" onClick={() => submit({ mismatch: true })}>
            Save as pending, fix later
          </button>
        </>
      )}
      <span className="lbl">
        UPI screenshots <span className="req">*</span>
      </span>
      <div className="row wr" style={{ alignItems: 'center' }}>
        {shots.map((s) => (
          <Thumb key={s.ref.id} f={s.ref} w={56} h={56} style={s.dup ? { outline: '2px solid #E3A59C' } : undefined} onRemove={() => setShots((x) => x.filter((y) => y.ref.id !== s.ref.id))} />
        ))}
        {shots.length < 5 && (
          <FilePick className={`in ${gate.tried && !shots.length ? 'err' : ''}`} multiple label="Add UPI screenshots" style={{ width: 56, height: 56, justifyContent: 'center', borderStyle: 'dashed', padding: 0 }} onPick={addShots}>
            <Icon n="plus" className="fnt" />
          </FilePick>
        )}
        <div className="col f1" style={{ gap: 2, alignItems: 'flex-end' }}>
          {reading ? (
            <span className="s12 mut row" style={{ gap: 4 }}>
              <Icon n="scan" s="sm" />
              Reading UTR…
            </span>
          ) : shots.length ? (
            <span className="s12 mut">{plural(shots.length, 'screenshot')}</span>
          ) : (
            <button type="button" className="lnk s12" onClick={addSample}>
              Use a sample screenshot
            </button>
          )}
        </div>
      </div>
      {dupImg && (
        <div className="row s12" style={{ gap: 6 }}>
          <span className="b od">Already used</span>
          <span className="mut">Same image as an earlier payment</span>
        </div>
      )}
      {shots.length > 0 && !reading && !utrRead && !dupUtr && (
        <Banner tone="amb" icon="scan">
          We couldn't read the UTR. Type the 12-digit number from the screenshot.
        </Banner>
      )}
      {(shots.length > 0 || utr) && !reading && (
        <>
          <span className="lbl">UTR {!utrRead && <span className="req">*</span>}</span>
          {utrRead && !editUtr ? (
            <div className={`in ${dupUtr ? 'err' : ''}`}>
              <span className="f1 tnum">{fmtUtr(utr)}</span>
              {!dupUtr && (
                <Tag cls="t-grn" icon="scan">
                  Read
                </Tag>
              )}
              <button type="button" className="btn gh sm" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setEditUtr(true)} aria-label="Correct the UTR">
                <Icon n="edit" s="sm" />
              </button>
            </div>
          ) : (
            <TextInput bad={!!dupUtr || (gate.tried && !isUtr(utr))} inputMode="numeric" placeholder="12-digit UTR / UPI ref no." value={fmtUtr(utr)} onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))} autoFocus={!utrRead} />
          )}
          {dupUtr ? (
            <>
              <Banner tone="red" icon="copy">
                This UTR is already on <b>{dupUtr.project.client.business} · {dupUtr.label}</b> ({fmtDate(dupUtr.date)}). Each payment needs its own screenshot and UTR.
              </Banner>
              <FilePick className="btn" onPick={replace}>
                <Icon n="up" />
                Replace screenshot
              </FilePick>
            </>
          ) : (
            <span className="s12 mut">{utrRead ? 'Check it matches the screenshot. You can correct it.' : 'Typed UTRs get a manual check before they’re verified.'}</span>
          )}
        </>
      )}
      <GateNote tried={gate.tried} missing={[...missing, ...(dupUtr || dupImg ? ['A screenshot and UTR not used before'] : [])]} again={dupUtr || dupImg ? 'Tap again to submit; it will be rejected as a duplicate.' : 'Tap again to continue anyway.'} />
      {!over && (
        <button type="button" className={`btn pri ${missing.length || dupUtr || dupImg ? 'dis' : ''}`} onClick={() => submit()} disabled={reading}>
          {utrRead || !shots.length ? 'Submit for verification' : 'Submit for review'}
        </button>
      )}
    </Responsive>
  )
}

// ---------- Project detail ----------

function PayRow({ x, p, onReupload }: { x: Payment; p: Project; onReupload: (x: Payment) => void }) {
  const tag = x.mismatch && x.status === 'pending' ? { text: 'Fix amount', cls: 't-red' } : x.pendingSync ? { text: 'Waiting to sync', cls: 't-ter' } : PAY_TAG[x.status]
  const u = x.receipts[0]?.utr
  return (
    <div className="col" style={{ gap: 4, padding: '8px 10px', background: '#F4F1EC', borderRadius: 10 }}>
      <div className="row jb s13">
        <span className="row" style={{ gap: 8, minWidth: 0 }}>
          <Thumb f={x.receipts[0]?.proof} w={32} h={32} />
          <span className="col" style={{ gap: 0, minWidth: 0 }}>
            <span className="b">{inr(x.amount)}</span>
            <span className="s12 mut ell">
              {x.status === 'refunded' ? `Refunded to client ${fmtDate(x.verifiedAt ?? x.date)}` : `${u ? `UTR …${u.slice(-4)} · ` : ''}${x.status === 'pending' ? `submitted ${fmtDate(x.submittedAt)}${x.manual ? ' · manual check' : ' · being checked'}` : fmtDate(x.date)}`}
            </span>
          </span>
        </span>
        <Tag cls={tag.cls}>{tag.text}</Tag>
      </div>
      {x.status === 'rejected' && x.reason && <span className="s12 od">{x.reason}</span>}
      {x.status === 'refunded' && <span className="s12 mut">{Math.round(x.amount * 0.015)} XP reversed</span>}
      {x.mismatch && x.status === 'pending' && <span className="s12 od">More than this part of the plan. Fix the amount or the plan.</span>}
      {x.status === 'rejected' && (
        <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => onReupload(x)}>
          <Icon n="up" s="sm" />
          Re-upload
        </button>
      )}
      {x.flagged === 'cropped' && p.brd.state === 'rejected' && (
        <button type="button" className="lnk s12" style={{ alignSelf: 'flex-start' }} onClick={() => go(`/brds/${p.id}/fix`)}>
          Flagged in the BRD review · replace the receipt
        </button>
      )}
    </div>
  )
}

function TargetBlock({ p, t, onLog, onReupload, desk }: { p: Project; t: Target; onLog: (k: string) => void; onReupload: (x: Payment) => void; desk?: boolean }) {
  const { mutate, toast } = useStore()
  const got = loggedOn(p, t.key)
  const ver = verifiedOn(p, t.key)
  const left = Math.max(0, t.expected - got)
  const pays = paymentsFor(p, t.key)
  const phase = p.phases.find((x) => x.id === t.key)
  const icon = ver >= t.expected ? ['check', '#EAE5DC', '#111111'] : got > 0 ? ['clock', '#EAE5DC', '#111111'] : ['cal', '#F3F0EB', '#111111']
  return (
    <div className="row" style={{ padding: desk ? '16px 18px' : 12, gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #F0ECE6' }}>
      <div className="icb" style={{ background: icon[1], color: icon[2] }}>
        <Icon n={icon[0]} />
      </div>
      <div className="col f1" style={{ gap: 6, minWidth: 0 }}>
        <div className="row jb" style={{ alignItems: 'flex-start' }}>
          <div className="col" style={{ gap: 2, minWidth: 0 }}>
            <span className="b">{t.label}</span>
            <span className="s12 mut">{[t.start && t.end ? fmtRange(t.start, t.end) : null, t.deliverables?.toLowerCase(), t.due ? `due ${fmtDate(t.due)}` : null].filter(Boolean).join(' · ')}</span>
          </div>
          <span className="b tnum" style={{ textAlign: 'right', flex: 'none' }}>
            {inr(got)} <span className="s12 mut">/ {inr(t.expected)}</span>
          </span>
        </div>
        {got > 0 && got < t.expected && <Bar pct={(got / t.expected) * 100} g w={desk ? 260 : '100%'} />}
        {pays.map((x) => (
          <PayRow key={x.id} x={x} p={p} onReupload={onReupload} />
        ))}
        <div className="row wr" style={{ gap: 6 }}>
          {left > 0 && (
            <button type="button" className="btn sm" onClick={() => onLog(t.key)}>
              <Icon n="plus" s="sm" />
              Log payment
            </button>
          )}
          {phase && (
            <button
              type="button"
              className={`btn sm ${phase.done ? 'gw' : 'gh'}`}
              onClick={() => {
                mutate((d) => {
                  const ph = d.projects.find((x) => x.id === p.id)!.phases.find((x) => x.id === phase.id)!
                  ph.done = !ph.done
                })
                toast(phase.done ? `${t.short} marked not delivered` : `${t.short} delivered`)
              }}
            >
              <Icon n={phase.done ? 'ccheck' : 'circle'} s="sm" />
              {phase.done ? 'Delivered' : 'Mark delivered'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProjectDetailPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const p = state.projects.find((x) => x.id === id)
  const [logging, setLogging] = useState<{ target?: string } | null>(null)
  if (!p) {
    return (
      <Page mobile={mobile} desk="projects" header={<SubBar title="Project" fallback="/projects" />}>
        <Center icon="pkg" title="Project not found">
          <button type="button" className="btn" onClick={() => go('/projects')}>
            Back to Projects
          </button>
        </Center>
      </Page>
    )
  }
  const title = offeringName(state, p)
  const ts = targets(p)
  const v = verifiedOf(p)
  const got = receivedOf(p)
  const miss = projectMissing(p)
  const st = projectStatus(p)
  const bv = brdView(p)
  const allDone = p.phases.length > 0 && p.phases.every((x) => x.done)
  const onlyAdv = p.advance && v > 0 && v === verifiedOn(p, 'advance') && v < p.value
  const reupload = (x: Payment) => setLogging({ target: x.target })

  const deliver = () => {
    mutate((d) => {
      const pp = d.projects.find((y) => y.id === p.id)!
      pp.deliveredAt = new Date().toISOString()
      if (!pp.testimonial) {
        pp.testimonial = { status: 'requested', requestedAt: new Date().toISOString(), due: daysFromToday(7) }
        d.triggers.unshift({ id: uid('tr'), code: 'T6', pri: 'P3', title: `Video testimonial from ${pp.client.business}`, firedAt: new Date().toISOString(), due: daysFromToday(14), projectId: pp.id })
      }
    })
    toast('Delivered · upload a video testimonial from the client within 7 days')
  }

  const summary = (
    <div className={mobile ? 'card' : 'pan pad'} style={{ gap: 8, padding: mobile ? 14 : 18 }}>
      <div className="row jb">
        <span className="b">{mobile ? `${inr(v)} verified` : 'Payments'}</span>
        <span>
          {!mobile && <span className="h2">{inr(v)}</span>}
          <span className="s13 mut"> {mobile ? `of ${inr(p.value)}` : `of ${inr(p.value)} verified`}</span>
        </span>
      </div>
      <Bar pct={p.value ? (v / p.value) * 100 : 0} g h={mobile ? 6 : 8} />
      <span className="s12 mut">
        {got > v ? `${inr(got - v)} pending verification · ` : ''}Only verified payments count toward revenue and XP.
      </span>
    </div>
  )
  const plan = (
    <section className="sec">
      <div className="sec-h">
        <span className="grp">Payment plan</span>
        <button type="button" className="lnk s13" onClick={() => go(`/projects/${p.id}/plan`)}>
          Edit plan
        </button>
      </div>
      <div className="pan">
        {planTotal(p) !== p.value && p.value > 0 && (
          <div style={{ padding: '12px 14px 0' }}>
            <Banner tone="red" icon="alert">
              Plan adds up to {inr(planTotal(p))}, not {inr(p.value)}.{' '}
              <button type="button" className="lnk" onClick={() => go(`/projects/${p.id}/plan`)}>
                Fix the plan
              </button>
            </Banner>
          </div>
        )}
        {ts.length === 0 ? (
          <div className="empty">
            No plan yet.{' '}
            <button type="button" className="lnk" onClick={() => go(`/projects/${p.id}/plan`)}>
              Add the advance and milestones
            </button>
          </div>
        ) : (
          ts.map((t) => <TargetBlock key={t.key} p={p} t={t} desk={!mobile} onLog={(k) => setLogging({ target: k })} onReupload={reupload} />)
        )}
      </div>
    </section>
  )
  const links = [
    ['live', 'globe', 'Live link'],
    ['demo', 'video', 'Demo video'],
    ['files', 'link', 'Design / code'],
  ] as const
  const hasLinks = links.some(([k]) => p.links?.[k])
  const side = (
    <>
      {miss.length > 0 && (
        <section className="sec">
          <div className="sec-h">
            <span className="grp od">Still needed for the BRD · {miss.length}</span>
          </div>
          <div className="pan dl">
            {miss.map((m) => (
              <button type="button" key={m.key} className="dl-row" onClick={() => go(m.key === 'plan' || m.key.startsWith('dates') ? `/projects/${p.id}/plan` : `/projects/${p.id}/edit`)}>
                <span className="f1">{m.label}</span>
                <span className="lnk s13">Fix</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="sec">
        <div className="sec-h">
          <span className="grp">Details</span>
          <button type="button" className="lnk s13" onClick={() => go(`/projects/${p.id}/edit`)}>
            Edit
          </button>
        </div>
        <div className="pan dl">
          <div className="dl-row">
            <span className="dl-k">Client</span>
            <span className="dl-v">
              {p.client.business}
              <span className="mut">{[p.client.owner, [p.client.area, p.client.city].filter(Boolean).join(', ')].filter(Boolean).map((x) => ` · ${x}`).join('')}</span>
              {p.leadId && (
                <button type="button" className="lnk s13" style={{ display: 'flex', marginTop: 4 }} onClick={() => go(`/leads/${p.leadId}`)}>
                  Open lead
                </button>
              )}
            </span>
          </div>
          <div className="dl-row">
            <span className="dl-k">Offering</span>
            <span className="dl-v">
              {title}
              {p.offeringId && <span className="mut"> · used in {plural(state.projects.filter((x) => x.offeringId === p.offeringId).length, 'project')}</span>}
            </span>
          </div>
          <div className="dl-row">
            <span className="dl-k">Problem</span>
            <span className="dl-v">{p.problem || <span className="mut">Not noted</span>}</span>
          </div>
          <div className="dl-row">
            <span className="dl-k">Solution</span>
            <span className="dl-v">{p.solution || <span className="od">Not written yet</span>}</span>
          </div>
          <div className="dl-row">
            <span className="dl-k">Links</span>
            <span className="dl-v col" style={{ gap: 6 }}>
              {hasLinks ? (
                links.map(([k, icon, label]) =>
                  p.links?.[k] ? (
                    <a key={k} className="row s13 ell" style={{ gap: 6 }} href={/^https?:/.test(p.links[k]!) ? p.links[k] : `https://${p.links[k]}`} target="_blank" rel="noreferrer">
                      <Icon n={icon} s="sm" />
                      {label}
                    </a>
                  ) : null,
                )
              ) : (
                <button type="button" className="lnk s13" style={{ alignSelf: 'flex-start' }} onClick={() => go(`/projects/${p.id}/edit`)}>
                  Add solution link
                </button>
              )}
            </span>
          </div>
          <div className="dl-row">
            <span className="dl-k">Proof</span>
            <span className="dl-v row wr">
              {p.proof.map((f) => (
                <Thumb key={f.id} f={f} w={52} h={52} />
              ))}
              {p.agreement && <Thumb f={p.agreement} w={52} h={52} />}
              {!p.proof.length && !p.agreement && <span className="od">No conversation proof yet</span>}
            </span>
          </div>
        </div>
      </section>
      {(allDone || p.deliveredAt) && (
        <section className="sec">
          <div className="sec-h">
            <span className="grp">Delivery</span>
          </div>
          <div className="pan dl">
            {p.deliveredAt ? (
              <button type="button" className="dl-row" onClick={() => go(`/testimonials/${p.id}`)}>
                <Icon n="video" className="mut" />
                <span className="col f1" style={{ gap: 2 }}>
                  <span className="b s13">{p.testimonial?.status === 'received' ? 'Testimonial received' : p.testimonial?.status === 'declined' ? 'Client declined a video' : 'Upload a video testimonial'}</span>
                  <span className="s12 mut">Delivered {fmtDate(p.deliveredAt)}</span>
                </span>
                <Icon n="right" className="fnt" />
              </button>
            ) : (
              <div className="dl-row col" style={{ alignItems: 'flex-start' }}>
                <span className="s13 mut">Every milestone is delivered. Mark the project delivered to ask for a video testimonial.</span>
                <button type="button" className="btn sm drk" onClick={deliver}>
                  Mark project delivered
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
  const brdBtn = (
    <button type="button" className={`btn ${mobile ? 'f1' : 'drk'}`} onClick={() => go(`/brds/${p.id}`)}>
      <Icon n="file" />
      {bv === 'ready' ? 'Submit BRD' : bv === 'rejected' ? 'Fix BRD' : 'Preview BRD'}
    </button>
  )
  const sheet = logging && <LogPayment p={p} target={logging.target} onClose={() => setLogging(null)} />

  if (mobile) {
    return (
      <Page
        mobile
        header={
          <SubBar
            title={title}
            fallback="/projects"
            right={
              <button type="button" className="btn gh sm" style={{ width: 34, height: 34, padding: 0 }} onClick={() => go(`/projects/${p.id}/edit`)} aria-label="Edit project">
                <Icon n="edit" className="mut" />
              </button>
            }
          />
        }
      >
        <div className="scr">
          <div className="col" style={{ gap: 4 }}>
            <span className="s13 mut">{p.client.business}</span>
            <div className="row wr">
              <Tag cls={st.cls}>{st.text}</Tag>
              <Tag cls={BRD_TAG[bv].cls}>BRD · {BRD_TAG[bv].text}</Tag>
            </div>
          </div>
          {summary}
          {onlyAdv && (
            <Banner tone="gry" icon="info">
              Only the Advance is verified so far. The project stays active.
            </Banner>
          )}
          <div className="row">
            <button type="button" className="btn pri f1" onClick={() => setLogging({})} disabled={ts.length === 0}>
              <Icon n="wallet" />
              Log payment
            </button>
            {brdBtn}
          </div>
          {plan}
          {side}
        </div>
        {sheet}
      </Page>
    )
  }
  return (
    <Page mobile={false} desk="projects" wide>
      <div className="row jb">
        <div className="col" style={{ gap: 3 }}>
          <span className="s13 mut">
            <a href="#/projects" style={{ color: 'inherit', textDecoration: 'none' }}>
              Projects
            </a>{' '}
            › {p.client.business}
          </span>
          <div className="row" style={{ gap: 10 }}>
            <span className="h1">{title}</span>
            <Tag cls={st.cls}>{st.text}</Tag>
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => go(`/projects/${p.id}/edit`)}>
            <Icon n="edit" />
            Edit
          </button>
          <button type="button" className="btn" onClick={() => setLogging({})} disabled={ts.length === 0}>
            <Icon n="wallet" />
            Log payment
          </button>
          {brdBtn}
        </div>
      </div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div className="col f1" style={{ gap: 14 }}>
          {summary}
          {onlyAdv && (
            <Banner tone="gry" icon="info">
              Only the Advance is verified so far. The project stays active.
            </Banner>
          )}
          {plan}
        </div>
        <div className="col" style={{ width: 330, gap: 14 }}>
          {side}
        </div>
      </div>
      {sheet}
    </Page>
  )
}

// ---------- Payment plan page ----------

export function PlanPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const p = state.projects.find((x) => x.id === id)
  const [plan, setPlan] = useState<PlanDraft>(() => ({ value: p?.value ?? 0, advance: p?.advance ?? null, phases: p?.phases ?? [] }))
  const gate = useGate()
  if (!p) return <Center icon="pkg" title="Project not found" />
  const sum = planSum(plan)
  const missing = [...(plan.value ? [] : ['Project value']), ...(plan.value && sum !== plan.value ? [`Plan adding up to ${inr(plan.value)}`] : []), ...(plan.phases.some((x) => !x.start || !x.end) ? ['Milestone dates'] : [])]
  const save = () =>
    gate.run(missing, () => {
      mutate((d) => {
        const pp = d.projects.find((x) => x.id === p.id)!
        pp.value = plan.value
        pp.advance = plan.advance
        pp.phases = plan.phases
        pp.savedAt = new Date().toISOString()
        // Payments for milestones that no longer exist go back to the advance bucket.
        const keys = new Set(['advance', ...plan.phases.map((x) => x.id)])
        for (const x of pp.payments) if (!keys.has(x.target)) x.target = plan.phases[0]?.id ?? 'advance'
        for (const x of pp.payments) if (x.mismatch && x.status === 'pending') x.mismatch = false
      })
      toast(missing.length ? 'Plan saved · it still needs fixing before the BRD' : 'Payment plan saved', missing.length ? 'warn' : 'ok')
      back(`/projects/${p.id}`)
    })
  return (
    <Page mobile={mobile} desk="projects" header={<SubBar title="Payment plan" fallback={`/projects/${p.id}`} />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && (
          <div className="col" style={{ gap: 3 }}>
            <span className="s13 mut">
              {p.client.business} › {offeringName(state, p)}
            </span>
            <span className="h1">Payment plan</span>
          </div>
        )}
        <span className="s13 mut" style={{ lineHeight: 1.5 }}>
          One advance plus milestones. They must add up to the project value. Milestones can be paid in parts.
        </span>
        <PlanEditor plan={plan} setPlan={setPlan} project={p} showErrors={gate.tried} />
        <div className={mobile ? 'bbar' : 'col'} style={mobile ? { margin: '4px -16px -16px' } : { gap: 8 }}>
          <GateNote tried={gate.tried} missing={missing} again="Tap again to save it anyway." />
          <button type="button" className={`btn pri ${missing.length ? 'dis' : ''}`} onClick={save}>
            Save plan
          </button>
        </div>
      </div>
    </Page>
  )
}

