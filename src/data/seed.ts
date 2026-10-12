import { atDay, daysFromToday, isoDate } from '../lib/format'
import { MODULES, LIBRARY } from './quiz'
import type {
  AppState,
  Brd,
  FileRef,
  Interaction,
  Lead,
  Mode,
  Offering,
  Payment,
  Phase,
  PointEntry,
  Project,
  Receipt,
  Scenario,
  Session,
  Source,
  Stage,
  Trigger,
} from './types'

// Demo data for Team Kalpa (Hyderabad campus). Every date is relative to today, so
// follow-ups, deadlines and "this week" read the same whenever the app is opened.

export const VERSION = 6

let n = 0
const id = (p: string) => `${p}_s${++n}`
const ph = (label: string): FileRef => ({ id: id('f'), name: `${label}.jpg`, label })

/** Days since Monday (0 on Monday). Used to keep "this week" items inside this week. */
const WK = (new Date().getDay() + 6) % 7
/** A day this week, `i` days back from today but never before Monday. */
const tw = (i: number) => -Math.min(i, WK)

type IxSpec = [day: number, hm: string, mode: Mode, by: string, notes: string, from?: Stage, to?: Stage]

function ix([day, hm, mode, by, notes, from, to]: IxSpec): Interaction {
  return { id: id('ix'), at: atDay(day, hm), date: daysFromToday(day), mode, by, notes, stageFrom: from, stageTo: to, location: mode === 'visit' ? 'ok' : undefined }
}

interface LeadSpec {
  business: string
  owner?: string
  phone: string
  type?: string
  source?: Source
  sourceNote?: string
  area: string
  problem: string
  stage: Stage
  follow: number | null
  /** [day, hm, by, mode?] the lead was added */
  added: [number, string, string, Mode?]
  log?: IxSpec[]
  photo?: boolean
}

function lead(s: LeadSpec): Lead {
  const [aDay, aHm, aBy, aMode = 'visit'] = s.added
  const first: Interaction = { ...ix([aDay, aHm, aMode, aBy, s.problem]), leadAdded: true, location: aMode === 'visit' ? 'ok' : undefined }
  const rest = (s.log ?? []).map(ix)
  const all = [...rest, first].sort((a, b) => b.at.localeCompare(a.at))
  return {
    id: id('lead'),
    business: s.business,
    owner: s.owner,
    phone: s.phone,
    type: s.type,
    source: s.source ?? 'offline',
    sourceNote: s.sourceNote,
    city: 'Hyderabad',
    area: s.area,
    location: aMode === 'visit' ? { area: s.area, city: 'Hyderabad', at: first.at } : undefined,
    problem: s.problem,
    photo: s.photo ? ph('shop') : undefined,
    firstContact: first.date,
    stage: s.stage,
    followUp: s.follow == null ? null : daysFromToday(s.follow),
    status: 'active',
    addedAt: first.at,
    addedBy: aBy,
    interactions: all,
  }
}

function activeLeads(): Lead[] {
  return [
    // ---- Overdue ----
    lead({
      business: 'Sharma Sweets', owner: 'R. Sharma', phone: '9811042317', type: 'Food & sweets shop', source: 'friends',
      sourceNote: "Owner is my father's friend from the same colony.", area: 'Ameerpet',
      problem: 'Billing is on paper; no stock tracking by evening.', stage: 'brochure', follow: -3, added: [-9, '17:40', 'Diya'], photo: true,
      log: [
        [-7, '11:02', 'call', 'Aarav', 'Asked about pricing for a billing app. Wants to see a demo.'],
        [-6, '18:10', 'whatsapp', 'Diya', 'Sent brochure PDF. Owner will check with his son.', 'raw', 'brochure'],
      ],
    }),
    lead({
      business: 'Anand Opticals', owner: 'Suresh Anand', phone: '9899012345', type: 'Retail store', area: 'Kukatpally',
      problem: 'Customers forget to come back for eye check-ups; no reminders.', stage: 'raw', follow: -1, added: [tw(2), '12:15', 'Aarav'], photo: true,
    }),
    lead({
      business: 'Krishna Dairy', owner: 'K. Murthy', phone: '9849022334', type: 'Food & sweets shop', area: 'Dilsukhnagar',
      problem: 'Milk subscriptions are tracked in a notebook; payments get missed.', stage: 'terms', follow: -2, added: [-12, '08:30', 'Kiran'],
      log: [
        [-10, '19:20', 'whatsapp', 'Kiran', 'Sent the brochure and a sample subscription tracker.', 'raw', 'brochure'],
        [-5, '10:05', 'call', 'Kiran', 'Agreed ₹18,000 for a subscription tracker. Owner wants 2 phases.', 'brochure', 'terms'],
      ],
    }),
    // ---- Today ----
    lead({
      business: 'Lakshmi Textiles', owner: 'Lakshmi Iyer', phone: '9840011223', type: 'Textiles / apparel', area: 'Abids',
      problem: 'Stock counts are done by hand every week and are often wrong.', stage: 'terms', follow: 0, added: [-10, '16:00', 'Meera'],
      log: [
        [-8, '19:05', 'whatsapp', 'Kiran', 'Sent brochure and two case studies.', 'raw', 'brochure'],
        [-6, '11:00', 'visit', 'Meera', 'Demoed a sample inventory app on the phone.'],
        [tw(1), '15:30', 'call', 'Meera', 'Agreed on scope for the inventory app. Discussing phases.', 'brochure', 'terms'],
      ],
    }),
    lead({
      business: 'Om Sai Hardware', owner: 'Venkat Rao', phone: '9848033445', type: 'Hardware / electricals', source: 'online', area: 'Secunderabad',
      problem: 'Bulk orders come on calls and credit given to contractors is lost track of.', stage: 'brochure', follow: 0, added: [-12, '10:00', 'Aarav', 'email'],
      log: [[-10, '12:30', 'email', 'Aarav', 'Sent brochure and price list.', 'raw', 'brochure']],
    }),
    lead({
      business: 'Royal Bakers', owner: 'Imran Khan', phone: '9866044556', type: 'Food & sweets shop', area: 'Mehdipatnam',
      problem: 'Cake orders come on WhatsApp and get mixed up on busy days.', stage: 'raw', follow: 0, added: [tw(2), '17:10', 'Diya'], photo: true,
      log: [[tw(1), '13:00', 'whatsapp', 'Diya', 'Sent a short video of a cake-order bot.']],
    }),
    lead({
      business: 'Balaji Mobiles', owner: 'Srinivas', phone: '9866055667', type: 'Retail store', area: 'Kukatpally',
      problem: 'No record of repair jobs; customers call again and again for status.', stage: 'raw', follow: 0, added: [tw(1), '11:40', 'Aarav'],
      log: [[tw(0), '10:15', 'call', 'Aarav', 'Asked what a repair tracker would cost.']],
    }),
    lead({
      business: 'Shree Ganesh Jewellers', owner: 'Ganesh Chary', phone: '9849066778', type: 'Retail store', source: 'friends',
      sourceNote: "Diya's uncle runs the shop.", area: 'Begumpet',
      problem: 'Wants customers to book appointments for custom designs.', stage: 'agreement', follow: 0, added: [-15, '18:00', 'Diya'],
      log: [
        [-13, '20:10', 'whatsapp', 'Diya', 'Sent brochure with the booking agent sample.', 'raw', 'brochure'],
        [-9, '12:00', 'call', 'Aarav', 'Agreed ₹40,000 over 3 phases.', 'brochure', 'terms'],
        [tw(2), '17:30', 'visit', 'Diya', 'Shared the agreement draft for ₹40,000.', 'terms', 'agreement'],
        [tw(1), '12:15', 'whatsapp', 'Diya', 'Owner is reading the agreement with his CA.'],
      ],
    }),
    // ---- Upcoming ----
    lead({
      business: 'GreenLeaf Clinic', owner: 'Dr. Farah', phone: '9885077889', type: 'Clinic / healthcare', area: 'Banjara Hills',
      problem: 'Appointment calls go unanswered during consultations.', stage: 'raw', follow: 2, added: [tw(1), '18:20', 'Meera'],
      log: [[tw(0), '12:40', 'call', 'Meera', 'Receptionist asked for a demo on Friday.']],
    }),
    lead({
      business: 'Patel Pharmacy', owner: 'Mukesh Patel', phone: '9885088990', type: 'Retail store', area: 'Ameerpet',
      problem: 'Medicine reorders are done from memory.', stage: 'brochure', follow: 2, added: [-6, '19:00', 'Aarav'],
      log: [[tw(0), '09:30', 'whatsapp', 'Aarav', 'Sent the brochure. Owner liked the reorder alerts.', 'raw', 'brochure']],
    }),
    lead({
      business: 'Sai Ram Tiffins', owner: 'Ramesh', phone: '9705099001', type: 'Restaurant / café', source: 'online', area: 'Kondapur',
      problem: 'Daily tiffin orders come by phone and get mixed up.', stage: 'brochure', follow: 4, added: [tw(1), '08:50', 'Kiran', 'call'],
      log: [[tw(0), '11:10', 'whatsapp', 'Kiran', 'Sent brochure and the order bot demo.', 'raw', 'brochure']],
    }),
    lead({
      business: 'Bright Minds Tuition', owner: 'Anita Reddy', phone: '9705011223', type: 'Education / tuition', area: 'Kukatpally',
      problem: 'Fee reminders are sent by hand to 120 parents every month.', stage: 'raw', follow: 1, added: [tw(2), '16:30', 'Meera'],
      log: [[tw(1), '17:00', 'call', 'Meera', 'Anita asked for a sample reminder message.']],
    }),
    lead({
      business: 'Glow Salon', owner: 'Priya', phone: '9705022334', type: 'Salon / beauty', source: 'online', area: 'Madhapur',
      problem: 'Walk-ins wait too long; there is no booking system.', stage: 'brochure', follow: 3, added: [tw(2), '13:20', 'Diya', 'call'],
      log: [[tw(1), '19:40', 'whatsapp', 'Diya', 'Shared brochure and salon booking sample.', 'raw', 'brochure']],
    }),
    lead({
      business: 'Fit Zone Gym', owner: 'Arjun', phone: '9705033445', type: 'Other', area: 'Gachibowli',
      problem: 'Membership renewals slip; no reminders go out.', stage: 'raw', follow: 1, added: [tw(0), '07:30', 'Aarav'],
      log: [[tw(0), '12:10', 'whatsapp', 'Aarav', 'Sent a thank-you and our website link.']],
    }),
    lead({
      business: 'City Care Diagnostics', owner: 'Dr. Rao', phone: '9705044556', type: 'Clinic / healthcare', area: 'Himayatnagar',
      problem: 'Test reports are sent on WhatsApp one by one.', stage: 'terms', follow: 2, added: [-14, '11:00', 'Meera'],
      log: [
        [-11, '15:00', 'email', 'Meera', 'Emailed the brochure and report-bot flow.', 'raw', 'brochure'],
        [tw(1), '12:20', 'call', 'Meera', 'Agreed ₹22,000 for the report bot.', 'brochure', 'terms'],
        [tw(0), '10:40', 'whatsapp', 'Meera', 'Sent the phase plan for the report bot.'],
      ],
    }),
    lead({
      business: 'Annapurna Mess', owner: 'Lakshmamma', phone: '9705055667', type: 'Restaurant / café', source: 'friends',
      sourceNote: "Kiran's neighbour runs the mess.", area: 'Dilsukhnagar',
      problem: 'Monthly meal cards are on paper and often lost.', stage: 'raw', follow: 6, added: [tw(2), '20:00', 'Kiran'],
      log: [[tw(1), '13:30', 'visit', 'Kiran', 'Showed a digital meal card on the phone.']],
    }),
    lead({
      business: 'Verma Hardware', owner: 'Raj Verma', phone: '9705066778', type: 'Hardware / electricals', area: 'Secunderabad',
      problem: "Doesn't know which items sell the most.", stage: 'brochure', follow: 3, added: [-7, '10:20', 'Aarav'],
      log: [
        [-5, '18:00', 'whatsapp', 'Aarav', 'Sent the brochure.', 'raw', 'brochure'],
        [tw(0), '11:45', 'call', 'Aarav', 'Owner asked for a demo next week.'],
      ],
    }),
    lead({
      business: 'Kapoor Furnishings', owner: 'Neha Kapoor', phone: '9705077889', type: 'Retail store', source: 'online', area: 'Jubilee Hills',
      problem: 'The catalogue is only a printed album at the shop.', stage: 'terms', follow: 5, added: [-22, '12:00', 'Aarav', 'email'],
      log: [
        [-19, '17:30', 'whatsapp', 'Aarav', 'Sent the brochure and catalogue app idea.', 'raw', 'brochure'],
        [-12, '16:00', 'call', 'Aarav', 'Agreed on a ₹28,000 catalogue app.', 'brochure', 'terms'],
      ],
    }),
    lead({
      business: 'Nandini Boutique', owner: 'Nandini', phone: '9705088990', type: 'Textiles / apparel', area: 'Begumpet',
      problem: 'Custom stitching orders are tracked on paper slips.', stage: 'raw', follow: 2, added: [tw(1), '15:00', 'Diya'], photo: true,
      log: [[tw(0), '18:30', 'whatsapp', 'Diya', 'Sent a thank-you with the storefront photo.']],
    }),
    lead({
      business: 'Spice Route Restaurant', owner: 'Faisal', phone: '9705012121', type: 'Restaurant / café', area: 'Tolichowki',
      problem: 'Online orders from 3 apps are entered by hand.', stage: 'agreement', follow: 4, added: [-18, '21:00', 'Diya'],
      log: [
        [-15, '12:00', 'call', 'Diya', 'Sent brochure on WhatsApp after the call.', 'raw', 'brochure'],
        [-10, '16:30', 'visit', 'Aarav', 'Price agreed at ₹35,000.', 'brochure', 'terms'],
        [-4, '13:00', 'whatsapp', 'Diya', 'Agreement sent.', 'terms', 'agreement'],
        [tw(1), '16:00', 'call', 'Aarav', 'Owner will sign after the weekend rush.'],
      ],
    }),
    // ---- No follow-up set ----
    lead({
      business: 'Mehra Auto Parts', owner: 'S. Mehra', phone: '9705013131', type: 'Automobile', area: 'Moosapet',
      problem: 'Spare-part enquiries on WhatsApp are answered late.', stage: 'raw', follow: null, added: [tw(2), '11:30', 'Kiran'],
      log: [[tw(1), '16:10', 'call', 'Kiran', 'Owner busy; call again after Diwali stock arrives.']],
    }),
    lead({
      business: 'Fresh Basket Grocers', owner: 'Vikram', phone: '9705014141', type: 'Retail store', area: 'Kondapur',
      problem: 'Home-delivery orders are taken on calls and written down.', stage: 'brochure', follow: null, added: [-6, '19:30', 'Meera'],
      log: [[tw(2), '18:00', 'whatsapp', 'Meera', 'Sent the brochure.', 'raw', 'brochure']],
    }),
    lead({
      business: 'Sunrise Hostel', owner: 'Mr. Naidu', phone: '9705015151', type: 'Hotel / hospitality', area: 'Ameerpet',
      problem: 'Room rent is collected in cash with no receipts.', stage: 'terms', follow: null, added: [-16, '10:00', 'Kiran'],
      log: [
        [-12, '12:00', 'whatsapp', 'Kiran', 'Sent the brochure.', 'raw', 'brochure'],
        [-7, '18:00', 'visit', 'Kiran', 'Agreed ₹15,000 for a rent tracker.', 'brochure', 'terms'],
        [tw(2), '11:00', 'call', 'Kiran', 'Waiting for the owner to come back from his village.'],
      ],
    }),
    lead({
      business: 'Pooja Florist', owner: 'Pooja', phone: '9705016161', type: 'Retail store', area: 'Somajiguda',
      problem: 'Wedding orders are noted on paper and some get missed.', stage: 'raw', follow: null, added: [tw(1), '10:30', 'Meera'],
      log: [[tw(0), '16:45', 'call', 'Meera', 'Owner asked us to come back on Saturday.']],
    }),
  ]
}

function flagBurst(l: Lead) {
  // Three near-identical logs within two minutes: flagged until the mentor reviews them.
  const day = tw(1)
  for (const hm of ['11:02', '11:03', '11:03']) {
    l.interactions.unshift({ ...ix([day, hm, 'call', 'Kiran', 'Called, will follow up.']), flagged: true })
  }
  l.interactions.sort((a, b) => b.at.localeCompare(a.at))
}

function mutedLeads(): Lead[] {
  const raj = lead({
    business: 'Raj Motors', owner: 'Raj Kumar', phone: '9705017171', type: 'Automobile', area: 'Uppal',
    problem: 'Service bookings come on calls; slots overlap.', stage: 'agreement', follow: 5, added: [-26, '12:00', 'Aarav'],
    log: [
      [-23, '18:00', 'whatsapp', 'Aarav', 'Sent the brochure.', 'raw', 'brochure'],
      [-19, '11:00', 'call', 'Aarav', 'Agreed on ₹25,000 for a booking website.', 'brochure', 'terms'],
      [-13, '17:00', 'visit', 'Aarav', 'Sent agreement draft. Owner travelling for 2 weeks.', 'terms', 'agreement'],
    ],
  })
  const sagar = lead({
    business: 'Hotel Sagar Inn', owner: 'Mr. Reddy', phone: '9705018181', type: 'Hotel / hospitality', area: 'Nampally',
    problem: 'Room bookings are only on calls.', stage: 'brochure', follow: null, added: [-20, '10:00', 'Diya'],
    log: [[-17, '12:00', 'whatsapp', 'Diya', 'Sent the brochure.', 'raw', 'brochure']],
  })
  const desai = lead({
    business: 'Desai Printers', owner: 'A. Desai', phone: '9705019191', type: 'Other', area: 'Chikkadpally',
    problem: 'Print orders and payments are tracked in a register.', stage: 'raw', follow: null, added: [-17, '15:00', 'Kiran'],
  })
  raj.muted = { at: atDay(-2, '10:00'), until: daysFromToday(13) }
  sagar.muted = { at: atDay(-8, '10:00'), until: daysFromToday(7) }
  desai.muted = { at: atDay(-5, '10:00'), until: daysFromToday(10) }
  return [raj, sagar, desai]
}

function lostLeads(): Lead[] {
  const spec: [string, number, string, Stage, string][] = [
    ['Gupta Electricals', -21, 'No response', 'brochure', 'Kukatpally'],
    ['Fresh Fold Laundry', -18, 'Chose someone else', 'terms', 'Madhapur'],
    ['Classic Footwear', -30, 'Not interested', 'raw', 'Abids'],
    ['Tasty Bites', -14, 'Too expensive', 'brochure', 'Ameerpet'],
    ['Metro Opticals', -9, 'Too expensive', 'raw', 'Secunderabad'],
    ['Rainbow Kids School', -26, 'No response', 'raw', 'Miyapur'],
    ['Deccan Motors', -33, 'Chose someone else', 'agreement', 'Uppal'],
    ['Zaika Biryani', -6, 'Not interested', 'raw', 'Tolichowki'],
    ['Lotus Spa', -11, 'Too expensive', 'terms', 'Jubilee Hills'],
    ['Green Valley Nursery', -40, 'No response', 'raw', 'Shamshabad'],
    ['Star Xerox', -3, 'Not interested', 'raw', 'Ameerpet'],
  ]
  const out = spec.map(([business, day, reason, stage, area], i) => {
    const log: IxSpec[] = []
    if (stage !== 'raw') log.push([day - 3, '12:00', 'whatsapp', 'Diya', 'Sent the brochure.', 'raw', 'brochure'])
    if (stage === 'terms' || stage === 'agreement') log.push([day - 2, '16:00', 'call', 'Aarav', 'Discussed price and scope.', 'brochure', 'terms'])
    if (stage === 'agreement') log.push([day - 1, '11:00', 'visit', 'Aarav', 'Shared the agreement.', 'terms', 'agreement'])
    const l = lead({
      business, phone: `97050${String(20000 + i * 1111).slice(0, 5)}`, area, problem: 'Wanted a simple app to track orders.', stage, follow: null,
      added: [day - 5, '11:00', ['Aarav', 'Diya', 'Kiran', 'Meera'][i % 4]], log,
    })
    l.status = 'lost'
    l.statusAt = atDay(day, '18:00')
    l.lostReason = reason
    l.photo = i % 3 === 0 ? ph('shop') : undefined
    return l
  })
  const claimed = lead({
    business: 'Sri Ram Stores', owner: 'Sriram', phone: '9000011111', type: 'Retail store', area: 'Ameerpet',
    problem: 'Wants online orders for regular customers.', stage: 'brochure', follow: null, added: [-12, '16:00', 'Meera'],
    log: [
      [-11, '19:00', 'whatsapp', 'Meera', 'Sent brochure PDF.', 'raw', 'brochure'],
      [-9, '12:00', 'call', 'Meera', 'Owner asked for a price list.'],
    ],
  })
  claimed.status = 'lost'
  claimed.statusAt = atDay(-8, '10:00')
  claimed.claimed = { theirs: daysFromToday(-25) }
  return [...out, claimed]
}

// ---------- Projects ----------

let utrN = 428199301127
function receipt(amount: number, i = 0): Receipt {
  return { id: id('rc'), proof: ph(`UPI ${i + 1}`), amount, utr: String(utrN++), amountRead: true, utrRead: true }
}
function pay(target: string, amount: number, day: number, status: Payment['status'] = 'verified', extra: Partial<Payment> = {}): Payment {
  return {
    id: id('pay'),
    target,
    amount,
    date: daysFromToday(day),
    receipts: [receipt(amount)],
    status,
    submittedAt: atDay(day, '19:00'),
    verifiedAt: status === 'verified' || status === 'refunded' ? atDay(day + 1, '10:00') : undefined,
    ...extra,
  }
}
function phase(name: string, deliverables: string, start: number, end: number, amount: number, due: number, done = false): Phase {
  return { id: id('ph'), name, deliverables, start: daysFromToday(start), end: daysFromToday(end), amount, due: daysFromToday(due), done }
}
const noBrd = (): Brd => ({ state: 'none', approved: 0, history: [] })

function offerings(): Offering[] {
  const o = (name: string, description: string, tech: string[], day: number): Offering => ({ id: id('off'), name, description, tech, createdAt: atDay(day, '12:00') })
  return [
    o('WhatsApp order bot', "Takes orders on WhatsApp and sends them to the shop's screen. Sends the owner a daily sales summary.", ['Node.js', 'WhatsApp Cloud API', 'Firebase'], -70),
    o('Booking calling agent', 'AI voice agent that answers calls and books slots.', ['Vapi', 'Google Calendar'], -65),
    o('Instagram menu posts', "Weekly designed posts from the day's menu.", ['Canva', 'Meta Business Suite'], -60),
    o('Appointment calling agent', 'Answers clinic calls, books and reminds patients.', ['Vapi', 'Google Sheets'], -58),
    o('Booking website', 'A fast website with room or table booking and UPI payments.', ['Next.js', 'Razorpay'], -50),
    o('Billing & stock app', 'Billing on a phone with low-stock alerts.', ['Flutter', 'Firebase'], -35),
    o('Inventory app', 'Stock app that warns the owner when an item runs low.', ['React Native', 'Supabase'], -20),
    o('Google reviews booster', 'Asks happy customers for a Google review on WhatsApp.', ['WhatsApp Cloud API'], -40),
    o('Real estate ERP', 'Leads, site visits and payments for a small builder.', ['Next.js', 'Postgres'], -10),
  ]
}

function wonLead(business: string, owner: string, phone: string, area: string, type: string, problem: string, wonDay: number, by: string): Lead {
  const l = lead({
    business, owner, phone, type, area, problem, stage: 'agreement', follow: null, added: [wonDay - 14, '11:00', by],
    log: [
      [wonDay - 11, '18:00', 'whatsapp', by, 'Sent the brochure.', 'raw', 'brochure'],
      [wonDay - 6, '12:00', 'call', by, 'Price and phases agreed.', 'brochure', 'terms'],
      [wonDay - 3, '17:00', 'visit', by, 'Shared the agreement.', 'terms', 'agreement'],
    ],
  })
  l.status = 'won'
  l.statusAt = atDay(wonDay, '18:30')
  l.interactions.unshift({ ...ix([wonDay, '18:30', 'visit', by, 'Project created from this lead.']), wonMarked: true })
  return l
}

function projectsAndClients(off: Offering[]) {
  const O = (name: string) => off.find((o) => o.name === name)!.id
  const leads: Lead[] = []
  const projects: Project[] = []
  const P = (p: Omit<Project, 'id' | 'createdAt' | 'payments' | 'brd'> & { id?: string; created: number; payments?: Payment[]; brd?: Brd }) => {
    const { created, ...rest } = p
    const proj: Project = { id: id('prj'), createdAt: atDay(created, '19:00'), savedAt: atDay(created, '19:00'), payments: [], brd: noBrd(), ...rest }
    projects.push(proj)
    return proj
  }

  // Café Brew Lane: two projects
  const cafe = wonLead('Café Brew Lane', 'Priya Menon', '9701234567', 'Jubilee Hills', 'Restaurant / café', 'Orders came by phone and got missed at peak hours.', -37, 'Aarav')
  leads.push(cafe)
  const cafeClient = { business: cafe.business, owner: cafe.owner, phone: cafe.phone, area: cafe.area, city: 'Hyderabad', source: 'offline' as Source, location: true }
  const p1 = phase('Phase 1 · Order flow', 'Menu, cart, order confirmation', -36, -22, 12000, -19, true)
  const p2 = phase('Phase 2 · Payments', 'UPI payments, daily summary', -21, 2, 8000, 7)
  const cafeAdv = pay('advance', 10000, -35)
  const cafeP1 = pay(p1.id, 2000, -20)
  P({
    leadId: cafe.id, client: cafeClient, offeringId: O('WhatsApp order bot'), created: -37,
    problem: cafe.problem, solution: 'Order bot confirms each order on WhatsApp and sends it to the counter tablet.',
    proof: [ph('WA 1'), ph('WA 2')], agreement: { id: id('f'), name: 'Agreement.pdf', label: 'PDF' },
    value: 30000, advance: { amount: 10000, due: daysFromToday(-34) }, phases: [p1, p2],
    payments: [
      cafeAdv,
      cafeP1,
      pay(p1.id, 5000, -16, 'rejected', { reason: "Screenshot doesn't show the date." }),
      pay(p1.id, 3000, -9, 'refunded', { reason: 'Extra work refunded to the client' }),
    ],
    brd: {
      state: 'approved', submittedAt: atDay(-22, '19:00'), submittedBy: 'Aarav', claimed: 12000, approved: 12000, approvedAt: atDay(-18, '12:00'),
      history: [
        { at: atDay(-22, '19:00'), text: 'Submitted by Aarav', kind: 'send' },
        { at: atDay(-21, '09:00'), text: 'Auto-review started', kind: 'check' },
        { at: atDay(-18, '12:00'), text: 'Partly approved · ₹12,000', kind: 'check' },
      ],
    },
  })
  P({
    leadId: cafe.id, client: cafeClient, offeringId: O('Instagram menu posts'), created: -30,
    problem: 'No one posts the daily specials.', solution: 'Weekly designed posts from the day’s menu, scheduled every morning.',
    proof: [ph('WA 1')], value: 6000, advance: null, phases: [phase('Month 1 · Posts', '24 designed posts', -29, -12, 6000, -12, true)],
    payments: [], deliveredAt: atDay(-10, '12:00'),
    brd: {
      state: 'submitted', submittedAt: atDay(-6, '20:00'), submittedBy: 'Meera', claimed: 6000, approved: 0, decisionBy: daysFromToday(1),
      history: [{ at: atDay(-6, '20:00'), text: 'Submitted by Meera', kind: 'send' }],
    },
  }).payments.push(pay(projects[1].phases[0].id, 6000, -12))

  // Hotel Ganga View: rejected BRD, cropped advance screenshot
  const ganga = wonLead('Hotel Ganga View', 'Mr. Bhaskar', '9702345678', 'Abids', 'Hotel / hospitality', 'Booking calls at night go unanswered.', -30, 'Kiran')
  leads.push(ganga)
  const gAdv = pay('advance', 5000, -24, 'verified', { flagged: 'cropped' })
  gAdv.receipts[0].proof = ph('cropped')
  P({
    leadId: ganga.id, client: { business: ganga.business, owner: ganga.owner, phone: ganga.phone, area: ganga.area, city: 'Hyderabad', source: 'offline', location: true },
    offeringId: O('Booking calling agent'), created: -30, problem: ganga.problem,
    solution: 'Voice agent answers every call, books rooms in the calendar and sends a WhatsApp confirmation.',
    proof: [ph('WA 1'), ph('WA 2')], value: 25000, advance: { amount: 5000, due: daysFromToday(-25) },
    phases: [phase('Phase 1 · Voice agent', 'Voice agent, calendar sync', -20, 8, 20000, 8)],
    payments: [gAdv],
    brd: {
      state: 'rejected', submittedAt: atDay(-7, '18:00'), submittedBy: 'Kiran', claimed: 5000, approved: 0, rejectedAt: atDay(-2, '09:00'),
      reason: "Advance payment screenshot doesn't show the amount or date. Upload the full UPI receipt.",
      flaggedPaymentId: gAdv.id, flaggedSection: '6. Payments → Advance', deadline: atDay(1, '18:00'),
      history: [
        { at: atDay(-7, '18:00'), text: 'Submitted by Kiran', kind: 'send' },
        { at: atDay(-2, '09:00'), text: 'Rejected, 1 item flagged', kind: 'reject' },
      ],
    },
  })

  // Kumar Bakery: fully paid, auto-review taking longer than usual
  const kumar = wonLead('Kumar Bakery', 'Ravi Kumar', '9703456789', 'Himayatnagar', 'Food & sweets shop', 'Pre-orders for cakes were noted on paper.', -60, 'Meera')
  leads.push(kumar)
  const k1 = phase('Phase 1 · Order flow', 'Menu, cart, order confirmation', -58, -45, 12000, -45, true)
  const k2 = phase('Phase 2 · Payments', 'UPI payments, daily summary', -44, -30, 8000, -30, true)
  P({
    leadId: kumar.id, client: { business: kumar.business, owner: kumar.owner, phone: kumar.phone, area: kumar.area, city: 'Hyderabad', source: 'offline', location: true },
    offeringId: O('WhatsApp order bot'), created: -60, problem: kumar.problem, solution: 'Cake pre-orders on WhatsApp with a daily order sheet for the kitchen.',
    proof: [ph('WA 1'), ph('WA 2')], agreement: { id: id('f'), name: 'Agreement.pdf', label: 'PDF' },
    value: 30000, advance: { amount: 10000, due: daysFromToday(-58) }, phases: [k1, k2],
    payments: [pay('advance', 10000, -58), pay(k1.id, 12000, -45), pay(k2.id, 8000, -30)], deliveredAt: atDay(-28, '12:00'),
    brd: {
      state: 'auto', submittedAt: atDay(-10, '19:20'), submittedBy: 'Meera', claimed: 30000, approved: 0, decisionBy: daysFromToday(-1), delayed: true,
      history: [
        { at: atDay(-10, '19:20'), text: 'Submitted by Meera', kind: 'send' },
        { at: atDay(-8, '09:00'), text: 'Auto-review started', kind: 'check' },
      ],
    },
  })

  // Mehta Dental: approved, testimonial requested; second project is a draft
  const mehta = wonLead('Mehta Dental', 'Dr. Mehta', '9704567890', 'Banjara Hills', 'Clinic / healthcare', 'Patients call during procedures and nobody answers.', -50, 'Aarav')
  leads.push(mehta)
  const mClient = { business: mehta.business, owner: mehta.owner, phone: mehta.phone, area: mehta.area, city: 'Hyderabad', source: 'offline' as Source, location: true }
  const m1 = phase('Phase 1 · Calling agent', 'Answer, book, confirm', -48, -35, 20000, -35, true)
  const m2 = phase('Phase 2 · Reminders', 'Reminders and no-show follow-ups', -34, -22, 10000, -22, true)
  P({
    leadId: mehta.id, client: mClient, offeringId: O('Appointment calling agent'), created: -50, problem: mehta.problem,
    solution: 'Calling agent books appointments and sends reminders a day before.', proof: [ph('WA 1'), ph('WA 2')],
    value: 45000, advance: { amount: 15000, due: daysFromToday(-49) }, phases: [m1, m2],
    payments: [pay('advance', 15000, -49), pay(m1.id, 20000, -35), pay(m2.id, 10000, -22)], deliveredAt: atDay(-21, '12:00'),
    testimonial: { status: 'requested', requestedAt: atDay(-6, '10:00'), remindedAt: atDay(-3, '10:00'), due: daysFromToday(1) },
    brd: {
      state: 'approved', submittedAt: atDay(-20, '19:00'), submittedBy: 'Aarav', claimed: 45000, approved: 45000, approvedAt: atDay(-18, '11:00'),
      history: [
        { at: atDay(-20, '19:00'), text: 'Submitted by Aarav', kind: 'send' },
        { at: atDay(-18, '11:00'), text: 'Approved · ₹45,000', kind: 'check' },
      ],
    },
  })
  P({
    leadId: mehta.id, client: mClient, offeringId: O('Google reviews booster'), created: -8, problem: 'Very few Google reviews compared to nearby clinics.',
    solution: '', proof: [], value: 8000, advance: null, phases: [phase('Phase 1 · Setup', 'Review requests after each visit', 0, 10, 8000, 12)],
  })

  // Hotel Rivera: approved, testimonial received
  const rivera = wonLead('Hotel Rivera', "Ms. D'Souza", '9705678901', 'Begumpet', 'Hotel / hospitality', 'Bookings only through agents with high commission.', -45, 'Diya')
  leads.push(rivera)
  const r1 = phase('Phase 1 · Website', 'Rooms, gallery, booking with UPI', -42, -32, 10000, -32, true)
  P({
    leadId: rivera.id, client: { business: rivera.business, owner: rivera.owner, phone: rivera.phone, area: rivera.area, city: 'Hyderabad', source: 'offline', location: true },
    offeringId: O('Booking website'), created: -45, problem: rivera.problem, solution: 'Direct booking website with UPI payments.', proof: [ph('WA 1')],
    value: 15000, advance: { amount: 5000, due: daysFromToday(-44) }, phases: [r1],
    payments: [pay('advance', 5000, -44), pay(r1.id, 10000, -32)], deliveredAt: atDay(-31, '12:00'),
    testimonial: { status: 'received', requestedAt: atDay(-30, '10:00'), due: daysFromToday(-26), receivedAt: atDay(-27, '17:00'), video: { id: id('f'), name: 'testimonial.mp4', label: 'video' } },
    brd: {
      state: 'approved', submittedAt: atDay(-31, '19:00'), submittedBy: 'Diya', claimed: 15000, approved: 15000, approvedAt: atDay(-29, '11:00'),
      history: [
        { at: atDay(-31, '19:00'), text: 'Submitted by Diya', kind: 'send' },
        { at: atDay(-29, '11:00'), text: 'Approved · ₹15,000', kind: 'check' },
      ],
    },
  })

  // Vinayak Hardware: ready to submit (T5)
  const vin = wonLead('Vinayak Hardware', 'Prakash', '9706789012', 'Secunderabad', 'Hardware / electricals', 'Credit to contractors is tracked in a diary.', -25, 'Aarav')
  leads.push(vin)
  const vin1 = phase('Phase 1 · Billing & stock', 'Billing, credit book, stock alerts', -20, 6, 15000, 10)
  P({
    leadId: vin.id, client: { business: vin.business, owner: vin.owner, phone: vin.phone, area: vin.area, city: 'Hyderabad', source: 'offline', location: true },
    offeringId: O('Billing & stock app'), created: -25, problem: vin.problem, solution: 'Billing on the counter phone with credit tracking and low-stock alerts.',
    proof: [ph('WA 1'), ph('WA 2')], value: 25000, advance: { amount: 10000, due: daysFromToday(-22) },
    phases: [vin1],
    payments: [pay('advance', 10000, -21), pay(vin1.id, 5000, -1, 'pending', { manual: true })],
  })

  // Laxmi Silks: BRD missing data
  const laxmi = wonLead('Laxmi Silks', 'Laxmi Devi', '9707890123', 'Abids', 'Textiles / apparel', 'Saree stock is counted by hand every week.', -12, 'Meera')
  leads.push(laxmi)
  P({
    leadId: laxmi.id, client: { business: laxmi.business, owner: laxmi.owner, phone: laxmi.phone, area: laxmi.area, city: 'Hyderabad', source: 'offline', location: true },
    offeringId: O('Inventory app'), created: -12, problem: laxmi.problem, solution: '', proof: [],
    value: 24000, advance: { amount: 8000, due: daysFromToday(-10) },
    phases: [phase('Phase 1 · Stock app', 'Item list, counts, alerts', -9, 5, 8000, 8), { id: id('ph'), name: 'Phase 2 · Reports', deliverables: 'Weekly sales report', amount: 8000, due: daysFromToday(25) }],
    payments: [pay('advance', 8000, -10)],
  })

  // Desai Dairy: won this week, draft without proof
  const desai = wonLead('Desai Dairy', 'Mahesh Desai', '9708901234', 'Kukatpally', 'Food & sweets shop', 'Milk delivery routes and dues are in a notebook.', tw(2), 'Diya')
  leads.push(desai)
  P({
    leadId: desai.id, client: { business: desai.business, owner: desai.owner, phone: desai.phone, area: desai.area, city: 'Hyderabad', source: 'offline', location: true },
    offeringId: O('WhatsApp order bot'), created: tw(2), problem: desai.problem, solution: 'Daily milk orders on WhatsApp with a route sheet for delivery boys.',
    proof: [], value: 30000, advance: { amount: 10000, due: daysFromToday(3) },
    phases: [phase('Phase 1 · Orders', 'Order bot and route sheet', 1, 15, 12000, 18), phase('Phase 2 · Dues', 'Monthly dues and UPI links', 16, 35, 8000, 38)],
  })

  // Bharat Opticians: won yesterday, no project yet
  const bharat = wonLead('Bharat Opticians', 'Bharat Shah', '9709012345', 'Ameerpet', 'Retail store', 'Frame orders from the lab are tracked on paper.', tw(1), 'Meera')
  bharat.interactions[0].notes = 'Marked Won. Project details to be added.'
  leads.push(bharat)

  return { leads, projects }
}

// ---------- Inbox, points, sessions ----------

function triggers(s: { leads: Lead[]; projects: Project[] }): Trigger[] {
  const L = (b: string) => s.leads.find((l) => l.business === b)?.id
  const P = (b: string, i = 0) => s.projects.filter((p) => p.client.business === b)[i]?.id
  const t = (x: Omit<Trigger, 'id'>): Trigger => ({ id: id('tr'), ...x })
  return [
    (() => {
      // SLA ended 18 h ago: the team leader heard then, the mentor 6 h ago; the COS is next.
      const end = new Date(Date.now() - 18 * 3_600_000)
      return t({ code: 'T7', pri: 'P1', title: 'BRD rejected: Hotel Ganga View', firedAt: new Date(end.getTime() - 3 * 86_400_000).toISOString(), due: isoDate(end), dueAt: end.toISOString(), projectId: P('Hotel Ganga View') })
    })(),
    t({ code: 'T2', pri: 'P2', title: 'Send the brochure to Balaji Mobiles', firedAt: atDay(tw(1), '12:00'), due: daysFromToday(1), leadId: L('Balaji Mobiles') }),
    t({ code: 'N1', pri: null, title: 'Follow up with Lakshmi Textiles', firedAt: atDay(0, '08:00'), due: daysFromToday(0), leadId: L('Lakshmi Textiles') }),
    t({ code: 'T5', pri: 'P2', title: 'Submit the BRD for Vinayak Hardware', firedAt: atDay(-1, '09:00'), due: daysFromToday(2), projectId: P('Vinayak Hardware') }),
    t({ code: 'T3', pri: 'P2', title: 'No action on Kapoor Furnishings for 10 days', firedAt: atDay(-1, '09:00'), due: daysFromToday(7), leadId: L('Kapoor Furnishings') }),
    t({ code: 'T6', pri: 'P3', title: 'Video testimonial from Mehta Dental', firedAt: atDay(-6, '10:00'), due: daysFromToday(14), projectId: P('Mehta Dental') }),
    // Cleared
    t({ code: 'T2', pri: 'P2', title: 'Send the brochure to Patel Pharmacy', firedAt: atDay(-5, '09:00'), due: daysFromToday(tw(0) + 1), leadId: L('Patel Pharmacy'), clearedAt: atDay(tw(0), '09:30'), done: 'Brochure sent to Patel Pharmacy' }),
    t({ code: 'T3', pri: 'P2', title: 'No action on Spice Route Restaurant for 10 days', firedAt: atDay(-6, '09:00'), due: daysFromToday(-1), leadId: L('Spice Route Restaurant'), clearedAt: atDay(-4, '13:00'), done: 'Spice Route Restaurant moved to Agreement sent' }),
    t({ code: 'T5', pri: 'P2', title: 'Submit the BRD for Kumar Bakery', firedAt: atDay(-14, '09:00'), due: daysFromToday(-11), clearedAt: atDay(-10, '19:20'), done: 'BRD submitted for Kumar Bakery', late: 1 }),
    t({ code: 'N11', pri: null, title: 'Payment verified', firedAt: atDay(-20, '10:00'), due: daysFromToday(-20), clearedAt: atDay(-20, '10:00'), done: 'Payment verified · ₹10,000, Vinayak Hardware' }),
    t({ code: 'N12', pri: null, title: 'BRD decision', firedAt: atDay(-18, '12:00'), due: daysFromToday(-18), clearedAt: atDay(-18, '12:00'), done: 'BRD partly approved · ₹12,000, Café Brew Lane' }),
    t({ code: 'N17', pri: null, title: 'Weekly XP', firedAt: atDay(-WK - 1, '23:59'), due: daysFromToday(-WK - 1), clearedAt: atDay(-WK - 1, '23:59'), done: '+200 XP for week 3' }),
  ]
}

function points(): PointEntry[] {
  const e = (day: number, xp: number, title: string, sub: string): PointEntry => ({ id: id('pt'), at: atDay(day, '20:00'), xp, title, sub })
  const sun = (w: number) => -WK - 1 - (3 - w) * 7 // Sunday that closed week w (weeks 1–3)
  return [
    e(-1, 30, 'Reach · session recording', 'Pricing for local shops · 1,240 views'),
    e(-5, 150, 'Peer session hosted', 'Pricing for local shops · 3 confirmed'),
    e(-6, -45, 'Payment refunded', 'Café Brew Lane · extra work'),
    e(sun(3), 200, 'Week 3 tasks', `All 5 done · ${label(sun(3))}`),
    e(-12, 25, 'Attended a peer session', "Aarav's session · Writing a brochure that sells"),
    e(-18, 675, 'BRD approved', 'Mehta Dental · ₹45,000 verified'),
    e(-18, 180, 'BRD partly approved', 'Café Brew Lane · ₹12,000 verified'),
    e(sun(2), 200, 'Week 2 tasks', `All 5 done · ${label(sun(2))}`),
    e(-29, 225, 'BRD approved', 'Hotel Rivera · ₹15,000 verified'),
    e(sun(1), 200, 'Week 1 tasks', `All 5 done · ${label(sun(1))}`),
    e(-30, 100, 'Quiz passed', 'Module 3 · Pricing your first offer'),
    e(-36, 100, 'Quiz passed', 'Module 2 · Writing a brochure that sells'),
    e(-40, 100, 'Quiz passed', 'Module 1 · Finding your first client'),
    e(-44, 200, 'Leads unlocked', 'Website and brochure done'),
  ]
}

function label(day: number) {
  const d = new Date()
  d.setDate(d.getDate() + day)
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`
}

function sessions(): Session[] {
  return [
    { id: id('ss'), title: 'How we got our first advance', host: 'Diya Rao', at: atDay(1, '18:00'), joining: 8, attendees: 0, confirmed: 0, about: 'What we said, what the owner asked, and how we asked for 30% up front.' },
    { id: id('ss'), title: 'Cold-calling scripts that work', host: 'Meera Iyer', at: atDay(-1, '18:00'), joining: 6, attendees: 5, confirmed: 2, mine: 'pending' },
    { id: id('ss'), title: 'Pricing for local shops', host: 'Tanvi Kumar', at: atDay(-5, '18:00'), joining: 9, attendees: 7, confirmed: 3 },
    { id: id('ss'), title: 'Writing a brochure that sells', host: 'Aarav Shah', at: atDay(-12, '18:00'), joining: 8, attendees: 6, confirmed: 6, mine: 'yes' },
  ]
}

const OTHERS: [string, number, string][] = [
  ['Team Nova', 6420, 'Hyderabad'], ['Bytecraft', 5980, 'Hyderabad'], ['Udaan', 5110, 'Hyderabad'], ['Rangoli', 4880, 'Hyderabad'],
  ['Spark Studio', 4460, 'Hyderabad'], ['Codex', 4120, 'Hyderabad'], ['Vyom', 3760, 'Hyderabad'], ['Lumen', 3300, 'Hyderabad'],
  ['Arjuna', 2940, 'Hyderabad'], ['Tarang', 2600, 'Hyderabad'], ['Team Arka', 2410, 'Hyderabad'], ['Pixel Pals', 2410, 'Hyderabad'],
  ['Kaizen', 2380, 'Hyderabad'], ['Bytecraft Jr', 2290, 'Hyderabad'], ['Sankalp', 2170, 'Hyderabad'], ['Prism', 1980, 'Hyderabad'],
  ['Orbit', 1720, 'Hyderabad'], ['Nexa', 1500, 'Hyderabad'], ['Kriti', 1210, 'Hyderabad'],
  ['Team Aakash', 9120, 'Bengaluru'], ['Dhruva', 8540, 'Pune'], ['Neev', 7980, 'Chennai'], ['Shakti', 7310, 'Bengaluru'],
  ['Unnati', 6890, 'Delhi'], ['Prerna', 6050, 'Pune'], ['Agni', 5720, 'Chennai'], ['Saarthi', 5400, 'Delhi'],
]

// ---------- Assemble ----------

function base(): AppState {
  const off = offerings()
  const { leads: clients, projects } = projectsAndClients(off)
  const act = activeLeads()
  flagBurst(act.find((l) => l.business === 'Om Sai Hardware')!)
  const leads = [...act, ...mutedLeads(), ...lostLeads(), ...clients]
  return {
    version: VERSION,
    scenario: 'mid',
    me: 'Tanvi',
    team: {
      name: 'Team Kalpa',
      campus: 'Hyderabad',
      members: [
        { id: 'm1', name: 'Aarav Shah', role: 'leader' },
        { id: 'm2', name: 'Diya Rao', role: 'member' },
        { id: 'm3', name: 'Kiran Patel', role: 'member' },
        { id: 'm4', name: 'Meera Iyer', role: 'member' },
        { id: 'm5', name: 'Tanvi Kumar', role: 'member', you: true },
      ],
      invites: [],
      mentor: 'Kavya Nair',
      cos: 'Rohit Menon',
    },
    unlock: {
      brochure: { by: 'Diya', at: atDay(-48, '18:00'), picks: ['Instagram menu posts', 'WhatsApp order bot', 'Booking calling agent'], mode: 'built' },
      website: { url: 'https://kalpa.in', by: 'Aarav', at: atDay(-44, '16:10') },
      cutoff: daysFromToday(-30),
      seenUnlocked: true,
    },
    modules: MODULES(),
    library: LIBRARY(),
    leads,
    projects,
    offerings: off,
    triggers: triggers({ leads, projects }),
    points: points(),
    sessions: sessions(),
    content: [
      { id: id('ct'), kind: 'recording', title: 'Pricing for local shops', url: 'https://youtu.be/kalpa-pricing', submittedAt: atDay(-4, '12:00'), status: 'live', views: 1240 },
      { id: id('ct'), kind: 'reel', title: 'How we pitched a sweet shop', url: 'https://instagram.com/reel/kalpa1', submittedAt: atDay(-6, '20:00'), status: 'pending' },
      { id: id('ct'), kind: 'post', title: 'Our first approved BRD', url: 'https://instagram.com/p/kalpa2', submittedAt: atDay(-3, '20:00'), status: 'private' },
    ],
    parent: { on: true, name: 'Sunita Kumar', phone: '9849011223', consentAt: atDay(-40, '10:00') },
    others: OTHERS.map(([name, xp, campus]) => ({ name, xp, campus })),
    week: { logins: 2, streak: 3, blocks: 0 },
    sys: { signedIn: false, online: true, locationDenied: false, weakNetwork: false, failNextLoad: false, grace: false, removed: false, inactive: false },
  }
}

/** A team that has just formed: leads locked until the website is added. */
function fresh(s: AppState, cutoffDay: number): AppState {
  s.leads = []
  s.projects = []
  s.triggers = []
  s.offerings = s.offerings.slice(0, 3)
  s.points = [
    { id: id('pt'), at: atDay(-10, '20:00'), xp: 100, title: 'Quiz passed', sub: 'Module 3 · Pricing your first offer' },
    { id: id('pt'), at: atDay(-16, '20:00'), xp: 100, title: 'Quiz passed', sub: 'Module 2 · Writing a brochure that sells' },
    { id: id('pt'), at: atDay(-20, '20:00'), xp: 100, title: 'Quiz passed', sub: 'Module 1 · Finding your first client' },
  ]
  s.sessions = s.sessions.filter((x) => x.mine === 'yes')
  s.content = []
  s.week = { logins: 1, streak: 0, blocks: 0 }
  s.unlock = {
    brochure: { by: 'Diya', at: atDay(-5, '18:00'), picks: ['Instagram menu posts', 'WhatsApp order bot', 'Booking calling agent'], mode: 'built' },
    website: null,
    cutoff: daysFromToday(cutoffDay),
    seenUnlocked: false,
  }
  return s
}

export function seedState(scenario: Scenario = 'mid'): AppState {
  n = 0
  utrN = 428199301127
  const s = base()
  s.scenario = scenario
  if (scenario === 'new') fresh(s, 11)
  if (scenario === 'cutoff') {
    fresh(s, -1)
    s.unlock.autoLocked = true
    s.unlock.exception = { by: 'Rohit Menon, COS', at: atDay(0, '10:00'), note: 'Website was delayed by domain payment.', decision: 'pending' }
  }
  if (scenario === 'solo') {
    s.team.members = [{ id: 'm5', name: 'Tanvi Kumar', role: 'leader', you: true }]
    s.team.invites = [{ id: id('inv'), name: 'Rahul Sinha', at: atDay(-1, '12:00') }]
  }
  return s
}

