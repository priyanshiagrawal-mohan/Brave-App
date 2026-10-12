import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { FileRef } from './data/types'
import { uid } from './lib/format'

// ---------- Layout ----------

const MQ = '(max-width: 767px)'

export function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia(MQ).matches)
  useEffect(() => {
    const q = window.matchMedia(MQ)
    const on = () => setM(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    document.body.classList.toggle('is-m', m)
  }, [m])
  return m
}

// ---------- Soft gate ----------

/**
 * Prototype rule: a required step that isn't done shows an error on the first tap;
 * tapping again goes ahead anyway, so a walkthrough never gets stuck.
 */
export function useGate() {
  const [tried, setTried] = useState(false)
  return {
    tried,
    /** Runs `go` if nothing is missing, or on the second tap. Returns true if it ran. */
    run(missing: string[], go: () => void) {
      if (missing.length && !tried) {
        setTried(true)
        return false
      }
      go()
      return true
    },
    reset: () => setTried(false),
  }
}

export function GateNote({ tried, missing, style, again = 'Tap again to continue anyway.' }: { tried: boolean; missing: string[]; style?: CSSProperties; again?: string }) {
  if (!tried || !missing.length) return null
  return (
    <div className="gate" role="alert" style={style}>
      <Icon n="alert" s="sm" style={{ marginTop: 1 }} />
      <span>
        <b>Still needed:</b> {missing.join(' · ')}. <span style={{ opacity: 0.8 }}>{again}</span>
      </span>
    </div>
  )
}

// ---------- Atoms ----------

export function Icon({ n, s, className = '', style }: { n: string; s?: 'sm' | 'lg' | 'xl'; className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`ic ${s ?? ''} i-${n} ${className}`} style={style} />
}

export function Tag({ cls, children, style, icon }: { cls: string; children: ReactNode; style?: CSSProperties; icon?: string }) {
  return (
    <span className={`tag ${cls}`} style={style}>
      {icon && <Icon n={icon} s="sm" />}
      {children}
    </span>
  )
}

/**
 * Brand marks (BRAVE Identity, logo system):
 * - no size → the BRAVE wordmark with its 2px Ember Amber underline (headers);
 * - size → the icon version: B with amber chevrons on Night Black.
 */
export function Logo({ size }: { size?: number }) {
  if (!size)
    return (
      <span className="wordmark" aria-label="BRAVE">
        BRAVE
      </span>
    )
  return (
    <div className="logo-ic" style={{ width: size, height: size, fontSize: size * 0.56 }} aria-label="BRAVE">
      <i>‹</i>B<i>›</i>
    </div>
  )
}

export function Bar({ pct, g, h, w, color }: { pct: number; g?: boolean; h?: number; w?: number | string; color?: string }) {
  return (
    <div className={`bar ${g ? 'g' : ''}`} style={{ height: h, width: w }}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  )
}

/** Weekly progress ring (conic gradient), as in the design. */
export function Ring({ pct, size = 64, track = '#3A3733', fill = '#EF9F27', bg = '#111111' }: { pct: number; size?: number; track?: string; fill?: string; bg?: string }) {
  const inner = Math.round(size * 0.78)
  return (
    <div className="ring" style={{ width: size, height: size, background: `conic-gradient(${fill} 0 ${pct}%, ${track} 0)` }} role="img" aria-label={`${pct}% done`}>
      <div style={{ width: inner, height: inner, background: bg }}>{pct}%</div>
    </div>
  )
}

export function Banner({ tone, icon, children, style }: { tone: 'red' | 'amb' | 'grn' | 'gry'; icon: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`ban b-${tone}`} style={style}>
      <Icon n={icon} s="sm" />
      <span className="f1">{children}</span>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`tog ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
}

export function Avatar({ name, blue }: { name: string; blue?: boolean }) {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return <div className={`av ${blue ? 'blue' : ''}`}>{ini}</div>
}

/** Striped placeholder or a real uploaded image. */
export function Thumb({ f, w, h, onRemove, style, onClick }: { f?: FileRef; w: number | string; h: number; onRemove?: () => void; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div className="img" style={{ width: w, height: h, cursor: onClick ? 'pointer' : undefined, ...style }} title={f?.name} onClick={onClick}>
      {f?.src ? <img src={f.src} alt={f.name} /> : <span>{f?.label ?? f?.name ?? ''}</span>}
      {onRemove && (
        <button
          type="button"
          className="rm"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label="Remove"
        >
          <Icon n="x" s="sm" />
        </button>
      )}
    </div>
  )
}

/** Empty / locked / done states: big icon, title, text, actions. */
export function Center({ icon, iconBg = '#F3F0EB', iconFg = '#57534D', title, children, full, style }: { icon?: ReactNode; iconBg?: string; iconFg?: string; title: ReactNode; children?: ReactNode; full?: boolean; style?: CSSProperties }) {
  return (
    <div className={`center ${full ? 'full' : ''}`} style={style}>
      {typeof icon === 'string' ? (
        <div className="icb big" style={{ background: iconBg, color: iconFg }}>
          <Icon n={icon} s="lg" />
        </div>
      ) : (
        icon
      )}
      {typeof title === 'string' ? <span className="h2">{title}</span> : title}
      {children}
    </div>
  )
}

export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="col" style={{ gap: 12 }} aria-busy="true" aria-label="Loading">
      <div className="row" style={{ gap: 8 }}>
        <div className="sk" style={{ flex: 1, height: 70, borderRadius: 12 }} />
        <div className="sk" style={{ flex: 1, height: 70, borderRadius: 12 }} />
        <div className="sk" style={{ flex: 1, height: 70, borderRadius: 12 }} />
      </div>
      <div className="sk" style={{ height: 44, borderRadius: 11 }} />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="card" style={{ gap: 10 }}>
          <div className="row jb">
            <div className="sk" style={{ width: 140, height: 14 }} />
            <div className="sk" style={{ width: 80, height: 14 }} />
          </div>
          <div className="sk" style={{ width: 200, height: 10 }} />
          <div className="sk" style={{ height: 36, borderRadius: 9 }} />
        </div>
      ))}
    </div>
  )
}

// ---------- Overlays ----------

// Page scroll is locked while any overlay is open. A shared count so stacked overlays
// closing in any order always leave the page scrollable.
let locks = 0
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    locks++
    document.body.style.overflow = 'hidden'
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks === 0) document.body.style.overflow = ''
    }
  }, [active])
}

export function Overlay({ kind, onClose, children, label, style }: { kind: 'sheet' | 'dialog' | 'drawer'; onClose: () => void; children: ReactNode; label: string; style?: CSSProperties }) {
  useScrollLock()
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
  const cls = kind === 'sheet' ? 'sheet' : kind === 'dialog' ? 'dlg' : 'drw'
  return (
    <>
      <div className={`scrim ${kind === 'drawer' ? 'below-nav' : ''}`} onClick={onClose} />
      <div className={cls} role="dialog" aria-modal="true" aria-label={label} style={style}>
        {kind === 'sheet' && <div className="grab" />}
        {children}
      </div>
    </>
  )
}

/** Sheet on phone, dialog on desktop. */
export function Responsive({ mobile, onClose, label, children, width }: { mobile: boolean; onClose: () => void; label: string; children: ReactNode; width?: number }) {
  return (
    <Overlay kind={mobile ? 'sheet' : 'dialog'} onClose={onClose} label={label} style={!mobile && width ? { width: `min(${width}px, calc(100vw - 36px))`, gap: 14 } : undefined}>
      {children}
    </Overlay>
  )
}

export function OverlayHead({ title, sub, onClose }: { title: string; sub?: ReactNode; onClose: () => void }) {
  return (
    <div className="row jb" style={{ alignItems: 'flex-start' }}>
      <div className="col" style={{ gap: 1 }}>
        <span className="h2">{title}</span>
        {sub && <span className="s12 mut">{sub}</span>}
      </div>
      <button type="button" className="btn gh sm" style={{ padding: 0, width: 32, height: 32 }} onClick={onClose} aria-label="Close">
        <Icon n="x" className="mut" />
      </button>
    </div>
  )
}

export function Confirm({
  icon,
  iconBg,
  iconFg,
  title,
  body,
  confirm,
  confirmCls,
  confirmIcon,
  cancel = 'Cancel',
  onConfirm,
  onClose,
  children,
  foot,
}: {
  icon?: string
  iconBg?: string
  iconFg?: string
  title: string
  body?: ReactNode
  confirm: string
  confirmCls: string
  confirmIcon?: string
  cancel?: string
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
  foot?: ReactNode
}) {
  return (
    <Overlay kind="dialog" onClose={onClose} label={title} style={{ width: 'min(400px, calc(100vw - 36px))' }}>
      {icon && (
        <div className="icb md" style={{ background: iconBg, color: iconFg }}>
          <Icon n={icon} s="lg" />
        </div>
      )}
      <span className="h2">{title}</span>
      {body && (
        <span className="s13 mut" style={{ lineHeight: 1.5 }}>
          {body}
        </span>
      )}
      {children}
      <button type="button" className={`btn ${confirmCls}`} onClick={onConfirm} autoFocus>
        {confirmIcon && <Icon n={confirmIcon} />}
        {confirm}
      </button>
      <button type="button" className="btn gh" onClick={onClose}>
        {cancel}
      </button>
      {foot}
    </Overlay>
  )
}

export function Popover({ open, onClose, children, style }: { open: boolean; onClose: () => void; children: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const on = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const t = setTimeout(() => document.addEventListener('mousedown', on))
    document.addEventListener('keydown', key)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', on)
      document.removeEventListener('keydown', key)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="menu" ref={ref} style={style} role="menu">
      {children}
    </div>
  )
}

// ---------- Form controls ----------

export function Label({ children, req, hint }: { children: ReactNode; req?: boolean; hint?: string }) {
  return (
    <span className="lbl">
      {children} {req && <span className="req">*</span>}
      {hint && (
        <span className="s12 fnt" style={{ fontWeight: 500 }}>
          {' '}
          {hint}
        </span>
      )}
    </span>
  )
}

export function Field({ label, req, hint, error, children, style }: { label?: ReactNode; req?: boolean; hint?: string; error?: string | false; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="col" style={{ gap: 6, ...style }}>
      {label && (
        <Label req={req} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {error && <span className="err-t">{error}</span>}
    </div>
  )
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { icon?: string; bad?: boolean; locked?: boolean; right?: ReactNode; boxStyle?: CSSProperties; boxClass?: string }

export function TextInput({ icon, bad, locked, right, boxStyle, boxClass = '', className = '', ...rest }: InputProps) {
  return (
    <div className={`in ${bad ? 'err' : ''} ${locked ? 'lk' : ''} ${boxClass}`} style={boxStyle}>
      {icon && <Icon n={icon} s="sm" className="fnt" />}
      <input readOnly={locked} className={className} {...rest} />
      {right}
    </div>
  )
}

export function TextArea({ bad, locked, right, boxStyle, className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { bad?: boolean; locked?: boolean; right?: ReactNode; boxStyle?: CSSProperties }) {
  return (
    <div className={`in ta ${bad ? 'err' : ''} ${locked ? 'lk' : ''} ${className}`} style={boxStyle}>
      <textarea readOnly={locked} rows={2} {...rest} />
      {right}
    </div>
  )
}

export function Select({ value, onChange, options, placeholder, bad, icon, right, boxStyle, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; bad?: boolean; icon?: string; right?: ReactNode; boxStyle?: CSSProperties; label?: string }) {
  return (
    <div className={`in ${bad ? 'err' : ''}`} style={{ position: 'relative', ...boxStyle }}>
      {icon && <Icon n={icon} s="sm" className="fnt" />}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ color: value ? undefined : '#A19C94' }} aria-label={label ?? placeholder}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: '#111111' }}>
            {o.label}
          </option>
        ))}
      </select>
      {right}
      <Icon n="down" s="sm" className="fnt" />
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange, style }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; style?: CSSProperties }) {
  return (
    <div className="seg" role="tablist" style={style}>
      {options.map((o) => (
        <button type="button" key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ on, onClick, children, style }: { on?: boolean; onClick?: () => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick} style={style}>
      {children}
    </button>
  )
}

// ---------- Files ----------

/** Read an image, downscale to keep localStorage small. Non-images keep their name only. */
export async function toRef(file: File): Promise<FileRef> {
  const base = { id: uid('f'), name: file.name }
  if (!file.type.startsWith('image/')) return { ...base, label: file.name.split('.').pop()?.toUpperCase() ?? 'FILE' }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const max = 640
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k)
    c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return { ...base, src: c.toDataURL('image/jpeg', 0.72) }
  } catch {
    return { ...base, label: 'IMG' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function FilePick({
  onPick,
  accept = 'image/*',
  multiple,
  children,
  className = 'btn',
  style,
  label,
}: {
  onPick: (f: FileRef[], raw: File[]) => void
  accept?: string
  multiple?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
  label?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={className} style={style} onClick={() => ref.current?.click()} aria-label={label}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) onPick(await Promise.all(files.map(toRef)), files)
        }}
      />
    </>
  )
}

/** Up to `max` images with thumbnails and an add tile. */
export function ImageList({ files, onChange, max = 5, size = 64, bad, addLabel = 'Add' }: { files: FileRef[]; onChange: (f: FileRef[]) => void; max?: number; size?: number; bad?: boolean; addLabel?: string }) {
  return (
    <div className="row wr">
      {files.map((x, i) => (
        <Thumb key={x.id} f={x} w={size} h={size} onRemove={() => onChange(files.filter((_, j) => j !== i))} />
      ))}
      {files.length < max && (
        <FilePick
          className={`in ${bad ? 'err' : ''}`}
          multiple
          label={addLabel}
          style={{ width: size, height: size, justifyContent: 'center', borderStyle: 'dashed', padding: 0, cursor: 'pointer' }}
          onPick={(xs) => onChange([...files, ...xs].slice(0, max))}
        >
          <Icon n="plus" className="fnt" />
        </FilePick>
      )}
    </div>
  )
}

// ---------- Voice notes ----------

type SR = { start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; lang: string; interimResults: boolean }

/** Dictation. `inline` = a small icon button inside a text field. */
export function MicButton({ onText, h = 44, inline, onListening }: { onText: (t: string) => void; h?: number; inline?: boolean; onListening?: (on: boolean) => void }) {
  const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition
  const [on, setOn] = useState(false)
  const rec = useRef<SR | null>(null)
  const set = (v: boolean) => {
    setOn(v)
    onListening?.(v)
  }
  useEffect(() => () => rec.current?.stop(), [])
  if (!Ctor) {
    return (
      <button type="button" className={inline ? 'mic-in' : 'btn'} style={inline ? undefined : { width: 44, height: h, padding: 0 }} disabled title="Voice notes aren't supported in this browser" aria-label="Dictate (not supported here)">
        <Icon n="mic" s={inline ? 'sm' : undefined} />
      </button>
    )
  }
  return (
    <button
      type="button"
      className={inline ? `mic-in ${on ? 'on' : ''}` : `btn ${on ? 'pri' : ''}`}
      style={inline ? undefined : { width: 44, height: h, padding: 0 }}
      aria-label={on ? 'Stop dictation' : 'Dictate'}
      onClick={() => {
        if (on) {
          rec.current?.stop()
          return
        }
        const r = new Ctor()
        r.lang = 'en-IN'
        r.interimResults = false
        r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '))
        r.onend = () => set(false)
        r.onerror = () => set(false)
        rec.current = r
        try {
          r.start()
          set(true)
        } catch {
          set(false)
        }
      }}
    >
      <Icon n="mic" s={inline ? 'sm' : undefined} />
    </button>
  )
}

export function appendText(prev: string, add: string) {
  return prev.trim() ? `${prev.trim()} ${add}` : add
}

/** Copy text; falls back silently where the clipboard is blocked. */
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
