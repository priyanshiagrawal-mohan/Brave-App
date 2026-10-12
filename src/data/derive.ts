import { addDays, daysUntil, fmtDate, inr, isoDate, plural, today, uid } from '../lib/format'
import { MODE_LABEL, XP } from './constants'
import type { AppState, Lead, Payment, Project, Trigger } from './types'

// ---------- Unlock ----------

export function unlockStatus(s: AppState) {
  const u = s.unlock
  const done = (u.brochure ? 1 : 0) + (u.website ? 1 : 0)
  const reopened = u.exception?.decision === 'approved'
  const locked = !!u.autoLocked && !reopened
  return { done, total: 2, unlocked: done === 2 && !locked, autoLocked: locked, cutoffDays: daysUntil(u.cutoff) }
}

export function workshopProgress(s: AppState) {
  const passed = s.modules.filter((m) => m.status === 'passed').length
  return { passed, total: s.modules.length, pct: (passed / s.modules.length) * 100 }
}

// ---------- Week ----------

/** Monday of this week */
export function weekStart(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  return isoDate(d)
}

export const WEEK_NO = 4

export function weekRange() {
  const from = weekStart()
  return { from, to: addDays(from, 6) }
}

const inWeek = (iso: string) => {
  const d = isoDate(new Date(iso))
  const { from, to } = weekRange()
  return d >= from && d <= to
}

export interface Task {
  key: string
  label: string
  have: number
  need: number
  done: boolean
}

export function weekTasks(s: AppState): Task[] {
  const force = !!s.week.forceDone
  const leadsAdded = s.leads.filter((l) => !l.claimed && inWeek(l.addedAt)).length
  const logs = s.leads.reduce((a, l) => a + l.interactions.filter((x) => !x.leadAdded && !x.flagged && !x.wonMarked && inWeek(x.at)).length, 0)
  const won = s.leads.filter((l) => l.status === 'won' && l.statusAt && inWeek(l.statusAt)).length
  const { from, to } = weekRange()
  const due = s.triggers.filter((t) => t.code.startsWith('T') && t.due >= from && t.due <= to)
  const cleared = due.filter((t) => t.clearedAt).length
  const t = (key: string, label: string, have: number, need: number): Task => {
    const h = force ? Math.max(have, need) : have
    return { key, label, have: h, need, done: h >= need }
  }
  return [
    t('login', 'Log in, start and end of week', Math.min(s.week.logins, 2), 2),
    t('leads', 'Add new leads', leadsAdded, XP.weekTargets.leads),
    t('logs', 'Log interactions', logs, XP.weekTargets.logs),
    t('convert', 'Convert a lead to a project', won, XP.weekTargets.projects),
    t('triggers', 'Clear triggers due this week', force ? due.length : cleared, Math.max(due.length, 0)),
  ].map((x) => (x.key === 'triggers' && x.need === 0 ? { ...x, done: true } : x))
}

export function weekSummary(s: AppState) {
  const tasks = weekTasks(s)
  const done = tasks.filter((t) => t.done).length
  return { tasks, done, pct: Math.round((done / tasks.length) * 100), all: done === tasks.length }
}

// ---------- Leads ----------

export function lastInteraction(l: Lead) {
  return [...l.interactions].sort((a, b) => b.at.localeCompare(a.at))[0]
}

export function lastLabel(l: Lead) {
  const x = lastInteraction(l)
  return x ? `${fmtDate(x.date)} · ${MODE_LABEL[x.mode]}` : '—'
}

export type FollowBucket = 'overdue' | 'today' | 'upcoming' | 'none'

export function followUp(l: Lead): { bucket: FollowBucket; text: string; short: string; cls: string; days: number } {
  if (!l.followUp) return { bucket: 'none', text: 'No follow-up set', short: 'Not set', cls: 'fnt', days: Infinity }
  const d = daysUntil(l.followUp)
  if (d < 0) return { bucket: 'overdue', text: `Overdue by ${plural(-d, 'day')}`, short: `Overdue by ${plural(-d, 'day')}`, cls: 'od', days: d }
  if (d === 0) return { bucket: 'today', text: 'Follow up today', short: 'Today', cls: 'td', days: d }
  return { bucket: 'upcoming', text: `Follow up in ${plural(d, 'day')}`, short: `In ${plural(d, 'day')}`, cls: 'mut', days: d }
}

/** Interactions where progress was made: the lead was added or its stage moved. */
export function progressCount(l: Lead) {
  return l.interactions.filter((x) => x.leadAdded || (x.stageTo && x.stageTo !== x.stageFrom)).length
}

export const activeLeads = (s: AppState) => s.leads.filter((l) => l.status === 'active' && !l.muted)
export const mutedLeads = (s: AppState) => s.leads.filter((l) => l.status === 'active' && !!l.muted)
export const lostLeads = (s: AppState) => s.leads.filter((l) => l.status === 'lost')
export const wonLeads = (s: AppState) => s.leads.filter((l) => l.status === 'won')

export function firstName(full: string) {
  return full.split(' ')[0]
}

/** This week's activity for a team member (by first name, as logs are signed). */
export function memberWeek(s: AppState, name: string) {
  const fn = firstName(name)
  const leads = s.leads.filter((l) => l.addedBy === fn && inWeek(l.addedAt)).length
  const logs = s.leads.reduce((a, l) => a + l.interactions.filter((x) => x.by === fn && !x.leadAdded && inWeek(x.at)).length, 0)
  return { leads, logs }
}

// ---------- Projects & payments ----------

export interface Target {
  key: string
  label: string
  short: string
  expected: number
  due?: string
  deliverables?: string
  start?: string
  end?: string
  done?: boolean
}

export function targets(p: Project): Target[] {
  const out: Target[] = []
  if (p.advance) out.push({ key: 'advance', label: 'Advance', short: 'Advance', expected: p.advance.amount, due: p.advance.due })
  p.phases.forEach((ph, i) => out.push({ key: ph.id, label: ph.name, short: ph.name.split(' · ')[0] || `Milestone ${i + 1}`, expected: ph.amount, due: ph.due, deliverables: ph.deliverables, start: ph.start, end: ph.end, done: ph.done }))
  return out
}

export const planTotal = (p: Project) => (p.advance?.amount ?? 0) + p.phases.reduce((a, x) => a + x.amount, 0)
const counts = (x: Payment) => x.status === 'verified' || x.status === 'pending'
export const verifiedOf = (p: Project) => p.payments.filter((x) => x.status === 'verified').reduce((a, x) => a + x.amount, 0)
export const receivedOf = (p: Project) => p.payments.filter(counts).reduce((a, x) => a + x.amount, 0)
export const paymentsFor = (p: Project, key: string) => p.payments.filter((x) => x.target === key)
export const loggedOn = (p: Project, key: string) => paymentsFor(p, key).filter(counts).reduce((a, x) => a + x.amount, 0)
export const verifiedOn = (p: Project, key: string) => paymentsFor(p, key).filter((x) => x.status === 'verified').reduce((a, x) => a + x.amount, 0)

export function leftOn(p: Project, key: string) {
  const t = targets(p).find((x) => x.key === key)
  return t ? Math.max(0, t.expected - loggedOn(p, key)) : 0
}

export function nextDue(p: Project) {
  for (const t of targets(p)) {
    const left = t.expected - loggedOn(p, t.key)
    if (left > 0) return { target: t, left }
  }
  return null
}

export function offeringName(s: AppState, p: Project) {
  return s.offerings.find((o) => o.id === p.offeringId)?.name ?? 'Untitled project'
}

/** What still blocks a project from having a submittable BRD. */
export function projectMissing(p: Project): { key: string; label: string }[] {
  const m: { key: string; label: string }[] = []
  if (!p.offeringId) m.push({ key: 'title', label: 'Project title' })
  if (!p.solution.trim()) m.push({ key: 'solution', label: 'Solution proposed' })
  p.phases.forEach((ph, i) => {
    if (!ph.start || !ph.end) m.push({ key: `dates-${ph.id}`, label: `Milestone ${i + 1} dates` })
  })
  if (p.value && planTotal(p) !== p.value) m.push({ key: 'plan', label: 'Payment plan adds up' })
  if (p.proof.length === 0) m.push({ key: 'proof', label: 'Conversation proof' })
  return m
}

export function projectStatus(p: Project): { text: string; cls: string } {
  const v = verifiedOf(p)
  if (p.value > 0 && v >= p.value) return { text: 'Paid', cls: 't-grn' }
  if (receivedOf(p) === 0) return { text: 'Draft', cls: 't-drf' }
  const nd = nextDue(p)
  if (!nd) return receivedOf(p) > v ? { text: 'Verifying', cls: 't-ter' } : { text: 'Plan short', cls: 't-red' }
  return { text: nd.target.short, cls: 't-bro' }
}

/** Every UTR logged anywhere in the team (duplicates are rejected). */
export function utrIndex(s: AppState, exceptPaymentId?: string) {
  const m = new Map<string, { project: Project; label: string; date: string }>()
  for (const p of s.projects) {
    for (const pay of p.payments) {
      if (pay.id === exceptPaymentId) continue
      const t = targets(p).find((x) => x.key === pay.target)
      for (const r of pay.receipts) m.set(r.utr, { project: p, label: t?.short ?? 'Payment', date: pay.date })
    }
  }
  return m
}

// ---------- BRDs ----------

export type BrdView = 'draft' | 'ready' | 'submitted' | 'auto' | 'partly' | 'approved' | 'rejected' | 'closed'

export function brdView(p: Project): BrdView {
  const b = p.brd
  switch (b.state) {
    case 'none':
      return projectMissing(p).length === 0 && verifiedOf(p) > 0 ? 'ready' : 'draft'
    case 'submitted':
      return 'submitted'
    case 'auto':
      return 'auto'
    case 'approved':
      return b.approved < p.value ? 'partly' : 'approved'
    case 'rejected':
      return b.deadline && new Date(b.deadline).getTime() < Date.now() ? 'closed' : 'rejected'
  }
}

export const BRD_TAG: Record<BrdView, { text: string; cls: string }> = {
  draft: { text: 'Draft', cls: 't-drf' },
  ready: { text: 'Ready to submit', cls: 't-bro' },
  submitted: { text: 'Submitted', cls: 't-drf' },
  auto: { text: 'Auto-review running', cls: 't-ter' },
  partly: { text: 'Partly approved', cls: 't-ter' },
  approved: { text: 'Approved', cls: 't-grn' },
  rejected: { text: 'Rejected', cls: 't-red' },
  closed: { text: 'Window closed', cls: 't-red' },
}

export type BrdGroup = 'needs' | 'review' | 'approved' | 'drafts'

export function brdGroup(v: BrdView): BrdGroup {
  if (v === 'ready' || v === 'rejected' || v === 'closed') return 'needs'
  if (v === 'submitted' || v === 'auto') return 'review'
  if (v === 'partly' || v === 'approved') return 'approved'
  return 'drafts'
}

export function brdAmounts(p: Project) {
  const total = p.value
  const verified = verifiedOf(p)
  const v = brdView(p)
  const approved = p.brd.approved
  const claimed = v === 'submitted' || v === 'auto' || v === 'rejected' || v === 'closed' ? p.brd.claimed ?? verified : v === 'ready' ? verified : approved
  const pending = Math.max(0, total - Math.max(claimed, approved))
  return { total, verified, approved, claimed, pending }
}

export function deadlineLeft(iso?: string) {
  if (!iso) return ''
  const d = daysUntil(iso)
  if (d < 0) return 'Deadline passed'
  if (d === 0) return 'Due today'
  return `${plural(d, 'day')} left`
}

// ---------- Points ----------

export const xpTotal = (s: AppState) => s.points.reduce((a, x) => a + x.xp, 0)
export const approvedRevenue = (s: AppState) => s.projects.reduce((a, p) => a + p.brd.approved, 0)

export function pointCap(s: AppState) {
  const rev = approvedRevenue(s)
  return rev > 0 ? { cap: Math.round(rev * XP.capShare), rev, base: false } : { cap: XP.capNoRevenue, rev: 0, base: true }
}

export interface Rank {
  name: string
  xp: number
  rank: number
  tied: boolean
  you: boolean
  campus: string
}

export function ranking(s: AppState, scope: 'campus' | 'all'): Rank[] {
  const list = [...s.others.filter((o) => scope === 'all' || o.campus === s.team.campus).map((o) => ({ ...o, you: false })), { name: s.team.name, xp: xpTotal(s), campus: s.team.campus, you: true }]
  list.sort((a, b) => b.xp - a.xp || (a.you ? -1 : b.you ? 1 : 0))
  return list.map((t) => {
    const rank = list.findIndex((x) => x.xp === t.xp) + 1
    const tied = list.filter((x) => x.xp === t.xp).length > 1
    return { ...t, rank, tied }
  })
}

export function myRank(s: AppState) {
  return ranking(s, 'campus').find((r) => r.you)!
}

// ---------- Triggers ----------

export const openTriggers = (s: AppState) => s.triggers.filter((t) => !t.clearedAt)
export const clearedTriggers = (s: AppState) => s.triggers.filter((t) => t.clearedAt).sort((a, b) => (b.clearedAt ?? '').localeCompare(a.clearedAt ?? ''))

/** If the action behind a trigger has been done, the text to show once it clears. */
export function triggerDone(s: AppState, t: Trigger): string | null {
  const lead = t.leadId ? s.leads.find((l) => l.id === t.leadId) : undefined
  const proj = t.projectId ? s.projects.find((p) => p.id === t.projectId) : undefined
  const after = (iso: string) => iso > t.firedAt
  switch (t.code) {
    case 'T2':
      if (!lead) return null
      if (lead.stage !== 'raw') return `Brochure sent to ${lead.business}`
      if (lead.status !== 'active') return `${lead.business} closed`
      return null
    case 'T3':
    case 'N1':
      if (!lead) return null
      if (lead.status !== 'active') return `${lead.business} ${lead.status === 'won' ? 'won' : 'closed'}`
      if (lead.muted) return `${lead.business} muted`
      if (lead.interactions.some((x) => after(x.at))) return t.code === 'N1' ? `Followed up with ${lead.business}` : `${lead.business} followed up`
      return null
    case 'T5':
      return proj && proj.brd.state !== 'none' ? `BRD submitted for ${proj.client.business}` : null
    case 'T7':
      return proj && proj.brd.state !== 'rejected' ? `BRD resubmitted for ${proj.client.business}` : null
    case 'T6':
      if (!proj?.testimonial) return null
      if (proj.testimonial.status === 'received') return `Testimonial received from ${proj.client.business}`
      if (proj.testimonial.status === 'declined') return `${proj.client.business} declined a testimonial`
      return null
    default:
      return null
  }
}

/** When a trigger's SLA ends: its exact time if known, else 18:00 on the due day. */
export function slaEnd(t: Trigger) {
  return t.dueAt ?? new Date(`${t.due}T18:00:00`).toISOString()
}

/**
 * Who has been told, and when the next person will be. The team leader hears when the SLA
 * ends; then mentor, COS and the program team at +1, +2 and +4 days. P1 climbs twice as fast.
 */
export function ladder(s: AppState, t: Trigger) {
  const leader = s.team.members.find((m) => m.role === 'leader')
  const k = t.pri === 'P1' ? 0.5 : 1
  const end = new Date(slaEnd(t)).getTime()
  const fired = new Date(t.firedAt).getTime()
  const times = [fired, end, end + 1 * k * 86_400_000, end + 2 * k * 86_400_000, end + 4 * k * 86_400_000]
  const who = ['You', `${leader?.name ?? 'Team leader'}, team leader`, `${s.team.mentor}, mentor`, `${s.team.cos}, COS`, 'BRAVE program team']
  const now = t.clearedAt ? new Date(t.clearedAt).getTime() : Date.now()
  const rungs = times.map((ms, i) => ({ who: who[i], at: new Date(ms).toISOString(), reached: ms <= now }))
  const current = rungs.filter((r) => r.reached).length - 1
  return { rungs, current }
}

// ---------- Engine: things the server does over time ----------

const PAY_VERIFY_MS = 6_000
const PAY_MANUAL_MS = 20_000
const BRD_PICK_MS = 5_000
const LIVE_MS = 3_600_000

/** Applies time-based changes to a draft state. Returns toasts to show; empty if nothing changed. */
export function tick(d: AppState): string[] {
  const out: string[] = []
  const now = Date.now()
  const nowIso = new Date().toISOString()
  const online = d.sys.online

  // Offline items sync with their original time once back online
  if (online) {
    let synced = 0
    for (const l of d.leads) {
      if (l.pending) {
        l.pending = false
        synced++
      }
      for (const x of l.interactions) {
        if (x.pending) {
          x.pending = false
          synced++
        }
      }
    }
    for (const p of d.projects) {
      if (p.pendingSync) {
        p.pendingSync = false
        synced++
      }
      for (const x of p.payments) {
        if (x.pendingSync) {
          x.pendingSync = false
          x.submittedAt = nowIso
          synced++
        }
      }
    }
    if (synced) out.push(`Back online · ${plural(synced, 'item')} synced with the original time`)
  }

  if (online) {
    for (const p of d.projects) {
      // Payments: read UTRs verify quickly, typed ones after a manual check
      for (const x of p.payments) {
        if (x.status !== 'pending' || x.mismatch || x.pendingSync) continue
        // Only payments logged in this session move on their own; older ones wait for a person.
        const age = now - new Date(x.submittedAt).getTime()
        if (age < (x.manual ? PAY_MANUAL_MS : PAY_VERIFY_MS) || age > LIVE_MS) continue
        x.status = 'verified'
        x.verifiedAt = nowIso
        out.push(`Payment verified · ${inr(x.amount)}, ${p.client.business}`)
        d.triggers.unshift({ id: uid('tr'), code: 'N11', pri: null, title: 'Payment verified', firedAt: nowIso, due: today(), clearedAt: nowIso, done: `Payment verified · ${inr(x.amount)}, ${p.client.business}` })
        // An approved BRD picks up later verified payments for a quick review of that amount
        if (p.brd.state === 'approved') {
          p.brd.approved = Math.min(p.value, p.brd.approved + x.amount)
          p.brd.history.push({ at: nowIso, text: `${inr(x.amount)} added and approved`, kind: 'check' })
          const xp = Math.round(x.amount * 0.015)
          d.points.unshift({ id: uid('pt'), at: nowIso, xp, title: 'Verified payment', sub: `${p.client.business} · ${inr(x.amount)}` })
        }
      }
      // BRDs: picked up by auto-review a few seconds after submitting
      const brdAge = p.brd.submittedAt ? now - new Date(p.brd.submittedAt).getTime() : 0
      if (p.brd.state === 'submitted' && brdAge > BRD_PICK_MS && brdAge < LIVE_MS) {
        p.brd.state = 'auto'
        p.brd.history.push({ at: nowIso, text: 'Auto-review started', kind: 'check' })
        out.push(`Auto-review started · ${p.client.business}`)
      }
    }
  }

  // Triggers clear themselves when the action is seen
  for (const t of d.triggers) {
    if (t.clearedAt) continue
    const done = triggerDone(d, t)
    if (done) {
      t.clearedAt = nowIso
      t.done = done
      t.late = Math.max(0, -daysUntil(t.due))
      out.push(`Done · ${done}`)
    }
  }

  // Weekly tasks: 200 XP once all five are done; 4 full weeks in a row = a 500 XP streak block
  const w = weekSummary(d)
  if (w.all && d.week.paidWeek !== WEEK_NO && !d.sys.inactive) {
    d.week.paidWeek = WEEK_NO
    d.points.unshift({ id: uid('pt'), at: nowIso, xp: XP.weekAll, title: `Week ${WEEK_NO} tasks`, sub: `All 5 done · ${fmtDate(nowIso)}` })
    d.triggers.unshift({ id: uid('tr'), code: 'N17', pri: null, title: 'Weekly XP', firedAt: nowIso, due: today(), clearedAt: nowIso, done: `+${XP.weekAll} XP for week ${WEEK_NO}` })
    out.push(`All 5 weekly tasks done · +${XP.weekAll} XP`)
    d.week.streak += 1
    if (d.week.streak >= 4 && d.week.blocks < XP.maxBlocks) {
      d.week.blocks += 1
      d.week.streak = 0
      d.points.unshift({ id: uid('pt'), at: nowIso, xp: XP.streakBlock, title: `Streak block ${d.week.blocks}`, sub: `4 full weeks in a row · ${fmtDate(nowIso)}` })
      out.push(`Streak block ${d.week.blocks} earned · +${XP.streakBlock} XP`)
    }
  }
  return out
}
