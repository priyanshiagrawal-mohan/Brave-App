import type { Mode, Source, Stage, TriggerCode } from './types'

export const STAGES: Stage[] = ['raw', 'brochure', 'terms', 'agreement']

export const STAGE_LABEL: Record<Stage, string> = {
  raw: 'Raw lead',
  brochure: 'Brochure sent',
  terms: 'Terms negotiated',
  agreement: 'Agreement sent',
}

export const STAGE_SHORT: Record<Stage, string> = {
  raw: 'Raw',
  brochure: 'Brochure',
  terms: 'Terms',
  agreement: 'Agreement',
}

/** Short hint shown next to a stage option in the log sheet */
export const STAGE_HINT: Record<Stage, string> = {
  raw: 'First contact',
  brochure: 'Brochure shared',
  terms: 'Price and scope agreed',
  agreement: 'Agreement shared',
}

export const STAGE_TAG: Record<Stage, string> = {
  raw: 't-raw',
  brochure: 't-bro',
  terms: 't-ter',
  agreement: 't-agr',
}

export const MODES: Mode[] = ['call', 'whatsapp', 'email', 'visit']

export const MODE_LABEL: Record<Mode, string> = {
  call: 'Call',
  whatsapp: 'WhatsApp',
  email: 'Email',
  visit: 'Visit',
}

export const MODE_ICON: Record<Mode, string> = {
  call: 'phone',
  whatsapp: 'msg',
  email: 'mail',
  visit: 'store',
}

export const SOURCE_LABEL: Record<Source, string> = {
  offline: 'Offline / walk-in',
  online: 'Found online',
  friends: 'Friends, family',
}

export const LOST_REASONS = ['Not interested', 'Too expensive', 'Chose someone else', 'No response']

export const BUSINESS_TYPES = [
  'Food & sweets shop',
  'Restaurant / café',
  'Retail store',
  'Clinic / healthcare',
  'Hotel / hospitality',
  'Education / tuition',
  'Salon / beauty',
  'Automobile',
  'Hardware / electricals',
  'Textiles / apparel',
  'Real estate',
  'Other',
]

/** Sample projects a brochure is built from */
export const SAMPLE_PROJECTS: { level: 'Easy' | 'Medium' | 'Hard'; items: string[] }[] = [
  { level: 'Easy', items: ['Instagram menu posts', 'Google Business profile setup'] },
  { level: 'Medium', items: ['WhatsApp order bot', 'Google reviews booster'] },
  { level: 'Hard', items: ['Booking calling agent', 'Billing & stock app'] },
]

/** Hosts that don't count as a custom domain for the unlock gate. */
export const FREE_HOSTS = [
  'vercel.app',
  'netlify.app',
  'github.io',
  'wixsite.com',
  'wordpress.com',
  'blogspot.com',
  'web.app',
  'firebaseapp.com',
  'pages.dev',
  'onrender.com',
  'herokuapp.com',
  'sites.google.com',
  'carrd.co',
  'framer.website',
  'webflow.io',
]

export const TRIGGER_NAME: Record<TriggerCode, string> = {
  T2: 'Brochure due',
  T3: 'No action on a lead',
  T5: 'BRD not submitted',
  T6: 'Testimonial due',
  T7: 'BRD rejected',
  N1: 'Follow-up nudge',
  N11: 'Payment verified',
  N12: 'BRD decision',
  N17: 'Weekly XP',
}

/** XP rules (server-side in production; mirrored here for the prototype) */
export const XP = {
  weekAll: 200,
  streakBlock: 500,
  maxBlocks: 3,
  /** XP per rupee of verified revenue */
  perRupee: 0.05,
  capNoRevenue: 10_000,
  capShare: 0.2,
  session: 50,
  weekTargets: { leads: 20, logs: 20, projects: 1 },
}

/** Phone numbers saved by other teams on campus (prototype: try one to see the duplicate flow) */
export const OTHER_TEAM_CLIENTS: { phone: string; business: string; date: number }[] = [
  { phone: '9848012345', business: 'Venkateshwara Silks', date: -19 },
  { phone: '9000011111', business: 'Sri Ram Stores', date: -25 },
]
