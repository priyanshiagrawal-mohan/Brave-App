import { useState } from 'react'
import { FREE_HOSTS, SAMPLE_PROJECTS } from '../data/constants'
import { unlockStatus } from '../data/derive'
import type { WebsiteCheck } from '../data/types'
import { fmtDate, fmtDateTime, fmtTime } from '../lib/format'
import { go } from '../router'
import { Page, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, copy, FilePick, GateNote, Icon, Logo, Tag, TextInput, useGate } from '../ui'

// ---------- Brochure ----------

function BrochurePreview({ picks, team }: { picks: string[]; team: string }) {
  const level = (p: string) => SAMPLE_PROJECTS.find((g) => g.items.includes(p))?.level ?? ''
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#F3F0EB', borderRadius: 12, padding: 12 }} aria-label="Brochure preview, 4 pages">
      <div className="bro-pg" style={{ background: '#111111', color: '#fff', minHeight: 150 }}>
        <Logo size={24} />
        <span className="b" style={{ fontSize: 15, lineHeight: 1.2, marginTop: 'auto' }}>
          {team}
        </span>
        <span className="s12" style={{ color: '#C9C4BB' }}>
          Tech for local businesses · Hyderabad
        </span>
      </div>
      {picks.map((p, i) => (
        <div key={p} className="bro-pg" style={{ minHeight: 150 }}>
          <span className="s12 fnt b">
            {String(i + 1).padStart(2, '0')} · {level(p).toUpperCase()}
          </span>
          <span className="b s13" style={{ lineHeight: 1.3 }}>
            {p}
          </span>
          <div className="img" style={{ width: '100%', height: 46 }}>
            sample
          </div>
          <span className="s12 mut" style={{ lineHeight: 1.35 }}>
            Before → after, in numbers.
          </span>
        </div>
      ))}
    </div>
  )
}

export function BrochurePage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const b = state.unlock.brochure
  const [editing, setEditing] = useState(!b)
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const g of SAMPLE_PROJECTS) out[g.level] = b?.picks.find((p) => g.items.includes(p)) ?? ''
    return out
  })
  const [building, setBuilding] = useState(false)
  const gate = useGate()
  const chosen = SAMPLE_PROJECTS.map((g) => picks[g.level]).filter(Boolean)
  const missing = SAMPLE_PROJECTS.filter((g) => !picks[g.level]).map((g) => `An ${g.level === 'Easy' ? 'easy' : g.level === 'Medium' ? 'medium' : 'hard'} project`.replace('An medium', 'A medium').replace('An hard', 'A hard'))
  const wasDone = unlockStatus(state).done

  const finish = (mode: 'built' | 'upload', file?: { id: string; name: string; label?: string }) => {
    mutate((d) => {
      d.unlock.brochure = { by: 'Tanvi', at: new Date().toISOString(), picks: mode === 'built' ? chosen : d.unlock.brochure?.picks ?? [], mode, file }
    })
    setEditing(false)
    gate.reset()
    toast(b ? 'Brochure updated' : `Brochure done · ${Math.min(2, wasDone + 1)} of 2 items to unlock leads`)
  }

  const build = () =>
    gate.run(missing, () => {
      setBuilding(true)
      window.setTimeout(() => {
        setBuilding(false)
        finish('built')
      }, 1400)
    })

  const header = <SubBar title="Brochure" fallback="/home" right={b && !editing ? <Tag cls="t-grn">Done</Tag> : undefined} />

  if (editing) {
    return (
      <Page mobile={mobile} desk="home" header={header}>
        <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
          {!mobile && <span className="h1">Brochure</span>}
          <span className="s13 mut" style={{ lineHeight: 1.5 }}>
            Pick sample projects your team can deliver, one easy, one medium and one hard. We build the brochure from them.
          </span>
          {SAMPLE_PROJECTS.map((g) => (
            <div key={g.level} className="col" style={{ gap: 8 }}>
              <span className="grp" style={gate.tried && !picks[g.level] ? { color: '#C0392B' } : undefined}>
                {g.level}
              </span>
              {g.items.map((it) => (
                <button type="button" key={it} role="radio" aria-checked={picks[g.level] === it} className={`opt ${picks[g.level] === it ? 'on' : ''} ${gate.tried && !picks[g.level] ? 'err' : ''}`} style={{ padding: '10px 12px' }} onClick={() => setPicks((p) => ({ ...p, [g.level]: it }))}>
                  <div className="rad" />
                  <span className="s13 b f1">{it}</span>
                </button>
              ))}
            </div>
          ))}
          <div className={mobile ? 'bbar' : 'col'} style={mobile ? { margin: '4px -16px -16px' } : { gap: 8, marginTop: 6 }}>
            <GateNote tried={gate.tried} missing={missing} />
            <button type="button" className={`btn pri ${chosen.length < 3 ? 'dis' : ''}`} onClick={build} disabled={building}>
              {building ? (
                <>
                  <Icon n="refresh" />
                  Building your brochure…
                </>
              ) : (
                `Build brochure · ${chosen.length} ${chosen.length === 1 ? 'project' : 'projects'}`
              )}
            </button>
            <FilePick className="btn" accept="application/pdf,image/*" onPick={(f) => finish('upload', { ...f[0], label: 'PDF' })}>
              <Icon n="up" />
              Upload our own PDF
            </FilePick>
            {b && (
              <button type="button" className="btn gh" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </Page>
    )
  }

  const name = b!.file?.name ?? `${state.team.name.replace('Team ', '')}_brochure.pdf`
  const done = unlockStatus(state)
  return (
    <Page mobile={mobile} desk="home" header={header}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && (
          <div className="row" style={{ gap: 10 }}>
            <span className="h1">Brochure</span>
            <Tag cls="t-grn">Done</Tag>
          </div>
        )}
        {b!.mode === 'built' ? (
          <BrochurePreview picks={b!.picks} team={state.team.name} />
        ) : (
          <div className="img" style={{ width: '100%', height: 260 }}>
            {name}
          </div>
        )}
        <div className="row">
          <Icon n="file" className="mut" />
          <div className="col f1" style={{ gap: 1 }}>
            <span className="b s13">{name}</span>
            <span className="s12 mut">
              {b!.mode === 'upload' ? 'Uploaded' : 'Built'} by {b!.by} · {fmtDate(b!.at)}
            </span>
          </div>
        </div>
        {b!.picks.length > 0 && b!.mode === 'built' && (
          <div className="row wr" style={{ gap: 5 }}>
            {b!.picks.map((p) => (
              <Tag key={p} cls="t-raw">
                {p}
              </Tag>
            ))}
          </div>
        )}
        <Banner tone="grn" icon="ccheck">
          {done.unlocked ? 'Done. Leads are unlocked for your team.' : `Done. ${done.done} of 2 items needed to unlock leads.`}
        </Banner>
        <div className="row">
          <button type="button" className="btn f1" onClick={() => setEditing(true)}>
            <Icon n="edit" />
            Edit
          </button>
          <button
            type="button"
            className="btn f1"
            onClick={async () => {
              const ok = await copy('https://brave.niat.in/b/kalpa')
              toast(ok ? 'Link copied · share it on WhatsApp' : 'Link: brave.niat.in/b/kalpa', 'info')
            }}
          >
            <Icon n="share" />
            Share link
          </button>
        </div>
        {!done.unlocked && !state.unlock.website && (
          <button type="button" className="card click" style={{ flexDirection: 'row', alignItems: 'center' }} onClick={() => go('/website')}>
            <Icon n="globe" className="mut" />
            <span className="b s13 f1">Next: add your custom website</span>
            <Icon n="right" className="fnt" />
          </button>
        )}
      </div>
    </Page>
  )
}

// ---------- Website ----------

function normalise(raw: string) {
  const t = raw.trim()
  if (!t) return ''
  return /^[a-z]+:\/\//i.test(t) ? t : `https://${t}`
}

async function opens(url: string): Promise<boolean> {
  const ctl = new AbortController()
  const t = window.setTimeout(() => ctl.abort(), 6000)
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal })
    return true
  } catch {
    return false
  } finally {
    window.clearTimeout(t)
  }
}

async function checkSite(raw: string): Promise<WebsiteCheck> {
  const url = normalise(raw)
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    /* invalid */
  }
  const https = url.toLowerCase().startsWith('https://') && !!host
  const own = !!host && host.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !FREE_HOSTS.some((f) => host === f || host.endsWith('.' + f))
  const ok = host ? await opens(url) : false
  return { url, at: new Date().toISOString(), https, opens: ok, own }
}

export function WebsitePage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const site = state.unlock.website
  const [url, setUrl] = useState(site?.url ?? state.unlock.lastCheck?.url ?? '')
  const [checking, setChecking] = useState(false)
  const [fails, setFails] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState(!site)
  const gate = useGate()
  const last = state.unlock.lastCheck && normalise(url) === state.unlock.lastCheck.url ? state.unlock.lastCheck : undefined
  const failed = last && !(last.https && last.opens && last.own)

  const accept = (u: string, forced: boolean) => {
    mutate((d) => {
      d.unlock.website = { url: u, by: 'Tanvi', at: new Date().toISOString() }
    })
    setEditing(false)
    toast(forced ? 'Accepted for this prototype. A real check would keep leads locked until the site opens.' : `${u.replace(/^https?:\/\//, '')} verified`, forced ? 'warn' : 'ok')
  }

  const check = () =>
    gate.run(url.trim() ? [] : ['Website URL'], async () => {
      if (!url.trim()) return
      setChecking(true)
      const r = await checkSite(url)
      setChecking(false)
      mutate((d) => {
        d.unlock.lastCheck = r
      })
      if (r.https && r.opens && r.own) return accept(r.url, false)
      const n = (fails[r.url] ?? 0) + 1
      setFails((f) => ({ ...f, [r.url]: n }))
      // Prototype: a second failed check on the same URL goes ahead anyway.
      if (n >= 2) accept(r.url, true)
    })

  const header = <SubBar title="Custom website" fallback="/home" right={site && !editing ? <Tag cls="t-grn">Done</Tag> : undefined} />
  const u = unlockStatus(state)

  if (site && !editing) {
    const host = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return (
      <Page mobile={mobile} desk="home" header={header}>
        <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
          {!mobile && (
            <div className="row" style={{ gap: 10 }}>
              <span className="h1">Custom website</span>
              <Tag cls="t-grn">Done</Tag>
            </div>
          )}
          <span className="lbl">Website URL</span>
          <div className="in">
            <a href={site.url} target="_blank" rel="noreferrer" className="f1" style={{ color: 'inherit', textDecoration: 'none' }}>
              {site.url}
            </a>
            <Icon n="ccheck" s="sm" className="gd" />
          </div>
          <Banner tone="grn" icon="ccheck">
            {host} opens and is on your own domain.
          </Banner>
          <div className="img" style={{ width: '100%', height: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Icon n="globe" s="lg" />
            <span>{host}</span>
          </div>
          <span className="s12 mut">
            Submitted by {site.by} · checked {fmtDateTime(site.at)}
          </span>
          <div className="row">
            <a className="btn f1" href={site.url} target="_blank" rel="noreferrer">
              <Icon n="link" />
              Open site
            </a>
            <button type="button" className="btn f1" onClick={() => setEditing(true)}>
              <Icon n="edit" />
              Change URL
            </button>
          </div>
          <button type="button" className="card click" style={{ flexDirection: 'row', alignItems: 'center', background: '#111111', color: '#fff', borderColor: '#111111' }} onClick={() => go(u.unlocked ? '/leads' : '/brochure')}>
            <Icon n="check" style={{ color: '#EF9F27' }} />
            <span className="b f1">{u.unlocked ? '2 of 2 done · leads unlocked' : `${u.done} of 2 done · finish the brochure`}</span>
            <Icon n="right" />
          </button>
        </div>
      </Page>
    )
  }

  const rows: [keyof WebsiteCheck, string][] = [
    ['https', 'Starts with https'],
    ['opens', 'Opens without an error'],
    ['own', 'Own domain, not a free subdomain'],
  ]
  const reason = last && (!last.own ? "This is a free subdomain. Leads need your team's own domain." : !last.https ? 'The site must start with https.' : "We couldn't open this site. It may not be live yet, or the domain isn't connected.")
  return (
    <Page mobile={mobile} desk="home" header={header}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Custom website</span>}
        <span className="s13 mut" style={{ lineHeight: 1.5 }}>
          Your team's site on its own domain. A domain costs about ₹600.
        </span>
        <span className="lbl">Website URL</span>
        <TextInput
          bad={!!failed || (gate.tried && !url.trim())}
          placeholder="https://yourteam.in"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            gate.reset()
          }}
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          onKeyDown={(e) => e.key === 'Enter' && check()}
        />
        <GateNote tried={gate.tried} missing={url.trim() ? [] : ['Website URL']} />
        {failed && (
          <Banner tone="red" icon="alert">
            {reason}
          </Banner>
        )}
        {last && (
          <div className="card" style={{ gap: 9 }}>
            <span className="b s13">What we check</span>
            {rows.map(([k, label]) => (
              <div key={k} className="row s13">
                {last[k] ? <Icon n="ccheck" s="sm" className="gd" /> : <Icon n="x" s="sm" style={{ color: '#C0392B' }} />}
                <span className="f1">{label}</span>
              </div>
            ))}
          </div>
        )}
        {!last && (
          <div className="card" style={{ gap: 9 }}>
            <span className="b s13">What we check</span>
            {rows.map(([k, label]) => (
              <div key={k} className="row s13">
                <Icon n="circle" s="sm" className="fnt" />
                <span className="f1">{label}</span>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn pri" onClick={check} disabled={checking}>
          {checking ? (
            <>
              <Icon n="refresh" />
              Checking…
            </>
          ) : last ? (
            'Check again'
          ) : (
            'Check website'
          )}
        </button>
        {last ? (
          <span className="s12 fnt">
            Last checked {fmtTime(last.at)}. {failed ? (fails[last.url] ? 'Check again to continue anyway (prototype).' : 'Leads stay locked until this passes.') : ''}
          </span>
        ) : (
          <span className="s12 fnt">Leads stay locked until this passes.</span>
        )}
        {site && (
          <button type="button" className="btn gh" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
    </Page>
  )
}
