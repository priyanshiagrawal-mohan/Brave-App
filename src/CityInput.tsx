import { useRef, useState } from 'react'
import { matchCities } from './data/cities'
import { Icon } from './ui'

/** City field with suggestions as you type. Any typed name is kept, listed or not. */
export function CityInput({ value, onChange, locked, bad }: { value: string; onChange: (v: string) => void; locked?: boolean; bad?: boolean }) {
  const [open, setOpen] = useState(false)
  const [act, setAct] = useState(0)
  const blurTimer = useRef(0)
  const list = matchCities(value)
  const exact = list.some(([c]) => c.toLowerCase() === value.trim().toLowerCase())
  const show = open && !locked && list.length > 0 && !exact

  const pick = (c: string) => {
    onChange(c)
    setOpen(false)
  }

  return (
    <div className="combo" style={{ flex: 1, minWidth: 0 }}>
      <div className={`in s13 ${locked ? 'lk' : ''} ${bad ? 'err' : ''}`}>
        <input
          value={value}
          readOnly={locked}
          placeholder="City"
          aria-label="City"
          role="combobox"
          aria-expanded={show}
          aria-autocomplete="list"
          autoComplete="off"
          onFocus={() => {
            window.clearTimeout(blurTimer.current)
            setOpen(true)
          }}
          // Let a tap on a suggestion land before the list closes.
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150)
          }}
          onChange={(e) => {
            onChange(e.target.value)
            setAct(0)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (!show) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setAct((a) => Math.min(list.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setAct((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(list[act][0])
            } else if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        />
        {!locked && <Icon n="down" s="sm" className="fnt" />}
      </div>
      {show && (
        <div className="combo-list" role="listbox">
          {!value.trim() && <div className="s12 fnt" style={{ padding: '6px 10px 2px' }}>Popular cities · type to search</div>}
          {list.map(([c, r], i) => (
            <button
              type="button"
              key={`${c}-${r}`}
              role="option"
              aria-selected={i === act}
              className={i === act ? 'act' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
            >
              <span className="b">{c}</span>
              <span className="sub">{r}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
