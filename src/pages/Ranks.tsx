import { useState } from 'react'
import { myRank, pointCap, ranking, xpTotal } from '../data/derive'
import type { FileRef, PointEntry } from '../data/types'
import { fmtDate, inr } from '../lib/format'
import { go } from '../router'
import { Page, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, Bar, GateNote, Icon, ImageList, OverlayHead, Responsive, Seg, Tag, TextArea, useGate, useIsMobile } from '../ui'

const fx = (n: number) => n.toLocaleString('en-IN')
const initials = (n: string) =>
  n
    .replace(/^Team\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

function Board({ scope, mobile }: { scope: 'campus' | 'all'; mobile: boolean }) {
  const { state } = useStore()
  const [all, setAll] = useState(!mobile)
  const list = ranking(state, scope)
  const me = list.findIndex((r) => r.you)
  const ahead = me > 0 ? list[me - 1] : null
  const podium = list.slice(0, 3)
  const rest = list.slice(3)
  const near = rest.slice(Math.max(0, me - 3 - 2), Math.max(0, me - 3) + 3)
  const rows: (typeof list[number] | null)[] = all || me < 3 ? rest : [...rest.slice(0, 2), ...(rest.indexOf(near[0]) > 2 ? [null] : []), ...near.filter((r) => rest.indexOf(r) >= 2)]
  return (
    <>
      <div className="podium">
        {[podium[1], podium[0], podium[2]].map((r, i) =>
          r ? (
            <div key={r.name} className={`pod p${r.rank} ${r.you ? 'me' : ''}`}>
              <span className="pod-medal">{r.rank === 1 ? <Icon n="crown" s="sm" /> : r.rank}</span>
              <span className="pod-av">{initials(r.name)}</span>
              <span className="pod-name ell">{r.name}</span>
              {scope === 'all' && <span className="pod-sub ell">{r.campus}</span>}
              <span className="pod-xp tnum">{fx(r.xp)}</span>
              <span className="pod-step">{['2nd', '1st', '3rd'][i]}</span>
            </div>
          ) : null,
        )}
      </div>
      <div className="lb-list">
        {rows.map((r, i) =>
          r === null ? (
            <div key={`gap${i}`} className="lb-gap">···</div>
          ) : (
            <div key={r.name} className={`lb ${r.you ? 'me' : ''}`} style={scope === 'all' ? { gridTemplateColumns: '38px 1fr auto auto' } : undefined}>
              <span className={`b ${r.you ? '' : 'mut'}`}>
                {r.tied ? '=' : ''}
                {r.rank}
              </span>
              <span className={r.you ? 'b' : ''}>
                {r.name}
                {r.you ? ' (you)' : ''}
              </span>
              {scope === 'all' && <span className="s12 fnt">{r.campus}</span>}
              <span className="b tnum">{fx(r.xp)}</span>
            </div>
          ),
        )}
      </div>
      {!all && (
        <button type="button" className="lnk mut" style={{ alignSelf: 'center' }} onClick={() => setAll(true)}>
          Show all {list.length} teams
        </button>
      )}
      {ahead && (
        <div className="card dark" style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
          <Icon n="trophy" style={{ color: '#EF9F27' }} />
          <span className="s13 f1">
            {ahead.xp === list[me].xp ? (
              <>
                Tied with <b>{ahead.name}</b>
              </>
            ) : (
              <>
                <b>{fx(ahead.xp - list[me].xp)} XP</b> behind {ahead.name}
              </>
            )}
          </span>
          <button type="button" className="btn sm" style={{ background: '#fff' }} onClick={() => go('/home')}>
            This week
          </button>
        </div>
      )}
      {me === 0 && (
        <div className="card dark" style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
          <Icon n="crown" style={{ color: '#EF9F27' }} />
          <span className="s13 f1">
            <b>{state.team.name}</b> leads {scope === 'campus' ? 'the campus' : 'all campuses'}.
          </span>
        </div>
      )}
      <span className="s12 fnt">= tied teams share a rank. XP is worked out on the server from verified events only.</span>
    </>
  )
}

function QuestionSheet({ e, onClose }: { e: PointEntry; onClose: () => void }) {
  const { state, mutate, toast } = useStore()
  const mobile = useIsMobile()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<FileRef[]>([])
  const gate = useGate()
  const send = () =>
    gate.run(text.trim() ? [] : ["What's wrong"], () => {
      mutate((d) => {
        d.points.find((x) => x.id === e.id)!.questioned = { text: text.trim() || 'No details given', at: new Date().toISOString() }
      })
      onClose()
      toast(`Sent to ${state.team.cos} · you'll hear back in your Inbox`)
    })
  return (
    <Responsive mobile={mobile} onClose={onClose} label="Question this entry" width={460}>
      <OverlayHead title="Question this entry" sub="Goes to your campus COS" onClose={onClose} />
      <div className="card" style={{ padding: 12, gap: 2, background: '#F4F1EC' }}>
        <span className={`b ${e.xp < 0 ? 'od' : 'gd'}`}>
          {e.xp > 0 ? '+' : '−'}
          {fx(Math.abs(e.xp))} XP · {e.title}
        </span>
        <span className="s12 mut">
          {e.sub} · {fmtDate(e.at)}
        </span>
      </div>
      <span className="lbl">
        What's wrong? <span className="req">*</span>
      </span>
      <TextArea bad={gate.tried && !text.trim()} boxStyle={{ minHeight: 76 }} className="s13" placeholder="e.g. The client paid again on 14 Oct. UTR 5532 1180 0941." value={text} onChange={(ev) => setText(ev.target.value)} />
      <div className="row">
        <ImageList files={files} onChange={setFiles} max={3} size={52} />
        <span className="s12 mut f1">{files.length ? `${files.length} screenshot${files.length > 1 ? 's' : ''} attached` : 'Attach a screenshot (optional)'}</span>
      </div>
      <Banner tone="gry" icon="info">
        {state.team.cos} (COS) looks first. The program team makes the final call.
      </Banner>
      <GateNote tried={gate.tried} missing={text.trim() ? [] : ["What's wrong"]} />
      <button type="button" className="btn pri" onClick={send}>
        Send to COS
      </button>
    </Responsive>
  )
}

function PointsBody() {
  const { state } = useStore()
  const [q, setQ] = useState<PointEntry | null>(null)
  const xp = xpTotal(state)
  const rank = myRank(state)
  const cap = pointCap(state)
  const left = cap.cap - xp
  return (
    <>
      <div className="card dark" style={{ gap: 4 }}>
        <span className="s12" style={{ color: '#C9C4BB' }}>
          {state.team.name}
        </span>
        <span className="num" style={{ fontSize: 28 }}>
          {fx(xp)} XP
        </span>
        <span className="s12" style={{ color: '#C9C4BB' }}>
          {rank.tied ? '=' : '#'}
          {rank.rank} on campus
        </span>
      </div>
      {cap.base ? (
        <div className="card" style={{ gap: 8, padding: 12, borderColor: '#F0D3A3' }}>
          <div className="row jb s13">
            <span className="b">Point cap</span>
            <span className="b td">{fx(Math.max(0, left))} XP left</span>
          </div>
          <Bar pct={(xp / cap.cap) * 100} color="#111111" />
          <span className="s12 mut" style={{ lineHeight: 1.5 }}>
            Teams without a verified payment cap at 10,000 XP. Your first verified payment raises the cap to 20% of verified revenue.
          </span>
          <button type="button" className="btn drk" onClick={() => go('/projects')}>
            Log a payment
          </button>
        </div>
      ) : (
        <div className="card" style={{ gap: 6, padding: 12 }}>
          <div className="row jb s13">
            <span className="b">Point cap</span>
            <span className="mut">{fx(cap.cap)} XP</span>
          </div>
          <Bar pct={(xp / cap.cap) * 100} />
          <span className="s12 mut">20% of verified revenue ({inr(cap.rev)})</span>
        </div>
      )}
      <span className="grp">This season</span>
      <div className="col" style={{ gap: 0 }}>
        {state.points.map((e) => (
          <div key={e.id} className="row" style={{ gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F0EB' }}>
            <span className="b tnum" style={{ width: 56, color: e.xp < 0 ? '#C0392B' : '#111111' }}>
              {e.xp > 0 ? '+' : '−'}
              {fx(Math.abs(e.xp))}
            </span>
            <div className="col f1" style={{ gap: 1 }}>
              <span className="s13 b">{e.title}</span>
              <span className="s12 mut">
                {e.sub}
                {e.sub.includes(fmtDate(e.at)) ? '' : ` · ${fmtDate(e.at)}`}
              </span>
              {e.questioned && (
                <Tag cls="t-ter" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  Questioned · with COS
                </Tag>
              )}
            </div>
            <button type="button" className="btn gh sm" style={{ width: 32, height: 32, padding: 0 }} onClick={() => setQ(e)} aria-label={`Question: ${e.title}`} disabled={!!e.questioned}>
              <Icon n="more" s="sm" className="fnt" />
            </button>
          </div>
        ))}
      </div>
      <span className="s12 fnt">Tap ⋯ on an entry to question it. A refunded payment takes its XP back.</span>
      {q && <QuestionSheet e={q} onClose={() => setQ(null)} />}
    </>
  )
}

type RankTab = 'campus' | 'all' | 'points'

export function RanksPage({ mobile, tab: initial = 'campus' }: { mobile: boolean; tab?: RankTab }) {
  const { state } = useStore()
  const [tab, setTabState] = useState<RankTab>(initial)
  const setTab = (t: RankTab) => {
    setTabState(t)
    go(t === 'points' ? '/ranks/points' : '/ranks', { replace: true })
  }
  return (
    <Page mobile={mobile} bn="ranks" desk="ranks">
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="eyebrow">
            {state.team.campus} campus · {state.team.name}
          </span>
          <span className="h1">Leaderboard</span>
          <span className="s13 mut">Teams ranked by XP from weekly tasks, streak blocks and verified revenue.</span>
        </div>
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'campus', label: 'Campus' },
            { value: 'all', label: 'All campuses' },
            { value: 'points', label: 'My points' },
          ]}
        />
        {tab === 'points' ? <PointsBody /> : <Board key={tab} scope={tab} mobile={mobile} />}
      </div>
    </Page>
  )
}

export function PointsPage({ mobile }: { mobile: boolean }) {
  return (
    <Page mobile={mobile} desk="ranks" header={<SubBar title="Points" fallback="/ranks" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Points</span>}
        <PointsBody />
      </div>
    </Page>
  )
}
