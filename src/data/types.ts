export type Stage = 'raw' | 'brochure' | 'terms' | 'agreement'
export type Mode = 'call' | 'whatsapp' | 'email' | 'visit'
export type Source = 'offline' | 'online' | 'friends'

/** An uploaded image or file. `src` is a data URL; placeholders only have a label. */
export interface FileRef {
  id: string
  name: string
  label?: string
  src?: string
}

export interface Interaction {
  id: string
  at: string // ISO datetime, system timestamped
  date: string // the day it happened (may be backdated)
  mode: Mode
  notes: string
  by: string
  stageFrom?: Stage
  stageTo?: Stage
  leadAdded?: boolean
  wonMarked?: boolean
  /** 'none' = saved without a location (permission denied); counts after a review. */
  location?: 'ok' | 'none'
  place?: string
  /** Burst of near-identical logs: no credit until the mentor reviews them. */
  flagged?: boolean
  /** Saved on the phone while offline; syncs later with this original time. */
  pending?: boolean
}

export interface GeoStamp {
  area: string
  city: string
  at: string
  lat?: number
  lng?: number
}

export interface Lead {
  id: string
  business: string
  owner?: string
  phone: string
  type?: string
  source: Source
  sourceNote?: string
  city?: string
  area?: string
  location?: GeoStamp
  problem: string
  notes?: string
  photo?: FileRef
  /** Proof of the first contact (needed for backdated and friends & family leads). */
  proof?: FileRef[]
  firstContact: string
  stage: Stage
  followUp: string | null
  status: 'active' | 'won' | 'lost'
  statusAt?: string
  lostReason?: string
  muted?: { at: string; until: string }
  /** Another team proved earlier contact; archived and can't be recovered. */
  claimed?: { theirs: string }
  addedAt: string
  addedBy: string
  interactions: Interaction[]
  pending?: boolean
}

/** One UPI screenshot. Amount and UTR are read from the image; the student fills what wasn't detected. */
export interface Receipt {
  id: string
  proof: FileRef
  amount: number
  utr: string
  amountRead: boolean
  utrRead: boolean
}

export type PayStatus = 'pending' | 'verified' | 'rejected' | 'refunded'

/** A payment logged against the advance or a milestone. Several can add up to one milestone. */
export interface Payment {
  id: string
  /** 'advance' or a phase id */
  target: string
  amount: number
  date: string
  receipts: Receipt[]
  status: PayStatus
  /** Typed (not read) UTRs get a manual check. */
  manual?: boolean
  reason?: string
  submittedAt: string
  verifiedAt?: string
  /** Logged while the amount didn't match the plan; can't be verified until fixed. */
  mismatch?: boolean
  /** Set when a reviewer flagged this payment's proof in a rejected BRD. */
  flagged?: 'cropped' | 'replaced'
  replacedFrom?: FileRef
  pendingSync?: boolean
}

/** A milestone in the payment plan. */
export interface Phase {
  id: string
  name: string
  deliverables?: string
  start?: string
  end?: string
  amount: number
  due: string
  done?: boolean
}

export type BrdState = 'none' | 'submitted' | 'auto' | 'approved' | 'rejected'

export interface BrdEvent {
  at: string
  text: string
  kind: 'send' | 'check' | 'reject' | 'edit' | 'clock'
}

export interface Brd {
  state: BrdState
  submittedAt?: string
  submittedBy?: string
  decisionBy?: string
  claimed?: number
  approved: number
  approvedAt?: string
  rejectedAt?: string
  reason?: string
  flaggedPaymentId?: string
  flaggedSection?: string
  deadline?: string // ISO datetime
  note?: string
  /** Auto-review is taking longer than usual; admin alerted. */
  delayed?: boolean
  history: BrdEvent[]
}

export interface Client {
  business: string
  owner?: string
  phone?: string
  area?: string
  city?: string
  source?: Source
  location?: boolean
}

export interface Testimonial {
  status: 'requested' | 'received' | 'declined'
  requestedAt: string
  remindedAt?: string
  due: string
  receivedAt?: string
  video?: FileRef
  declinedAt?: string
}

export interface Project {
  id: string
  leadId?: string
  client: Client
  offeringId: string | null
  problem: string
  solution: string
  /** Where the client and reviewer can see the work */
  links?: { live?: string; demo?: string; files?: string }
  proof: FileRef[]
  agreement?: FileRef
  /** Project value. The plan (advance + milestones) must add up to it. */
  value: number
  advance: { amount: number; due: string } | null
  phases: Phase[]
  payments: Payment[]
  createdAt: string
  savedAt?: string
  deliveredAt?: string
  testimonial?: Testimonial
  brd: Brd
  pendingSync?: boolean
}

export interface Offering {
  id: string
  name: string
  description: string
  tech: string[]
  createdAt: string
}

export interface Member {
  id: string
  name: string
  role: 'leader' | 'member'
  you?: boolean
}

export interface Team {
  name: string
  campus: string
  members: Member[]
  invites: { id: string; name: string; at: string }[]
  mentor: string
  cos: string
}

export interface Brochure {
  by: string
  at: string
  picks: string[]
  file?: FileRef
  mode: 'built' | 'upload'
}

export interface WebsiteCheck {
  url: string
  at: string
  https: boolean
  opens: boolean
  own: boolean
}

export interface UnlockState {
  brochure: Brochure | null
  website: { url: string; by: string; at: string } | null
  lastCheck?: WebsiteCheck
  cutoff: string
  seenUnlocked: boolean
  /** Missed the cutoff: leads locked until an exception is approved. */
  autoLocked?: boolean
  exception?: { by: string; at: string; note: string; decision: 'pending' | 'approved' }
}

export interface Module {
  n: number
  title: string
  minutes: number
  parts: { title: string; min: number }[]
  status: 'passed' | 'open' | 'locked'
  score?: number
  opensOn?: string
  openedAt?: string
  partsDone: number
  /** Questions answered wrong on the last passed attempt */
  missed?: string[]
  saved?: boolean
}

export interface LibraryItem {
  id: string
  kind: 'video' | 'podcast' | 'event'
  title: string
  meta: string
  saved?: boolean
}

export type TriggerCode = 'T2' | 'T3' | 'T5' | 'T6' | 'T7' | 'N1' | 'N11' | 'N12' | 'N17'

export interface Trigger {
  id: string
  code: TriggerCode
  pri: 'P1' | 'P2' | 'P3' | null
  title: string
  firedAt: string
  /** Day the item should be cleared by (SLA end) */
  due: string
  /** Exact SLA end, when known (else 18:00 on `due`) */
  dueAt?: string
  leadId?: string
  projectId?: string
  clearedAt?: string
  /** Cleared text, e.g. "Brochure sent to GreenLeaf Clinic" */
  done?: string
  late?: number
}

export interface PointEntry {
  id: string
  at: string
  xp: number
  title: string
  sub: string
  questioned?: { text: string; at: string }
}

export interface Session {
  id: string
  title: string
  host: string
  at: string // ISO datetime
  joining: number
  attendees: number
  confirmed: number
  /** For sessions hosted by others: did I confirm? */
  mine?: 'pending' | 'yes' | 'no'
  about?: string
}

export interface ContentItem {
  id: string
  kind: 'recording' | 'reel' | 'post'
  title: string
  url: string
  submittedAt: string
  status: 'live' | 'pending' | 'private' | 'review'
  views?: number
}

export interface ParentUpdates {
  on: boolean
  name: string
  phone: string
  consentAt?: string
  stoppedAt?: string
}

export interface OtherTeam {
  name: string
  xp: number
  campus: string
}

export interface Week {
  /** Logins counted this week (start and end) */
  logins: number
  /** Full weeks in a row before this one */
  streak: number
  /** Streak blocks earned this season (max 3) */
  blocks: number
  /** Week number that already paid its 200 XP */
  paidWeek?: number
  themed?: boolean
  /** Prototype: count this week's tasks as done */
  forceDone?: boolean
}

export interface Sys {
  signedIn: boolean
  online: boolean
  locationDenied: boolean
  weakNetwork: boolean
  failNextLoad: boolean
  grace: boolean
  removed: boolean
  inactive: boolean
  /** Prototype only: show approve/reject buttons on BRDs to stand in for the reviewer */
  reviewSim?: boolean
}

export type Scenario = 'mid' | 'new' | 'cutoff' | 'solo'

export interface AppState {
  version: number
  scenario: Scenario
  me: string
  team: Team
  unlock: UnlockState
  modules: Module[]
  library: LibraryItem[]
  leads: Lead[]
  projects: Project[]
  offerings: Offering[]
  triggers: Trigger[]
  points: PointEntry[]
  sessions: Session[]
  content: ContentItem[]
  parent: ParentUpdates
  others: OtherTeam[]
  week: Week
  sys: Sys
  /** Last log mode used, preset next time */
  lastMode?: Mode
}
