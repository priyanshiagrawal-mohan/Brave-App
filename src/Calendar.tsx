import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { addDays, fmtDate, isoDate, today } from './lib/format'
import { Chip, Icon, Overlay, useIsMobile } from './ui'

// In-app calendar. The browser's own date picker can't be opened from script inside an
// embedded page on phones (artifact viewer, iOS), so every date in the app uses this instead.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Tue, 1 Oct 2026" */
export function fmtLong(iso: string) {
  const d = parse(iso)
  return `${WEEK[d.getDay()]}, ${fmtDate(iso)} ${d.getFullYear()}`
}

function CalendarPanel({
  title,
  value,
  min,
  max,
  onPick,
  onClose,
}: {
  title: string
  value?: string
  min?: string
  max?: string
  onPick: (v: string) => void
  onClose: () => void
}) {
  const mobile = useIsMobile()
  const t = today()
  const start = parse(value || (max && max < t ? max : min && min > t ? min : t))
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() })

  // Escape closes only the calendar, not a sheet it was opened from.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', on, true)
    return () => window.removeEventListener('keydown', on, true)
  }, [onClose])

  const first = new Date(view.y, view.m, 1)
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => isoDate(new Date(view.y, view.m, i + 1)))]
  while (cells.length % 7) cells.push(null)

  const monthKey = (y: number, m: number) => y * 12 + m
  const minKey = min ? monthKey(parse(min).getFullYear(), parse(min).getMonth()) : -Infinity
  const maxKey = max ? monthKey(parse(max).getFullYear(), parse(max).getMonth()) : Infinity
  const cur = monthKey(view.y, view.m)
  const shift = (n: number) => setView(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }))
  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max)

  // Handy jumps for the common cases.
  const quick: { label: string; v: string }[] = []
  if (allowed(t)) quick.push({ label: 'Today', v: t })
  if (max && max <= t) {
    if (allowed(addDays(t, -1))) quick.push({ label: 'Yesterday', v: addDays(t, -1) })
  } else {
    if (allowed(addDays(t, 1))) quick.push({ label: 'Tomorrow', v: addDays(t, 1) })
    if (allowed(addDays(t, 7))) quick.push({ label: 'In a week', v: addDays(t, 7) })
  }

  return (
    <Overlay kind={mobile ? 'sheet' : 'dialog'} onClose={onClose} label={title} style={mobile ? { gap: 14 } : { width: 360, gap: 14, padding: 20 }}>
      <div className="row jb">
        <div className="col" style={{ gap: 1 }}>
          <span className="h2">{title}</span>
          <span className="s12 mut">{value ? fmtLong(value) : 'No date picked'}</span>
        </div>
        <button type="button" className="btn gh sm" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose} aria-label="Close calendar">
          <Icon n="x" className="mut" />
        </button>
      </div>

      {quick.length > 0 && (
        <div className="chips">
          {quick.map((q) => (
            <Chip key={q.label} on={value === q.v} onClick={() => onPick(q.v)}>
              {q.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="row jb">
        <button type="button" className="cal-nav" onClick={() => shift(-1)} disabled={cur <= minKey} aria-label="Previous month">
          <Icon n="left" />
        </button>
        <span className="b" style={{ fontSize: 16 }} aria-live="polite">
          {MONTHS[view.m]} {view.y}
        </span>
        <button type="button" className="cal-nav" onClick={() => shift(1)} disabled={cur >= maxKey} aria-label="Next month">
          <Icon n="right" />
        </button>
      </div>

      <div className="cal" role="grid" aria-label={`${MONTHS[view.m]} ${view.y}`}>
        {WEEK.map((w) => (
          <span key={w} className="cal-wd" aria-hidden>
            {w.slice(0, 2)}
          </span>
        ))}
        {cells.map((iso, i) =>
          iso ? (
            <button
              type="button"
              key={iso}
              className={`cal-d ${iso === value ? 'sel' : ''} ${iso === t ? 'now' : ''}`}
              disabled={!allowed(iso)}
              aria-pressed={iso === value}
              aria-label={fmtLong(iso)}
              onClick={() => onPick(iso)}
            >
              {Number(iso.slice(8))}
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>
      {(min || max) && (
        <span className="s12 fnt" style={{ textAlign: 'center' }}>
          {max && max <= t && !min ? "Future dates can't be picked." : min && min >= t && !max ? "Past dates can't be picked." : ''}
        </span>
      )}
    </Overlay>
  )
}

/** Open a calendar from any trigger. */
function useCalendar(opts: { title: string; value?: string; min?: string; max?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const node = open ? (
    <CalendarPanel
      title={opts.title}
      value={opts.value}
      min={opts.min}
      max={opts.max}
      onClose={() => setOpen(false)}
      onPick={(v) => {
        opts.onChange(v)
        setOpen(false)
      }}
    />
  ) : null
  return { open: () => setOpen(true), node }
}

/** Form field that shows the picked date and opens the calendar. */
export function DateField({
  value,
  onChange,
  title,
  placeholder = 'Pick a date',
  min,
  max,
  bad,
  display,
  onClear,
  style,
}: {
  value: string
  onChange: (v: string) => void
  title: string
  placeholder?: string
  min?: string
  max?: string
  bad?: boolean
  display?: (v: string) => string
  onClear?: () => void
  style?: CSSProperties
}) {
  const cal = useCalendar({ title, value: value || undefined, min, max, onChange })
  return (
    <>
      <div className={`in ${bad ? 'err' : ''}`} style={{ padding: 0, ...style }}>
        <button type="button" onClick={cal.open} aria-label={`${title}: ${value ? fmtLong(value) : 'not set'}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minHeight: 42, padding: '0 12px', fontSize: 14 }}>
          <Icon n="cal" s="sm" className="fnt" />
          {value ? <span className="ell">{display ? display(value) : fmtLong(value)}</span> : <span className="pl">{placeholder}</span>}
        </button>
        {value && onClear && (
          <button type="button" className="btn gh sm" style={{ width: 30, height: 30, padding: 0, marginRight: 6 }} onClick={onClear} aria-label={`Clear ${title}`}>
            <Icon n="x" s="sm" />
          </button>
        )}
      </div>
      {cal.node}
    </>
  )
}

/** Chip that opens the calendar; shows the picked date once one is chosen. */
export function DatePick({ value, onChange, label, on, max, min, iconOnly, title }: { value?: string; onChange: (v: string) => void; label: string; on?: boolean; max?: string; min?: string; iconOnly?: boolean; title?: string }) {
  const cal = useCalendar({ title: title ?? 'Pick a date', value, min, max, onChange })
  return (
    <>
      <Chip on={on} onClick={cal.open} style={iconOnly && !on ? { padding: '0 10px' } : undefined}>
        <Icon n="cal" s="sm" />
        {on && value ? fmtDate(value) : iconOnly ? null : label}
      </Chip>
      {cal.node}
    </>
  )
}

/** Today / Yesterday / pick — for when something happened. */
export function PastDateChips({ value, onChange, pickLabel = 'Select date', title = 'When did it happen?' }: { value: string; onChange: (v: string) => void; pickLabel?: string; title?: string }) {
  const t = today()
  const y = addDays(t, -1)
  return (
    <div className="chips">
      <Chip on={value === t} onClick={() => onChange(t)}>
        Today
      </Chip>
      <Chip on={value === y} onClick={() => onChange(y)}>
        Yesterday
      </Chip>
      <DatePick value={value} on={value !== t && value !== y} onChange={onChange} label={pickLabel} max={t} title={title} />
    </div>
  )
}

/** Any element that opens the calendar (e.g. a segmented-control option). */
export function CalendarTrigger({ children, className, style, ...opts }: { children: ReactNode; className?: string; style?: CSSProperties; title: string; value?: string; min?: string; max?: string; onChange: (v: string) => void }) {
  const cal = useCalendar(opts)
  return (
    <>
      <button type="button" className={className} style={style} onClick={cal.open}>
        {children}
      </button>
      {cal.node}
    </>
  )
}
