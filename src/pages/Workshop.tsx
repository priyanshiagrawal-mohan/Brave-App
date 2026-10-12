import { useEffect, useRef, useState } from 'react'
import { workshopProgress } from '../data/derive'
import { PASS_MARK, QUIZ } from '../data/quiz'
import type { LibraryItem, Module } from '../data/types'
import { daysUntil, fmtDate, plural, uid } from '../lib/format'
import { go } from '../router'
import { Page, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, Bar, Center, Chip, GateNote, Icon, Seg, Tag, useGate } from '../ui'

function slowNet() {
  const c = (navigator as unknown as { connection?: { effectiveType?: string } }).connection
  return !!c?.effectiveType && ['slow-2g', '2g', '3g'].includes(c.effectiveType)
}

// ---------- Modules ----------

export function WorkshopPage({ mobile }: { mobile: boolean }) {
  const { state, toast } = useStore()
  const wp = workshopProgress(state)
  return (
    <Page mobile={mobile} desk="home" header={<SubBar title="Workshop" fallback="/home" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Workshop</span>}
        <div className="row jb s13">
          <span className="b">
            {wp.passed} of {wp.total} modules done
          </span>
          <span className="mut">Pass mark {PASS_MARK} of 10</span>
        </div>
        <Bar pct={wp.pct} />
        {state.modules.map((m) => {
          const current = m.status === 'open'
          const opened = m.openedAt ? -daysUntil(m.openedAt) : 0
          return (
            <button
              key={m.n}
              type="button"
              className="card click"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, ...(current ? { borderColor: '#111111', boxShadow: 'inset 0 0 0 1px #111111' } : {}) }}
              onClick={() => (m.status === 'locked' ? toast(`Module ${m.n} opens ${fmtDate(m.opensOn!)}`, 'info') : go(`/workshop/${m.n}`))}
            >
              <div className="icb" style={{ width: 34, height: 34, fontWeight: 800, fontSize: 13 }}>
                {m.n}
              </div>
              <div className="col f1" style={{ gap: 2 }}>
                <span className="b s13">{m.title}</span>
                <span className="s12">
                  {m.status === 'passed' ? (
                    <span className="gd">Quiz passed · {m.score}/10</span>
                  ) : m.status === 'open' ? (
                    <span className="td">{m.partsDone ? `${m.partsDone} of ${m.parts.length} parts watched` : 'Waiting for you'}{opened > 0 ? ` · opened ${plural(opened, 'day')} ago` : ''}</span>
                  ) : (
                    <span className="mut">Opens {fmtDate(m.opensOn!)}</span>
                  )}
                </span>
              </div>
              {m.status === 'passed' ? <Icon n="ccheck" className="gd" /> : m.status === 'open' ? <span className="btn sm drk">{m.partsDone ? 'Resume' : 'Start'}</span> : <Icon n="lock" s="sm" className="fnt" />}
            </button>
          )
        })}
        <button type="button" className="card click" style={{ flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 4 }} onClick={() => go('/library')}>
          <Icon n="layers" className="mut" />
          <div className="col f1" style={{ gap: 1 }}>
            <span className="b s13">Course library</span>
            <span className="s12 mut">Solution videos, podcast, SME events</span>
          </div>
          <Icon n="right" className="fnt" />
        </button>
        <Banner tone="gry" icon="info">
          Progress counts for the whole team and doesn't lock leads.
        </Banner>
      </div>
    </Page>
  )
}

const PART_MS = 7000

export function ModulePage({ n, mobile }: { n: number; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const m = state.modules.find((x) => x.n === n)
  const [playing, setPlaying] = useState(false)
  const [part, setPart] = useState(() => Math.min(m?.partsDone ?? 0, (m?.parts.length ?? 1) - 1))
  const [pos, setPos] = useState(0)
  const [audio, setAudio] = useState(false)
  const [dl, setDl] = useState<number | null>(m?.saved ? 100 : null)
  const gate = useGate()
  const weak = state.sys.weakNetwork || slowNet()
  const timer = useRef(0)

  useEffect(() => {
    if (!playing) return
    timer.current = window.setInterval(() => setPos((p) => Math.min(1, p + 250 / PART_MS)), 250)
    return () => window.clearInterval(timer.current)
  }, [playing])

  // A part finished: count it once, then queue the next part.
  useEffect(() => {
    if (pos < 1 || !m) return
    setPlaying(false)
    setPos(0)
    if (part >= m.partsDone) {
      mutate((d) => {
        const mm = d.modules.find((x) => x.n === n)!
        mm.partsDone = Math.max(mm.partsDone, part + 1)
        if (!mm.openedAt) mm.openedAt = new Date().toISOString()
      })
      toast(part + 1 < m.parts.length ? `Part ${part + 1} done · part ${part + 2} is next` : 'All parts watched · take the quiz')
    }
    if (part + 1 < m.parts.length) setPart(part + 1)
  }, [pos, m, part, n, mutate, toast])

  useEffect(() => {
    if (dl == null || dl >= 100) return
    const t = window.setTimeout(() => {
      const v = Math.min(100, dl + (weak ? 9 : 22))
      setDl(v)
      if (v >= 100) {
        mutate((d) => {
          d.modules.find((x) => x.n === n)!.saved = true
        })
        toast(`Module ${n} saved on this phone · plays without internet`)
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [dl, weak, n, mutate, toast])

  if (!m) return <Center icon="grad" title="Module not found" />
  if (m.status === 'locked') {
    return (
      <Page mobile={mobile} desk="home" header={<SubBar title={`Module ${n}`} fallback="/workshop" />}>
        <Center icon="lock" title={m.title}>
          <span className="s13 mut">Opens {fmtDate(m.opensOn!)}. Finish module {n - 1} first.</span>
          <button type="button" className="btn" onClick={() => go('/workshop')}>
            Back to workshop
          </button>
        </Center>
      </Page>
    )
  }
  const watched = m.partsDone >= m.parts.length
  const quality = audio ? 'audio' : weak ? '240p' : '720p'
  return (
    <Page mobile={mobile} desk="home" header={<SubBar title={`Module ${n}`} fallback="/workshop" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        <button type="button" className="player" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          <span className="col" style={{ alignItems: 'center', gap: 6 }}>
            <Icon n={audio ? 'head' : playing ? 'video' : 'play'} s="xl" style={{ color: '#fff' }} />
            <span style={{ font: '500 11px ui-monospace, Menlo, monospace' }}>
              {playing ? `playing · ${quality}` : 'tap to play'} · part {part + 1}
            </span>
          </span>
          <span className="q">{quality}</span>
          <span className="pbar">
            <i style={{ width: `${pos * 100}%` }} />
          </span>
        </button>
        {weak && !audio && (
          <Banner tone="amb" icon="wifioff">
            Weak connection. Playing at 240p so it doesn't stop.
          </Banner>
        )}
        <div className="row" style={{ gap: 6 }}>
          <Chip on={audio} onClick={() => setAudio((a) => !a)}>
            <Icon n="head" s="sm" />
            Audio only
          </Chip>
          <Chip on={dl === 100} onClick={() => (dl == null ? setDl(0) : dl === 100 ? toast('Already saved on this phone', 'info') : undefined)}>
            <Icon n={dl === 100 ? 'ccheck' : 'dl'} s="sm" />
            {dl == null ? 'Save for offline' : dl < 100 ? `Saving… ${dl}%` : 'Saved offline'}
          </Chip>
        </div>
        <div className="col" style={{ gap: 3 }}>
          <span className="h2">{m.title}</span>
          <span className="s13 mut">
            {m.minutes} min · {m.parts.length} parts
          </span>
        </div>
        {m.parts.map((p, i) => {
          const done = i < m.partsDone
          const cur = i === part
          return (
            <button
              key={p.title}
              type="button"
              className="col"
              style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5 }}
              onClick={() => {
                if (i > m.partsDone) return toast(`Watch part ${m.partsDone + 1} first`, 'info')
                setPart(i)
                setPos(0)
                setPlaying(true)
              }}
            >
              <div className="row s13">
                {done && !cur ? <Icon n="ccheck" s="sm" className="gd" /> : cur ? <Icon n="play" s="sm" /> : <Icon n="circle" s="sm" className="fnt" />}
                <span className={`f1 ${cur ? 'b' : ''}`}>
                  Part {i + 1} · {p.title}
                </span>
                <span className="mut s12">{p.min} min</span>
              </div>
              {cur && pos > 0 && <Bar pct={pos * 100} />}
            </button>
          )
        })}
        {m.status === 'passed' ? (
          <>
            <Banner tone="grn" icon="ccheck">
              Quiz passed · {m.score}/10. Module {n} is done for {state.team.name}.
            </Banner>
            <button type="button" className="btn" onClick={() => go(`/workshop/${n}/quiz`)}>
              <Icon n="redo" />
              Retake quiz
            </button>
          </>
        ) : (
          <>
            <GateNote tried={gate.tried} missing={watched ? [] : [`Watch all ${m.parts.length} parts`]} again="Tap again to take the quiz anyway." />
            <button type="button" className={`btn drk ${watched ? '' : 'dis'}`} style={{ marginTop: 4 }} onClick={() => gate.run(watched ? [] : ['parts'], () => go(`/workshop/${n}/quiz`))}>
              Take quiz · 10 questions
            </button>
          </>
        )}
      </div>
    </Page>
  )
}

// ---------- Quiz ----------

const SHORT = ['When to visit', 'The first thing to learn', 'What to ask for first', 'When to send the agreement', 'Showing past work', 'A useful note', 'How many follow-ups', 'Friends and family leads', 'Handling a price objection', 'Payment proof']

export function QuizPage({ n, mobile }: { n: number; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const m = state.modules.find((x) => x.n === n) as Module
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null))
  const [done, setDone] = useState(false)
  const [review, setReview] = useState(false)
  const gate = useGate()
  const q = QUIZ[i]
  const score = answers.filter((a, k) => a === QUIZ[k].answer).length
  const passed = score >= PASS_MARK
  const wrong = QUIZ.map((x, k) => ({ x, k })).filter(({ x, k }) => answers[k] !== x.answer)

  const finish = (final: (number | null)[]) => {
    const s = final.filter((a, k) => a === QUIZ[k].answer).length
    setDone(true)
    if (s >= PASS_MARK) {
      const first = m.status !== 'passed'
      mutate((d) => {
        const mm = d.modules.find((x) => x.n === n)!
        mm.status = 'passed'
        mm.score = Math.max(mm.score ?? 0, s)
        mm.partsDone = mm.parts.length
        mm.missed = QUIZ.map((x, k) => ({ x, k })).filter(({ x, k }) => final[k] !== x.answer).map(({ k }) => `Q${k + 1} · ${SHORT[k]}`)
        if (first) d.points.unshift({ id: uid('pt'), at: new Date().toISOString(), xp: 100, title: 'Quiz passed', sub: `Module ${n} · ${mm.title}` })
      })
      if (first) toast(`Module ${n} done for ${state.team.name} · +100 XP`)
    }
  }

  const next = () =>
    gate.run(answers[i] == null ? ['An answer'] : [], () => {
      gate.reset()
      if (i + 1 < QUIZ.length) setI(i + 1)
      else finish(answers)
    })

  if (done) {
    const firstWrong = wrong[0]
    return (
      <Page mobile={mobile} desk="home" header={<SubBar left="x" title={`Module ${n} quiz`} onLeft={() => go(`/workshop/${n}`, { replace: true })} />}>
        <div className={mobile ? 'scr' : 'col'}>
          <Center
            icon={passed ? 'ccheck' : 'redo'}
            iconBg={passed ? '#EAE5DC' : '#FBE9E6'}
            iconFg={passed ? '#111111' : '#C0392B'}
            title={<span className="h1">{passed ? `Passed · ${score} of 10` : `${score} of 10, not passed yet`}</span>}
            style={{ minHeight: 0, paddingTop: 12 }}
          >
            <span className="mut" style={{ lineHeight: 1.5 }}>
              {passed ? `Module ${n} done for ${state.team.name}. Pass mark is ${PASS_MARK}.` : `You need ${PASS_MARK} to pass. Retry as many times as you need.`}
            </span>
            {passed && wrong.length > 0 && !review && (
              <div className="card" style={{ width: '100%', textAlign: 'left', gap: 8 }}>
                {wrong.map(({ k }) => (
                  <div key={k} className="row s13">
                    <Icon n="x" s="sm" style={{ color: '#C0392B' }} />
                    <span className="f1">
                      Q{k + 1} · {SHORT[k]}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!passed && firstWrong && !review && (
              <div className="card" style={{ width: '100%', textAlign: 'left', gap: 6 }}>
                <span className="s12 fnt b">Q{firstWrong.k + 1}</span>
                <span className="b s13" style={{ lineHeight: 1.4 }}>
                  {firstWrong.x.q}
                </span>
                <span className="s12 od">Your answer: {answers[firstWrong.k] == null ? 'Skipped' : firstWrong.x.options[answers[firstWrong.k]!]}</span>
                <span className="s12 gd">Correct: {firstWrong.x.options[firstWrong.x.answer]}</span>
              </div>
            )}
            {review &&
              QUIZ.map((x, k) => (
                <div key={k} className="card" style={{ width: '100%', textAlign: 'left', gap: 4, padding: 12 }}>
                  <span className="s12 fnt b row" style={{ gap: 6 }}>
                    <Icon n={answers[k] === x.answer ? 'ccheck' : 'x'} s="sm" style={{ color: answers[k] === x.answer ? '#111111' : '#C0392B' }} />Q{k + 1}
                  </span>
                  <span className="b s13" style={{ lineHeight: 1.4 }}>
                    {x.q}
                  </span>
                  {answers[k] !== x.answer && <span className="s12 od">Your answer: {answers[k] == null ? 'Skipped' : x.options[answers[k]!]}</span>}
                  <span className="s12 gd">Correct: {x.options[x.answer]}</span>
                </div>
              ))}
            {passed ? (
              <>
                <button type="button" className="btn drk w" onClick={() => go('/workshop', { replace: true })}>
                  Back to workshop
                </button>
                <button type="button" className="btn gh w" onClick={() => setReview((r) => !r)}>
                  {review ? 'Hide answers' : 'Review all answers'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn pri w"
                  onClick={() => {
                    setAnswers(QUIZ.map(() => null))
                    setI(0)
                    setDone(false)
                    setReview(false)
                  }}
                >
                  Retry quiz
                </button>
                <button type="button" className="btn gh w" onClick={() => go(`/workshop/${n}`, { replace: true })}>
                  <Icon n="play" />
                  Rewatch the module
                </button>
              </>
            )}
          </Center>
        </div>
      </Page>
    )
  }

  return (
    <Page mobile={mobile} desk="home" header={<SubBar left="x" title={`Module ${n} quiz`} onLeft={() => go(`/workshop/${n}`, { replace: true })} />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 14 }}>
        <div className="row jb s13">
          <span className="b">
            Question {i + 1} of {QUIZ.length}
          </span>
          <span className="mut">Pass mark {PASS_MARK}</span>
        </div>
        <Bar pct={(i / QUIZ.length) * 100} />
        <span className="h2" style={{ lineHeight: 1.35 }}>
          {q.q}
        </span>
        <div className="col" style={{ gap: 8 }} role="radiogroup">
          {q.options.map((o, k) => (
            <button key={k} type="button" role="radio" aria-checked={answers[i] === k} className={`opt ${answers[i] === k ? 'on' : ''} ${gate.tried && answers[i] == null ? 'err' : ''}`} onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))}>
              <div className="rad" />
              <span className="s13 b f1" style={{ lineHeight: 1.4 }}>
                {o}
              </span>
            </button>
          ))}
        </div>
        <GateNote tried={gate.tried} missing={answers[i] == null ? ['Pick an answer'] : []} again="Tap again to skip it." />
        <div className="row">
          {i > 0 && (
            <button type="button" className="btn" onClick={() => setI(i - 1)}>
              <Icon n="left" />
              Back
            </button>
          )}
          <button type="button" className="btn drk f1" onClick={next}>
            {i + 1 < QUIZ.length ? 'Next' : 'See result'}
          </button>
        </div>
      </div>
    </Page>
  )
}

// ---------- Course library ----------

export function LibraryPage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const [tab, setTab] = useState<LibraryItem['kind']>('video')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const items = state.library.filter((x) => x.kind === tab)
  const save = (it: LibraryItem) => {
    if (it.saved) return
    setSaving((s) => ({ ...s, [it.id]: true }))
    window.setTimeout(() => {
      mutate((d) => {
        d.library.find((x) => x.id === it.id)!.saved = true
      })
      setSaving((s) => ({ ...s, [it.id]: false }))
      toast(tab === 'event' ? `Registered · ${it.title}` : `Saved offline · ${it.title}`)
    }, tab === 'event' ? 400 : 1600)
  }
  return (
    <Page mobile={mobile} desk="home" header={<SubBar title="Course library" fallback="/workshop" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Course library</span>}
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'video', label: 'Videos' },
            { value: 'podcast', label: 'Podcast' },
            { value: 'event', label: 'SME events' },
          ]}
        />
        {items.map((it) => (
          <div key={it.id} className="card" style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
            <div className="img" style={{ width: 84, height: 56 }}>
              {it.kind === 'event' ? <Icon n="cal" className="fnt" /> : it.kind === 'podcast' ? <Icon n="head" className="fnt" /> : 'video'}
            </div>
            <div className="col f1" style={{ gap: 3 }}>
              <span className="b s13">{it.title}</span>
              <span className="s12 mut">{it.meta}</span>
              {it.saved ? (
                <span className="s12 gd row" style={{ gap: 4 }}>
                  <Icon n="ccheck" s="sm" />
                  {it.kind === 'event' ? 'Registered' : 'Saved offline'}
                </span>
              ) : (
                <button type="button" className="lnk s12" style={{ alignSelf: 'flex-start' }} onClick={() => save(it)} disabled={saving[it.id]}>
                  <Icon n={it.kind === 'event' ? 'cal' : 'dl'} s="sm" />
                  {saving[it.id] ? (it.kind === 'event' ? 'Registering…' : 'Saving…') : it.kind === 'event' ? 'Register' : 'Save'}
                </button>
              )}
            </div>
          </div>
        ))}
        {tab !== 'event' && (
          <Banner tone="gry" icon="info">
            Saved {tab === 'video' ? 'videos' : 'episodes'} play without internet. They're kept on this phone only.
          </Banner>
        )}
        {tab === 'event' && <Tag cls="t-drf">SME events are run by the BRAVE program team</Tag>}
      </div>
    </Page>
  )
}
