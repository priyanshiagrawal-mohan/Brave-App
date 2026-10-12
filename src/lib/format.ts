// Dates are stored as local ISO dates ("2026-09-29") or ISO datetimes.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return isoDate(new Date())
}

/** Local date `n` days from today. */
export function daysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** Local datetime `n` days from today at hh:mm. */
export function atDay(n: number, hm: string): string {
  const [h, m] = hm.split(':').map(Number)
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

function parse(iso: string): Date {
  // Plain dates are local; datetimes carry their own zone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

/** Whole days from today to `iso` (negative = past). */
export function daysUntil(iso: string): number {
  const a = parse(today()).getTime()
  const b = parse(isoDate(parse(iso))).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** "26 Sep" */
export function fmtDate(iso: string): string {
  const d = parse(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "11:42 am" */
export function fmtTime(iso: string): string {
  const d = parse(iso)
  const h = d.getHours()
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`
}

/** "26 Sep, 6:10 pm" */
export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`
}

/** "1–15 Oct" or "16 Oct–5 Nov" */
export function fmtRange(start?: string, end?: string): string {
  if (!start || !end) return '—'
  const a = parse(start)
  const b = parse(end)
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
  return `${fmtDate(start)}–${fmtDate(end)}`
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Indian digit grouping: ₹1,05,000 */
export function inr(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

/** "₹10k" for tight spots */
export function inrShort(n: number): string {
  return n >= 1000 && n % 1000 === 0 ? `₹${n / 1000}k` : inr(n)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "Wednesday" */
export function weekday(iso: string): string {
  return DAYS[parse(iso).getDay()]
}

/** "Wed 15 Oct" */
export function fmtDow(iso: string): string {
  const d = parse(iso)
  return `${DAYS[d.getDay()].slice(0, 3)} ${fmtDate(iso)}`
}

/** "just now", "4 min ago", "2 h ago", or the date */
export function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 50) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400 && daysUntil(iso) === 0) return `${Math.round(s / 3600)} h ago`
  if (daysUntil(iso) === -1) return 'yesterday'
  return fmtDate(iso)
}

/** "Due tomorrow", "Today", "Due in 3 days", "Overdue by 2 days" */
export function dueText(iso: string, prefix = 'Due'): string {
  const d = daysUntil(iso)
  if (d < 0) return `Overdue by ${plural(-d, 'day')}`
  if (d === 0) return 'Today'
  if (d === 1) return `${prefix} tomorrow`
  return `${prefix} in ${plural(d, 'day')}`
}

export function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const fmtUtr = (u: string) => u.replace(/(\d{4})(?=\d)/g, '$1 ')
