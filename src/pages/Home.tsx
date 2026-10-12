import { useEffect, useState } from 'react'
import { fireConfetti } from '../confetti'
import { STAGE_LABEL } from '../data/constants'
import { activeLeads, myRank, openTriggers, ranking, unlockStatus, WEEK_NO, weekRange, weekSummary, workshopProgress, xpTotal, type Task } from '../data/derive'
import type { AppState } from '../data/types'
import { addDays, daysUntil, fmtDate, fmtRange, greeting, plural, today, weekday } from '../lib/format'
import { go } from '../router'
import { Page, PhoneBrand } from '../Shell'
import { useStore } from '../store'
import { Banner, Bar, Center, Icon, Logo, Ring, Tag } from '../ui'
import { TriggerCard } from './Inbox'

// ---------- Sign in ----------

export function SignInPage() {
  const { mutate, toast } = useStore()
  const [busy, setBusy] = useState(false)
  const signIn = () => {
    setBusy(true)
    window.setTimeout(() => {
      mutate((d) => {
        d.sys.signedIn = true
        d.week.logins = Math.max(d.week.logins, 1)
      })
      toast('Signed in as Tanvi Kumar · Team Kalpa')
      go('/home', { replace: true })
    }, 900)
  }
  return (
    <div className="center full" style={{ alignItems: 'stretch', textAlign: 'left', maxWidth: 420, margin: '0 auto', gap: 18, padding: '0 26px' }}>
      <Logo size={56} />
      <div className="col" style={{ gap: 6 }}>
        <span className="h1" style={{ fontSize: 28 }}>
          BRAVE Season 2
        </span>
        <span className="mut" style={{ lineHeight: 1.5 }}>
          Leads, projects and BRDs for your team, in one place.
        </span>
      </div>
      <button type="button" className="btn drk w" onClick={signIn} disabled={busy}>
        <Icon n={busy ? 'refresh' : 'login'} />
        {busy ? 'Signing in…' : 'Sign in with NxtWave'}
      </button>
      <span className="s12 mut" style={{ lineHeight: 1.5 }}>
        Use the account you already have. No new sign-up.
      </span>
      <div className="hr" />
      <Banner tone="gry" icon="info">
        Not on a team yet? Your campus COS adds you before the season starts.
      </Banner>
    </div>
  )
}

// ---------- Access removed ----------

export function RemovedPage() {
  const { state, mutate, toast } = useStore()
  return (
    <Center icon="lock" title={`You're no longer on ${state.team.name}`} full>
      <span className="s13 mut" style={{ lineHeight: 1.5, maxWidth: 320 }}>
        Your team keeps the points you helped earn. If this is a mistake, contact your campus COS.
      </span>
      <div className="col" style={{ width: '100%', maxWidth: 340 }}>
        <a className="btn drk w" href={`mailto:cos.hyderabad@nxtwave.example?subject=${encodeURIComponent('BRAVE team access')}`} onClick={() => toast(`Opening a message to ${state.team.cos}`, 'info')}>
          Contact {state.team.cos}, COS
        </a>
        <button
          type="button"
          className="btn gh w"
          onClick={() =>
            mutate((d) => {
              d.sys.signedIn = false
              d.sys.removed = false
            })
          }
        >
          Sign out
        </button>
      </div>
    </Center>
  )
}

// ---------- Home ----------

function weekLabel() {
  const { from, to } = weekRange()
  const d = new Date().getDay()
  if (d === 1) return `WEEK ${WEEK_NO} · ${fmtRange(from, to)}`.toUpperCase()
  return `WEEK ${WEEK_NO} · ${weekday(today())}`.toUpperCase()
}

const TASK_GO: Record<string, string> = { leads: '/leads?add=1', logs: '/leads', convert: '/leads', triggers: '/inbox' }

function TaskList({ tasks, themed }: { tasks: Task[]; themed?: boolean }) {
  return (
    <div className="tklist">
      {tasks.map((t) => {
        const to = TASK_GO[t.key]
        const body = (
          <>
            <Icon n={t.done ? 'ccheck' : 'circle'} className={t.done ? 'gd' : 'fnt'} />
            <span className={`s13 f1 ${t.done ? 'mut' : 'b'}`}>
              {t.label}
              {themed && t.key === 'leads' && (
                <Tag cls="t-ter" style={{ marginLeft: 6 }}>
                  Bonus
                </Tag>
              )}
            </span>
            <span className={`s13 b tnum ${t.done ? 'gd' : ''}`}>{t.done ? 'Done' : `${t.have} / ${t.need}`}</span>
            {to && !t.done && <Icon n="right" s="sm" className="fnt" />}
          </>
        )
        return to && !t.done ? (
          <button key={t.key} type="button" className="tk" style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: '1px solid #F0ECE6', width: '100%' }} onClick={() => go(to)}>
            {body}
          </button>
        ) : (
          <div key={t.key} className="tk">
            {body}
          </div>
        )
      })}
    </div>
  )
}

function ringText(s: AppState, tasks: Task[], done: number): [string, string] {
  if (s.sys.inactive) return [`Week ${WEEK_NO + 2} · nothing logged yet`, 'Streak reset. A new block can start any Monday.']
  const leads = tasks.find((t) => t.key === 'leads')!
  if (done <= 1 && leads.have === 0) return ['Your week: 20 leads, 20 interactions, 1 project', '200 XP for all 5 · closes Sun 23:59']
  if (!leads.done) return [`${leads.have} of ${leads.need} leads so far`, `${leads.need - leads.have} more by Sunday for 200 XP`]
  const next = tasks.find((t) => !t.done)
  if (next) return [`${done} of 5 done`, `Next: ${next.label.toLowerCase()} · ${next.have}/${next.need}`]
  return ['All 5 done', '200 XP added to your team']
}

function Stats({ s }: { s: AppState }) {
  const rank = myRank(s)
  const w = s.week
  const streakText = w.blocks > 0 && w.streak === 0 ? `Block ${w.blocks}` : `Week ${Math.min(4, w.streak + 1)} of 4`
  return (
    <div className="row" style={{ gap: 8 }}>
      <button type="button" className="stat" style={{ padding: '9px 10px' }} onClick={() => go('/ranks/points')}>
        <span className="s12 mut">XP</span>
        <span className="b tnum">{xpTotal(s).toLocaleString('en-IN')}</span>
      </button>
      <button type="button" className="stat" style={{ padding: '9px 10px' }} onClick={() => go('/ranks')}>
        <span className="s12 mut">Campus rank</span>
        <span className="b">
          {rank.tied ? '=' : '#'}
          {rank.rank}
        </span>
      </button>
      <div className="stat" style={{ padding: '9px 10px' }}>
        <span className="s12 mut row" style={{ gap: 3 }}>
          <Icon n="flame" s="sm" style={{ color: '#C0392B' }} />
          Streak
        </span>
        <span className="b">{streakText}</span>
      </div>
    </div>
  )
}

export function HomePage({ mobile }: { mobile: boolean }) {
  const { state } = useStore()
  const u = unlockStatus(state)
  if (!u.unlocked) return <UnlockHome mobile={mobile} />
  return mobile ? <HomePhone /> : <HomeDesk />
}

function GraceAndInactive({ s }: { s: AppState }) {
  const sun = addDays(weekRange().to, 0)
  return (
    <>
      {s.sys.grace && (
        <Banner tone="amb" icon="clock">
          <b>We were down on Sun {fmtDate(sun)}.</b> Week {WEEK_NO} now closes Tue {fmtDate(addDays(sun, 2))}, 23:59, so your tasks still count.
        </Banner>
      )}
      {s.sys.inactive && (
        <Banner tone="red" icon="alert">
          <b>No activity from {s.team.name} for 2 weeks.</b> Your mentor {s.team.mentor} has been asked to reach out.
        </Banner>
      )}
    </>
  )
}

function Themed() {
  const { from } = weekRange()
  return (
    <div className="card" style={{ background: '#C0392B', borderColor: '#C0392B', color: '#fff', gap: 6 }}>
      <div className="row" style={{ gap: 6 }}>
        <Icon n="zap" s="sm" style={{ color: '#EF9F27' }} />
        <span className="s12 b" style={{ letterSpacing: '.06em' }}>
          LEAD RUSH · WEEK {WEEK_NO}
        </span>
      </div>
      <span className="b" style={{ fontSize: 17, lineHeight: 1.35 }}>
        Extra XP for every new lead with all mandatory fields.
      </span>
      <span className="s12">This week only · ends Sun {fmtDate(addDays(from, 6))}, 23:59</span>
    </div>
  )
}

function AllDone({ s }: { s: AppState }) {
  const blockNow = s.week.blocks > 0 && s.week.streak === 0
  const filled = blockNow ? 4 : Math.min(4, s.week.streak)
  return (
    <div className="card" style={{ background: '#EAE5DC', borderColor: '#CFC7BA', gap: 10 }}>
      <div className="row jb">
        <span className="b" style={{ color: '#111111', fontSize: 16 }}>
          All 5 tasks done
        </span>
        <span className="b gd">+200 XP</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flame" style={{ background: i < filled ? '#111111' : '#CFE6D7' }}>
            <Icon n="flame" s="sm" />
          </div>
        ))}
      </div>
      {blockNow ? (
        <>
          <div className="row jb s13">
            <span className="b" style={{ color: '#111111' }}>
              Streak block {s.week.blocks} earned
            </span>
            <span className="b gd">+500 XP</span>
          </div>
          <span className="s12" style={{ color: '#111111' }}>
            Blocks this season: {s.week.blocks} of 3. The next one starts Monday.
          </span>
        </>
      ) : (
        <span className="s12" style={{ color: '#111111' }}>
          {4 - filled} more full {4 - filled === 1 ? 'week' : 'weeks'} for a 500 XP streak block.
        </span>
      )}
    </div>
  )
}

function NeedsAction({ s, max = 2 }: { s: AppState; max?: number }) {
  const open = openTriggers(s)
    .filter((t) => t.pri)
    .sort((a, b) => (a.pri ?? 'P9').localeCompare(b.pri ?? 'P9') || a.due.localeCompare(b.due))
  if (!open.length) return null
  return (
    <>
      <span className="grp" style={{ color: '#C0392B' }}>
        Needs action · {open.length}
      </span>
      <div className="tlist">
        {open.slice(0, max).map((t) => (
          <TriggerCard key={t.id} t={t} />
        ))}
      </div>
      {open.length > max && (
        <button type="button" className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => go('/inbox')}>
          {plural(open.length - max, 'more item')} in Inbox
          <Icon n="right" s="sm" />
        </button>
      )}
    </>
  )
}

function HomePhone() {
  const { state } = useStore()
  const w = weekSummary(state)
  const [title, sub] = ringText(state, w.tasks, w.done)
  const easiest = activeLeads(state).filter((l) => l.stage === 'terms')
  return (
    <Page mobile bn="home" header={<PhoneBrand />}>
      <div className="scr">
        <GraceAndInactive s={state} />
        {state.week.themed && <Themed />}
        {w.all && !state.sys.inactive ? (
          <AllDone s={state} />
        ) : (
          <>
            {!state.sys.inactive && !state.week.themed && (
              <div className="col" style={{ gap: 2 }}>
                <span className="s12 b fnt">{weekLabel()}</span>
                <span className="h1">{w.done <= 1 ? `${greeting()}, ${state.me}` : `${w.done} of 5 done`}</span>
              </div>
            )}
            <div className="card dark" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Ring pct={state.sys.inactive ? 0 : w.pct} />
              <div className="col f1" style={{ gap: 3 }}>
                <span className="b">{title}</span>
                <span className="s12" style={{ color: '#C9C4BB' }}>
                  {sub}
                </span>
              </div>
            </div>
          </>
        )}
        {!state.sys.inactive && <Stats s={state} />}
        {state.sys.inactive ? (
          <>
            <span className="grp">Easiest way back</span>
            <div className="card" style={{ padding: 12, gap: 6 }}>
              <div className="row jb">
                <Tag cls="t-ter">P2</Tag>
                <span className="s12 mut">{easiest.length} open</span>
              </div>
              <span className="b s13" style={{ lineHeight: 1.4 }}>
                Follow up on {plural(easiest.length, 'lead')} at {STAGE_LABEL.terms}
              </span>
              <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('/leads?stage=terms')}>
                Open leads
              </button>
            </div>
          </>
        ) : (
          <NeedsAction s={state} />
        )}
        <span className="grp">{w.all ? `Week ${WEEK_NO}` : 'This week'}</span>
        <TaskList tasks={state.sys.inactive ? w.tasks.map((t) => ({ ...t, have: t.key === 'login' ? 1 : 0, done: false })) : w.tasks} themed={state.week.themed} />
        <Banner tone="gry" icon="clock">
          Anything finished after Sun 23:59 counts toward next week.
        </Banner>
        <LearnCard s={state} />
      </div>
    </Page>
  )
}

function LearnCard({ s }: { s: AppState }) {
  const wp = workshopProgress(s)
  const next = s.sessions.find((x) => daysUntil(x.at) >= 0 && x.host !== 'Tanvi Kumar')
  return (
    <>
      <span className="grp">Keep going</span>
      {wp.passed < wp.total && (
        <button type="button" className="card click" style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }} onClick={() => go('/workshop')}>
          <Icon n="grad" className="mut" />
          <div className="col f1" style={{ gap: 2 }}>
            <span className="b s13">
              Workshop · {wp.passed} of {wp.total} modules
            </span>
            <span className="s12 mut">Tracked, not blocking</span>
          </div>
          <Icon n="right" className="fnt" />
        </button>
      )}
      {next && (
        <button type="button" className="card click" style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }} onClick={() => go('/me/sessions')}>
          <Icon n="mega" className="mut" />
          <div className="col f1" style={{ gap: 2 }}>
            <span className="b s13">{next.title}</span>
            <span className="s12 mut">
              Peer session · {next.host.split(' ')[0]} · {daysUntil(next.at) === 0 ? 'today' : daysUntil(next.at) === 1 ? 'tomorrow' : fmtDate(next.at)}
            </span>
          </div>
          <Icon n="right" className="fnt" />
        </button>
      )}
    </>
  )
}

function HomeDesk() {
  const { state } = useStore()
  const w = weekSummary(state)
  const rank = ranking(state, 'campus')
  const me = rank.findIndex((r) => r.you)
  const around = rank.slice(Math.max(0, me - 2), me + 2)
  const open = openTriggers(state)
  const filled = state.week.blocks > 0 && state.week.streak === 0 ? 4 : Math.min(4, state.week.streak + (w.all ? 0 : 0))
  return (
    <Page mobile={false} desk="home" wide>
      <div className="row" style={{ gap: 22, alignItems: 'flex-start' }}>
        <div className="col f1" style={{ gap: 16 }}>
          <GraceAndInactive s={state} />
          {state.week.themed && <Themed />}
          <div className="col" style={{ gap: 3 }}>
            <span className="s12 b fnt">
              WEEK {WEEK_NO} · {fmtRange(weekRange().from, weekRange().to).toUpperCase()} · CLOSES SUN 23:59
            </span>
            <span className="h1">
              {greeting()}, {state.me}
            </span>
          </div>
          {w.all && !state.sys.inactive ? (
            <AllDone s={state} />
          ) : (
            <div className="row" style={{ gap: 16, padding: '18px 20px', borderRadius: 14, background: '#111111', color: '#fff' }}>
              <Ring pct={state.sys.inactive ? 0 : w.pct} size={76} />
              <div className="col f1" style={{ gap: 4 }}>
                <span className="h2">{state.sys.inactive ? 'Nothing logged yet this week' : `${w.done} of 5 weekly tasks done`}</span>
                <span className="s13" style={{ color: '#C9C4BB' }}>
                  Finish all 5 for 200 XP. {4 - filled > 1 ? `${4 - filled} more full weeks` : 'One more full week'} completes your {state.week.blocks ? 'next' : 'first'} 500 XP streak block.
                </span>
              </div>
              <div className="row" style={{ gap: 6 }} aria-label={`${filled} of 4 streak weeks`}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: i < filled ? '#EF9F27' : '#3A3733', display: 'grid', placeItems: 'center', color: '#111111' }}>
                    <Icon n="flame" s="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pan" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="row jb">
              <span className="b">This week</span>
              <span className="s12 fnt">Anything finished after Sun 23:59 counts toward next week</span>
            </div>
            <TaskList tasks={w.tasks} themed={state.week.themed} />
          </div>
          <LearnCardDesk s={state} />
        </div>
        <div className="col" style={{ width: 380, gap: 14 }}>
          <div className="pan pad">
            <div className="row jb">
              <span className="b">Needs action</span>
              <a href="#/inbox" className="s13 b" style={{ textDecoration: 'none' }}>
                Inbox · {open.length}
              </a>
            </div>
            {open.length === 0 && <span className="s13 mut">Nothing open. Triggers clear themselves when the action is done.</span>}
            <div className="tlist flat">
              {open
                .sort((a, b) => (a.pri ?? 'P9').localeCompare(b.pri ?? 'P9'))
                .slice(0, 3)
                .map((t) => (
                  <TriggerCard key={t.id} t={t} />
                ))}
            </div>
          </div>
          <div className="pan" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row jb">
              <span className="b">Campus leaderboard</span>
              <a href="#/ranks" className="s13 mut" style={{ textDecoration: 'none' }}>
                {state.team.campus}
              </a>
            </div>
            {around.map((r) => (
              <div key={r.name} className={`lb ${r.you ? 'me' : ''}`}>
                <span className={`b ${r.you ? '' : 'mut'}`}>
                  {r.tied ? '=' : ''}
                  {r.rank}
                </span>
                <span className={r.you ? 'b' : ''}>
                  {r.name}
                  {r.you ? ' (you)' : ''}
                </span>
                <span className="b tnum">{r.xp.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

function LearnCardDesk({ s }: { s: AppState }) {
  return (
    <div className="learn-grid">
      <LearnCard s={s} />
    </div>
  )
}

// ---------- Locked: unlock leads ----------

function UnlockHome({ mobile }: { mobile: boolean }) {
  const { state } = useStore()
  const u = unlockStatus(state)
  const wp = workshopProgress(state)
  const b = state.unlock.brochure
  const site = state.unlock.website
  const cutoff = fmtDate(state.unlock.cutoff)
  const body = u.autoLocked ? (
    <>
      <Banner tone="red" icon="lock">
        <b>Leads locked.</b> {state.team.name} missed the {cutoff} cutoff with {plural(2 - u.done, 'item')} pending.
      </Banner>
      <div className="card" style={{ gap: 10 }}>
        <div className="row s13">
          <Icon n={b ? 'ccheck' : 'x'} s="sm" className={b ? 'gd' : ''} style={b ? undefined : { color: '#C0392B' }} />
          <span className="f1 b">Brochure</span>
          <span className={`s12 ${b ? 'gd' : 'od'}`}>{b ? 'Done' : 'Not submitted'}</span>
        </div>
        <div className="hr" />
        <div className="row s13">
          <Icon n={site ? 'ccheck' : 'x'} s="sm" className={site ? 'gd' : ''} style={site ? undefined : { color: '#C0392B' }} />
          <span className="f1 b">Custom website</span>
          <span className={`s12 ${site ? 'gd' : 'od'}`}>{site ? 'Done' : 'Not submitted'}</span>
        </div>
      </div>
      <span className="grp">Exception</span>
      <div className="card" style={{ gap: 12 }}>
        <span className="s13 mut" style={{ lineHeight: 1.5 }}>
          Your COS can ask the program team to reopen your team.
        </span>
        {state.unlock.exception ? (
          <div className="col" style={{ gap: 0 }}>
            <div className="tli">
              <div className="tld">
                <Icon n="send" s="sm" />
              </div>
              <div className="tlc">
                <div className="row jb">
                  <span className="b s13">Requested by {state.unlock.exception.by}</span>
                  <span className="s12 fnt">{fmtDate(state.unlock.exception.at)}</span>
                </div>
                <span className="s13 mut">{state.unlock.exception.note}</span>
              </div>
            </div>
            <div className="tli">
              <div className="tld" style={{ background: '#EAE5DC', color: '#111111' }}>
                <Icon n="clock" s="sm" />
              </div>
              <div className="tlc">
                <span className="b s13">Program team decision</span>
                <span className="s12 mut">Pending</span>
              </div>
            </div>
          </div>
        ) : (
          <span className="s13">No exception requested yet.</span>
        )}
      </div>
      {!site && (
        <button type="button" className="btn drk" onClick={() => go('/website')}>
          Finish the website now
        </button>
      )}
      <span className="s12 fnt" style={{ lineHeight: 1.5 }}>
        If approved, leads open as soon as both items are done.
      </span>
    </>
  ) : (
    <>
      <div className="col" style={{ gap: 4 }}>
        <span className="h1">Unlock leads</span>
        <span className="s13 mut">Any member can finish an item for the whole team.</span>
      </div>
      <div className="card dark" style={{ gap: 8 }}>
        <div className="row jb">
          <span className="b">
            {u.done} of 2 required done
          </span>
          <span className="s12" style={{ color: '#EF9F27', fontWeight: 700 }}>
            Cutoff {cutoff} · {plural(Math.max(0, u.cutoffDays), 'day')}
          </span>
        </div>
        <Bar pct={(u.done / 2) * 100} color="#EF9F27" />
      </div>
      <span className="grp">Required to unlock</span>
      <UnlockItem done={!!b} icon="file" title="Brochure" sub={b ? `${b.mode === 'upload' ? 'Uploaded' : 'Built'} by ${b.by} · ${fmtDate(b.at)}` : '3 sample projects, or your own PDF'} to="/brochure" />
      <UnlockItem done={!!site} icon="globe" title="Custom website" sub={site ? `${site.url.replace(/^https?:\/\//, '')} · checked ${fmtDate(site.at)}` : 'On your own domain'} to="/website" />
      <span className="grp">Tracked, not blocking</span>
      <button type="button" className="card click" style={{ gap: 8 }} onClick={() => go('/workshop')}>
        <div className="row" style={{ gap: 12 }}>
          <div className="icb">
            <Icon n="grad" />
          </div>
          <div className="col f1" style={{ gap: 2 }}>
            <span className="b">Workshop</span>
            <span className="s12 mut">
              {wp.passed} of {wp.total} modules · {plural(wp.passed, 'quiz', 'quizzes')} passed
            </span>
          </div>
          <Icon n="right" className="fnt" />
        </div>
        <Bar pct={wp.pct} />
      </button>
    </>
  )
  return (
    <Page mobile={mobile} bn="home" desk="home" header={<PhoneBrand />}>
      <div className={mobile ? 'scr' : 'col'} style={mobile ? undefined : { gap: 12 }}>
        {body}
      </div>
    </Page>
  )
}

function UnlockItem({ done, icon, title, sub, to }: { done: boolean; icon: string; title: string; sub: string; to: string }) {
  return (
    <button type="button" className="card click" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => go(to)}>
      <div className="icb" style={done ? { background: '#EAE5DC', color: '#111111' } : undefined}>
        <Icon n={done ? 'check' : icon} />
      </div>
      <div className="col f1" style={{ gap: 2 }}>
        <span className="b">{title}</span>
        <span className="s12 mut">{sub}</span>
      </div>
      {done ? (
        <Tag cls="t-grn">Done</Tag>
      ) : (
        <span className="btn pri sm" aria-hidden>
          Add
        </span>
      )}
    </button>
  )
}

/** Leads tab (and Projects, BRDs) before the gate opens. */
export function LockedPipeline() {
  const { state } = useStore()
  const u = unlockStatus(state)
  const b = state.unlock.brochure
  const site = state.unlock.website
  return (
    <Center icon="lock" title="Leads open after your website and brochure">
      <span className="s13 mut" style={{ lineHeight: 1.5, maxWidth: 320 }}>
        {u.done} of 2 done. Projects and BRDs start from your first won lead.
      </span>
      <div className="col" style={{ gap: 8, width: '100%', maxWidth: 340, textAlign: 'left' }}>
        <div className="row s13">
          <Icon n={b ? 'ccheck' : 'circle'} s="sm" className={b ? 'gd' : 'fnt'} />
          <span className="f1">Brochure</span>
          <span className={`s12 ${b ? 'gd b' : 'mut'}`}>{b ? 'Done' : 'Not started'}</span>
        </div>
        <div className="row s13">
          <Icon n={site ? 'ccheck' : 'circle'} s="sm" className={site ? 'gd' : 'fnt'} />
          <span className="f1">Custom website</span>
          <span className={`s12 ${site ? 'gd b' : 'mut'}`}>{site ? 'Done' : 'Not started'}</span>
        </div>
      </div>
      <button type="button" className="btn pri" style={{ width: '100%', maxWidth: 340 }} onClick={() => go(!b ? '/brochure' : '/website')}>
        {!b ? 'Build brochure' : 'Add website'}
      </button>
      <span className={`s12 ${u.autoLocked ? 'od' : 'td'}`}>{u.autoLocked ? `Missed the ${fmtDate(state.unlock.cutoff)} cutoff · exception pending` : `Cutoff ${fmtDate(state.unlock.cutoff)} · ${plural(Math.max(0, u.cutoffDays), 'day')} left`}</span>
    </Center>
  )
}

// ---------- Unlocked ----------

export function UnlockedPage() {
  const { state, mutate } = useStore()
  const wp = workshopProgress(state)
  const left = wp.total - wp.passed
  const early = daysUntil(state.unlock.cutoff)
  useEffect(() => {
    fireConfetti()
  }, [])
  const done = (to: string) => {
    mutate((d) => {
      d.unlock.seenUnlocked = true
    })
    go(to, { replace: true })
  }
  return (
    <Center
      full
      icon={
        <div style={{ width: 92, height: 92, borderRadius: 28, background: '#C0392B', color: '#fff', display: 'grid', placeItems: 'center', position: 'relative' }}>
          <Icon n="check" s="xl" />
          <span style={{ position: 'absolute', width: 14, height: 14, background: '#EF9F27', right: 14, bottom: 14, borderRadius: 2 }} />
        </div>
      }
      title={
        <span className="h1" style={{ fontSize: 28 }}>
          Leads unlocked
        </span>
      }
    >
      <span className="mut" style={{ lineHeight: 1.5, maxWidth: 320 }}>
        {state.team.name} finished the website and brochure{early > 0 ? `, ${plural(early, 'day')} before the cutoff` : ''}.
      </span>
      <div className="col" style={{ width: '100%', maxWidth: 340 }}>
        <button type="button" className="btn pri w" onClick={() => done('/leads?add=1')}>
          <Icon n="plus" />
          Add your first lead
        </button>
        {left > 0 && (
          <button type="button" className="card click" style={{ textAlign: 'left', flexDirection: 'row', alignItems: 'center', marginTop: 8 }} onClick={() => done('/workshop')}>
            <Icon n="grad" className="mut" />
            <div className="col f1" style={{ gap: 2 }}>
              <span className="b s13">{plural(left, 'workshop module')} left</span>
              <span className="s12 mut">Not blocking, still tracked</span>
            </div>
            <Icon n="right" className="fnt" />
          </button>
        )}
        <button type="button" className="btn gh w" onClick={() => done('/home')}>
          Go to Home
        </button>
      </div>
    </Center>
  )
}
