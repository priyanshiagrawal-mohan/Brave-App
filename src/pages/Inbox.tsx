import { useState } from 'react'
import { TRIGGER_NAME } from '../data/constants'
import { clearedTriggers, ladder, openTriggers, slaEnd, weekSummary, xpTotal } from '../data/derive'
import type { AppState, Trigger } from '../data/types'
import { daysUntil, fmtDate, fmtDateTime, fmtTime, inr, plural, today, weekday } from '../lib/format'
import { go } from '../router'
import { Page, PhoneTitle, SubBar } from '../Shell'
import { useStore } from '../store'
import { Banner, Center, Icon, Logo, Seg, Tag } from '../ui'
import { useLeadActions } from './LeadActions'

const PRI_TAG: Record<string, string> = { P1: 't-red', P2: 't-ter', P3: 't-drf' }
const PRI_TEXT: Record<string, string> = { P1: 'Urgent', P2: 'Due soon', P3: 'When you can' }

function whereText(s: AppState, t: Trigger): { text: string; cls: string } {
  // Overdue / escalated items already sit under a red section label; no extra status text.
  const d = daysUntil(t.due)
  if (ladder(s, t).current >= 1 || d < 0) return { text: '', cls: 'mut' }
  if (d === 0) return { text: 'Today', cls: 'td' }
  if (d === 1) return { text: 'Due tomorrow', cls: 'td' }
  return { text: `By ${fmtDate(t.due)}`, cls: 'mut' }
}

/** The action that clears a trigger. */
function useTriggerAction(t: Trigger): { label: string; short: string; run: () => void } | null {
  const { state } = useStore()
  const la = useLeadActions()
  const lead = t.leadId ? state.leads.find((l) => l.id === t.leadId) : undefined
  switch (t.code) {
    case 'T7':
      return { label: 'Fix & resubmit', short: 'Fix', run: () => go(`/brds/${t.projectId}/fix`) }
    case 'T5':
      return { label: 'Review & submit', short: 'Submit', run: () => go(`/brds/${t.projectId}`) }
    case 'T6':
      return { label: 'Open testimonial', short: 'Open', run: () => go(`/testimonials/${t.projectId}`) }
    case 'T2':
      return lead ? { label: 'Log interaction', short: 'Log', run: () => la.logFor(lead, { stage: 'brochure' }) } : null
    case 'N1':
    case 'T3':
      return lead ? { label: 'Log interaction', short: 'Log', run: () => la.logFor(lead) } : null
    default:
      return null
  }
}

/** What to do, said as a task (the business name is the row title). */
const TASK: Record<string, string> = { T2: 'Send the brochure', T3: 'No update in 10 days', N1: 'Follow up', T5: 'Submit the BRD', T7: 'BRD rejected · fix and resubmit', T6: 'Video testimonial' }
const TRIGGER_ICON: Record<string, string> = { T2: 'send', T3: 'phone', N1: 'phone', T5: 'file', T7: 'file', T6: 'video' }

export function TriggerCard({ t }: { t: Trigger }) {
  const { state } = useStore()
  const act = useTriggerAction(t)
  const where = whereText(state, t)
  const urgent = ladder(state, t).current >= 1 || daysUntil(t.due) < 0
  const lead = t.leadId ? state.leads.find((l) => l.id === t.leadId) : undefined
  const proj = t.projectId ? state.projects.find((p) => p.id === t.projectId) : undefined
  const who = lead?.business ?? proj?.client.business
  const meta = [who ? TASK[t.code] ?? TRIGGER_NAME[t.code] : TRIGGER_NAME[t.code], where.text].filter(Boolean).join(' · ')
  return (
    <div className="trow" role="button" tabIndex={0} onClick={() => go(`/inbox/${t.id}`)} onKeyDown={(e) => e.key === 'Enter' && go(`/inbox/${t.id}`)}>
      <span className={`trow-ic ${urgent ? 'hot' : ''}`} aria-hidden>
        <Icon n={TRIGGER_ICON[t.code] ?? 'bell'} s="sm" />
      </span>
      <span className="trow-body">
        <span className="trow-t">{who ?? t.title}</span>
        <span className={`trow-m ${where.cls === 'td' ? 'td' : ''}`}>{meta}</span>
      </span>
      {act ? (
        <button
          type="button"
          className="btn sm trow-btn"
          aria-label={act.label}
          onClick={(e) => {
            e.stopPropagation()
            act.run()
          }}
        >
          {act.short}
        </button>
      ) : (
        <Icon n="right" s="sm" className="fnt" />
      )}
    </div>
  )
}

export function InboxPage({ mobile }: { mobile: boolean }) {
  const { state } = useStore()
  const [tab, setTab] = useState<'todo' | 'cleared'>('todo')
  const open = openTriggers(state)
  const cleared = clearedTriggers(state)
  const esc = open.filter((t) => ladder(state, t).current >= 1)
  const soon = open.filter((t) => !esc.includes(t) && daysUntil(t.due) <= 1)
  const rest = open.filter((t) => !esc.includes(t) && !soon.includes(t))
  const groups: [string, string | undefined, Trigger[]][] = [
    ['Escalated', '#C0392B', esc],
    ['Due soon', '#8F5B0B', soon],
    ['Open', undefined, rest],
  ]
  return (
    <Page
      mobile={mobile}
      bn="inbox"
      header={
        <PhoneTitle
          title="Inbox"
          right={
            <button type="button" className="btn gh sm" style={{ width: 34, height: 34, padding: 0 }} onClick={() => go('/notifications')} aria-label="Notification settings">
              <Icon n="bell" className="mut" />
            </button>
          }
        />
      }
    >
      <div className={mobile ? 'scr' : 'col'} style={mobile ? undefined : { gap: 12 }}>
        {!mobile && (
          <div className="row jb">
            <div className="col" style={{ gap: 3 }}>
              <span className="h1">Inbox</span>
              <span className="s13 mut">Triggers and nudges. Do the action and the item clears itself.</span>
            </div>
            <button type="button" className="btn sm" onClick={() => go('/notifications')}>
              <Icon n="bell" s="sm" />
              Notifications
            </button>
          </div>
        )}
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'todo', label: `To do · ${open.length}` },
            { value: 'cleared', label: `Cleared · ${cleared.length}` },
          ]}
        />
        {tab === 'todo' ? (
          open.length === 0 ? (
            <Center icon="ccheck" iconBg="#EAE5DC" iconFg="#111111" title="All clear">
              <span className="s13 mut">Nothing needs you right now. New triggers show up here.</span>
            </Center>
          ) : (
            <>
              {groups.map(([name, color, list]) =>
                list.length ? (
                  <div key={name} className="col" style={{ gap: 10 }}>
                    <span className="grp" style={{ color }}>
                      {name} · {list.length}
                    </span>
                    <div className="tlist">
                      {list.map((t) => (
                        <TriggerCard key={t.id} t={t} />
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
              <span className="s12 fnt" style={{ textAlign: 'center' }}>
                Do the action and the item clears itself.
              </span>
            </>
          )
        ) : (
          cleared.map((t) => (
            <div key={t.id} className="card" style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Icon n="ccheck" className="gd" />
              <div className="col f1" style={{ gap: 2 }}>
                <span className="b s13">{t.done ?? t.title}</span>
                <span className={`s12 ${t.code.startsWith('N') ? 'mut' : t.late ? 'td' : 'gd'}`}>
                  {fmtDate(t.clearedAt!)}
                  {t.code.startsWith('T') && (t.late ? ` · ${plural(t.late, 'day')} late` : ' · within SLA')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Page>
  )
}

const ACTION_TITLE: Partial<Record<Trigger['code'], (t: Trigger) => string>> = {
  T7: (t) => `Resubmit the BRD for ${t.title.split(': ')[1] ?? ''}`,
  T2: (t) => t.title,
  T5: (t) => t.title,
  T6: (t) => `Get the ${t.title.toLowerCase()}`,
}

export function TriggerPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state } = useStore()
  const t = state.triggers.find((x) => x.id === id)
  const act = useTriggerAction(t ?? state.triggers[0])
  if (!t) {
    return (
      <Page mobile={mobile} header={<SubBar title="Trigger" fallback="/inbox" />}>
        <Center icon="inbox" title="This item is gone">
          <button type="button" className="btn" onClick={() => go('/inbox')}>
            Back to Inbox
          </button>
        </Center>
      </Page>
    )
  }
  const l = ladder(state, t)
  const slaEnded = new Date(slaEnd(t)).getTime() < Date.now()
  const body = (
    <>
      <div className="row" style={{ gap: 6 }}>
        <Tag cls={t.pri ? PRI_TAG[t.pri] : 't-drf'}>{t.pri ? PRI_TEXT[t.pri] : 'Reminder'}</Tag>
        <span className="s12 fnt b">
          {TRIGGER_NAME[t.code]}
        </span>
        {t.clearedAt && <Tag cls="t-grn">Cleared</Tag>}
      </div>
      <span className="h2" style={{ lineHeight: 1.3 }}>
        {ACTION_TITLE[t.code]?.(t) ?? t.title}
      </span>
      <div className="card" style={{ padding: 12, gap: 4 }}>
        <div className="row jb s13">
          <span className="mut">Fired</span>
          <span className="b">{fmtDateTime(t.firedAt)}</span>
        </div>
        <div className="row jb s13">
          <span className="mut">SLA</span>
          <span className={`b ${slaEnded && !t.clearedAt ? 'od' : ''}`}>
            {Math.max(1, Math.round((new Date(slaEnd(t)).getTime() - new Date(t.firedAt).getTime()) / 86_400_000))} days · {slaEnded ? 'ended' : 'ends'} {fmtDate(t.due)}
          </span>
        </div>
        {t.clearedAt && (
          <div className="row jb s13">
            <span className="mut">Cleared</span>
            <span className="b gd">{fmtDateTime(t.clearedAt)}</span>
          </div>
        )}
      </div>
      {t.pri && (
        <>
          <span className="grp">Who's been told</span>
          <div className="col" style={{ gap: 10 }}>
            {l.rungs.map((r, i) => (
              <div key={i} className="rung">
                <div className={`rn ${i < l.current || (i === l.current && i === 0) ? 'dn' : i === l.current ? 'cur' : ''}`}>{i + 1}</div>
                <div className="col f1" style={{ gap: 1 }}>
                  <span className={`b s13 ${r.reached ? '' : 'mut'}`}>{r.who}</span>
                  <span className={`s12 ${i === l.current && i > 0 ? 'td' : 'mut'}`}>
                    {fmtDate(r.at)}
                    {i > 0 ? `, ${fmtTime(r.at)}` : ''}
                    {!r.reached ? ' if not cleared' : i === l.current && i > 0 ? ' · now' : i === 1 ? ', when the SLA ended' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Banner tone="gry" icon="info">
            {t.pri === 'P1' ? 'P1 triggers climb twice as fast. ' : ''}If your mentor is away, it keeps climbing and the program team can reassign.
          </Banner>
        </>
      )}
      {!t.clearedAt && act && (
        <button type="button" className="btn pri" onClick={act.run}>
          {act.label}
        </button>
      )}
      {!t.clearedAt && <span className="s12 fnt">There's no Done button. This clears itself as soon as the app sees the action.</span>}
    </>
  )
  return (
    <Page mobile={mobile} desk={undefined} header={<SubBar title="Trigger" fallback="/inbox" />}>
      <div className={mobile ? 'scr' : 'col'} style={mobile ? undefined : { gap: 12 }}>
        {!mobile && (
          <a href="#/inbox" className="s13 mut" style={{ textDecoration: 'none' }}>
            ‹ Inbox
          </a>
        )}
        {body}
      </div>
    </Page>
  )
}

/** What pushes look like, and the rules (quiet hours, daily cap, digest). */
export function NotificationsPage({ mobile }: { mobile: boolean }) {
  const { state } = useStore()
  const open = openTriggers(state)
  const soon = open.find((t) => daysUntil(t.due) === 1)
  const w = weekSummary(state)
  const verified = state.triggers.find((t) => t.code === 'N11')
  const items = [
    { t: 'Daily digest', b: `${plural(open.length, 'open item')}${soon ? ` · 1 due tomorrow: ${soon.title.charAt(0).toLowerCase()}${soon.title.slice(1)}` : ''}` },
    verified ? { t: 'Payment verified', b: `${verified.done?.replace('Payment verified · ', '') ?? inr(10000)} counts toward your revenue.` } : null,
    { t: `Week ${state.week.streak + 1} of 4`, b: w.all ? 'All 5 done. 200 XP added.' : `Keep going. ${4 - state.week.streak === 1 ? 'One more full week' : `${4 - state.week.streak} more full weeks`} earns 500 XP.` },
  ].filter(Boolean) as { t: string; b: string }[]
  return (
    <Page mobile={mobile} header={<SubBar title="Notifications" fallback="/inbox" />}>
      <div className={mobile ? 'scr' : 'col'} style={mobile ? undefined : { gap: 12 }}>
        <div className="col" style={{ background: '#2A2826', color: '#fff', borderRadius: 18, padding: '26px 14px 16px', gap: 10 }}>
          <div className="col" style={{ alignItems: 'center', gap: 0, marginBottom: 10 }}>
            <span className="s13" style={{ color: '#C9C4BB' }}>
              {weekday(today())}, {fmtDate(today())}
            </span>
            <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.1 }}>9:00</span>
          </div>
          {items.map((x) => (
            <div key={x.t} style={{ background: 'rgba(255,255,255,.92)', color: '#111111', borderRadius: 16, padding: 12, display: 'flex', gap: 10 }}>
              <Logo size={30} />
              <div className="col f1" style={{ gap: 2 }}>
                <div className="row jb">
                  <span className="b s13">{x.t}</span>
                  <span className="s12 mut">now</span>
                </div>
                <span className="s13" style={{ lineHeight: 1.4 }}>
                  {x.b}
                </span>
              </div>
            </div>
          ))}
          <span className="s12" style={{ color: '#A19C94', textAlign: 'center', lineHeight: 1.5, marginTop: 6 }}>
            No pushes 21:00–08:00. At most 3 a day; the rest wait for the 9:00 digest.
          </span>
        </div>
        <Banner tone="gry" icon="info">
          Pushes come from the same triggers as your Inbox. {state.team.name} has {xpTotal(state).toLocaleString('en-IN')} XP this season.
        </Banner>
      </div>
    </Page>
  )
}
