import { useEffect, useState } from 'react'
import { DateField } from '../Calendar'
import { activeLeads, firstName, memberWeek, offeringName, weekSummary, xpTotal } from '../data/derive'
import type { ContentItem, Member, Project, Scenario, Session } from '../data/types'
import { addDays, daysFromToday, daysUntil, fmtDate, fmtTime, plural, today, uid } from '../lib/format'
import { go } from '../router'
import { Page, PhoneTitle, SubBar } from '../Shell'
import { useStore } from '../store'
import { Avatar, Banner, Bar, Center, Chip, Confirm, Field, FilePick, GateNote, Icon, OverlayHead, Responsive, Seg, Tag, TextArea, TextInput, Toggle, useGate, useIsMobile } from '../ui'

// ---------- Team ----------

function MeHeader({ tab, mobile }: { tab: 'team' | 'sessions'; mobile: boolean }) {
  const { state } = useStore()
  return (
    <>
      {!mobile && (
        <div className="row jb">
          <div className="col" style={{ gap: 3 }}>
            <span className="h1">{state.team.name}</span>
            <span className="s13 mut">{state.team.campus} campus</span>
          </div>
        </div>
      )}
      <Seg
        value={tab}
        onChange={(v) => go(v === 'team' ? '/me' : '/me/sessions', { replace: true })}
        options={[
          { value: 'team', label: 'Team' },
          { value: 'sessions', label: 'Sessions' },
        ]}
      />
    </>
  )
}

function LinkRow({ icon, title, sub, right, to }: { icon: string; title: string; sub?: string; right?: React.ReactNode; to: string }) {
  return (
    <button type="button" className="card click" style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }} onClick={() => go(to)}>
      <Icon n={icon} className="mut" />
      <div className="col f1" style={{ gap: 1 }}>
        <span className="b s13">{title}</span>
        {sub && <span className="s12 mut">{sub}</span>}
      </div>
      {right}
      <Icon n="right" s="sm" className="fnt" />
    </button>
  )
}

export function MePage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const [invite, setInvite] = useState('')
  const [removing, setRemoving] = useState<Member | null>(null)
  const gate = useGate()
  const t = state.team
  const full = t.members.length >= 5
  const leader = t.members.find((m) => m.role === 'leader')
  const solo = t.members.length === 1
  const sendInvite = () =>
    gate.run(invite.trim() ? [] : ['NxtWave ID or email'], () => {
      if (full) return toast('Teams have at most 5 students', 'warn')
      const name = invite.includes('@') ? invite.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : invite.trim() || 'New member'
      mutate((d) => {
        d.team.invites.unshift({ id: uid('inv'), name, at: new Date().toISOString() })
      })
      setInvite('')
      gate.reset()
      toast(`Invite sent to ${name}`)
    })
  const inviteRow = (
    <>
      <span className="lbl">Invite a teammate</span>
      <div className="row">
        <TextInput boxStyle={{ flex: 1 }} bad={gate.tried && !invite.trim()} placeholder="NxtWave ID or email" value={invite} onChange={(e) => setInvite(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendInvite()} />
        <button type="button" className="btn pri" onClick={sendInvite}>
          Invite
        </button>
      </div>
      <GateNote tried={gate.tried} missing={invite.trim() ? [] : ['NxtWave ID or email']} />
    </>
  )
  return (
    <Page mobile={mobile} bn="me" header={<PhoneTitle title={t.name} right={<span className="s12 mut">{t.campus} campus</span>} />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        <MeHeader tab="team" mobile={mobile} />
        {solo && (
          <div className="card dark">
            <span className="b" style={{ fontSize: 16 }}>
              You're a team of 1
            </span>
            <span className="s13" style={{ color: '#C9C4BB', lineHeight: 1.5 }}>
              Teams can have up to 5 students. Weekly targets are per team, so teammates share the load.
            </span>
          </div>
        )}
        {solo && inviteRow}
        <div className="row jb">
          <span className="grp">
            Members · {t.members.length} of 5
          </span>
          {!solo && <span className="s12 mut">this week</span>}
        </div>
        {t.members.map((m) => {
          const w = memberWeek(state, m.name)
          return (
            <div key={m.id} className="row" style={{ gap: 10 }}>
              <Avatar name={m.name} />
              <div className="col f1" style={{ gap: 1 }}>
                <span className="b s13">
                  {m.name}
                  {m.you ? ' (you)' : ''}
                </span>
                <span className="s12 mut row" style={{ gap: 4 }}>
                  {m.role === 'leader' && <Icon n="crown" s="sm" style={{ color: '#111111' }} />}
                  {m.role === 'leader' ? 'Team leader' : 'Member'}
                </span>
              </div>
              {!solo && <span className={`s12 ${w.leads + w.logs ? 'mut' : 'td'}`} style={{ textAlign: 'right' }}>{w.leads + w.logs ? `${plural(w.leads, 'lead')} · ${plural(w.logs, 'log')}` : '0 this week'}</span>}
              {!m.you && m.role !== 'leader' && (
                <button type="button" className="btn gh sm" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}>
                  <Icon n="uminus" s="sm" className="fnt" />
                </button>
              )}
            </div>
          )
        })}
        {t.invites.length > 0 && (
          <>
            <span className="grp">Invites</span>
            {t.invites.map((iv) => (
              <div key={iv.id} className="row" style={{ gap: 10 }}>
                <Avatar name={iv.name} />
                <div className="col f1" style={{ gap: 1 }}>
                  <span className="b s13">{iv.name}</span>
                  <span className="s12 mut">Invite sent {fmtDate(iv.at)}</span>
                </div>
                <Tag cls="t-ter">Pending</Tag>
                <button type="button" className="btn gh sm" style={{ width: 30, height: 30, padding: 0 }} onClick={() => { mutate((d) => { d.team.invites = d.team.invites.filter((x) => x.id !== iv.id) }); toast('Invite cancelled', 'info') }} aria-label={`Cancel invite to ${iv.name}`}>
                  <Icon n="x" s="sm" className="fnt" />
                </button>
              </div>
            ))}
          </>
        )}
        {!solo &&
          (full ? (
            <button type="button" className="btn dis" onClick={() => toast('Teams have at most 5 students. Remove a member first.', 'info')}>
              <Icon n="uplus" />
              Add member · team is full
            </button>
          ) : (
            inviteRow
          ))}
        {solo && (
          <Banner tone="gry" icon="info">
            Your COS can also add students to your team.
          </Banner>
        )}
        <span className="grp">Support</span>
        <div className="card" style={{ padding: 12, gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <Avatar name={t.mentor} blue />
            <div className="col f1" style={{ gap: 1 }}>
              <span className="b s13">{t.mentor}</span>
              <span className="s12 mut">Mentor · Saturday reviews</span>
            </div>
            <a className="btn sm gh" href="https://wa.me/" target="_blank" rel="noreferrer" aria-label={`Message ${t.mentor}`}>
              <Icon n="msg" s="sm" />
            </a>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Avatar name={t.cos} blue />
            <div className="col f1" style={{ gap: 1 }}>
              <span className="b s13">{t.cos}</span>
              <span className="s12 mut">COS · {t.campus} campus</span>
            </div>
            <a className="btn sm gh" href="https://wa.me/" target="_blank" rel="noreferrer" aria-label={`Message ${t.cos}`}>
              <Icon n="msg" s="sm" />
            </a>
          </div>
        </div>
        <LinkRow icon="users" title="Parent updates" to="/parent" right={<Tag cls={state.parent.on ? 't-grn' : 't-drf'}>{state.parent.on ? 'On' : 'Off'}</Tag>} />
        <LinkRow icon="video" title="Content & reach" sub="Reels, videos and posts earn XP for reach" to="/content" />
        <LinkRow icon="star" title="Testimonials" sub="Video from clients after delivery" to="/testimonials" />
        <LinkRow icon="grad" title="Workshop & course library" to="/workshop" />
        <LinkRow icon="bell" title="Notifications" sub="Quiet 21:00–08:00 · at most 3 a day" to="/notifications" />
        <LinkRow icon="filter" title="Prototype controls" sub="Scenarios, offline, errors, edge cases" to="/prototype" />
        <button
          type="button"
          className="btn gh"
          onClick={() => {
            mutate((d) => {
              d.sys.signedIn = false
            })
          }}
        >
          <Icon n="login" />
          Sign out
        </button>
      </div>
      {removing && (
        <Confirm
          icon="uminus"
          iconBg="#FBE9E6"
          iconFg="#C0392B"
          title={`Remove ${firstName(removing.name)} from ${t.name}?`}
          body={`Points ${firstName(removing.name)} helped earn stay with the team. ${firstName(removing.name)}'s ${plural(activeLeads(state).filter((l) => l.addedBy === firstName(removing.name)).length, 'open lead')} move to ${leader ? firstName(leader.name) : 'the team leader'}, the team leader. ${firstName(removing.name)} loses access to the team's leads, projects and BRDs.`}
          confirm="Remove member"
          confirmCls="dng"
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            const fn = firstName(removing.name)
            mutate((d) => {
              d.team.members = d.team.members.filter((m) => m.id !== removing.id)
            })
            setRemoving(null)
            toast(`${fn} removed · points stay with ${t.name}`)
          }}
        />
      )}
    </Page>
  )
}

// ---------- Sessions ----------

function HostSheet({ onClose }: { onClose: () => void }) {
  const { mutate, toast } = useStore()
  const mobile = useIsMobile()
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(addDays(today(), 2))
  const [hm, setHm] = useState('18:00')
  const [about, setAbout] = useState('')
  const gate = useGate()
  const missing = [...(title.trim() ? [] : ['Topic']), ...(day ? [] : ['Date'])]
  const save = () =>
    gate.run(missing, () => {
      const at = new Date(`${day}T${hm}:00`).toISOString()
      mutate((d) => {
        d.sessions.unshift({ id: uid('ss'), title: title.trim() || 'Peer session', host: 'Tanvi Kumar', at, joining: 0, attendees: 0, confirmed: 0, about: about.trim() || undefined })
      })
      onClose()
      toast(`Session scheduled for ${fmtDate(day)} · your campus can join`)
    })
  return (
    <Responsive mobile={mobile} onClose={onClose} label="Host a session" width={480}>
      <OverlayHead title="Host a session" sub="Share how you solved a hurdle" onClose={onClose} />
      <Field label="Topic" req>
        <TextInput bad={gate.tried && !title.trim()} placeholder="e.g. How we got our first advance" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Field label="Date" req style={{ flex: 1 }}>
          <DateField title="Session date" value={day} onChange={setDay} min={today()} display={fmtDate} />
        </Field>
        <Field label="Time" style={{ flex: 1 }}>
          <div className="chips">
            {['17:00', '18:00', '19:00'].map((t) => (
              <Chip key={t} on={hm === t} onClick={() => setHm(t)}>
                {Number(t.slice(0, 2)) - 12} pm
              </Chip>
            ))}
          </div>
        </Field>
      </div>
      <Field label="What you'll cover" hint="optional">
        <TextArea className="s13" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="What you tried, what worked, what to avoid" />
      </Field>
      <span className="s12 fnt">Host and attendees earn XP only after attendees confirm in the app.</span>
      <GateNote tried={gate.tried} missing={missing} />
      <button type="button" className="btn pri" onClick={save}>
        Schedule session
      </button>
    </Responsive>
  )
}

export function SessionsPage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const [host, setHost] = useState(false)
  const [confirming, setConfirming] = useState<Session | null>(null)
  const me = 'Tanvi Kumar'
  const now = Date.now()
  const past = (s: Session) => new Date(s.at).getTime() < now
  const toConfirm = state.sessions.filter((s) => s.mine === 'pending' && past(s))
  const upcoming = state.sessions.filter((s) => !past(s)).sort((a, b) => a.at.localeCompare(b.at))
  const waiting = state.sessions.filter((s) => s.host === me && past(s) && s.confirmed < s.attendees)
  const done = state.sessions.filter((s) => past(s) && !toConfirm.includes(s) && !waiting.includes(s))
  const when = (s: Session) => `${daysUntil(s.at) === 0 ? 'Today' : daysUntil(s.at) === 1 ? 'Tomorrow' : fmtDate(s.at)}, ${fmtTime(s.at)}`
  return (
    <Page mobile={mobile} bn="me" header={<PhoneTitle title="Peer sessions" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        <MeHeader tab="sessions" mobile={mobile} />
        <button type="button" className="btn pri" onClick={() => setHost(true)}>
          <Icon n="plus" />
          Host a session
        </button>
        {toConfirm.length > 0 && (
          <>
            <span className="grp" style={{ color: '#111111' }}>
              Confirm you attended · {toConfirm.length}
            </span>
            {toConfirm.map((s) => (
              <div key={s.id} className="card" style={{ padding: 12, gap: 6, borderColor: '#C9DAF3' }}>
                <div className="row jb">
                  <span className="b s13">{s.title}</span>
                  <Tag cls="t-bro">Confirm</Tag>
                </div>
                <span className="s12 mut">
                  {firstName(s.host)} · {fmtDate(s.at)}, {fmtTime(s.at)}
                </span>
                <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirming(s)}>
                  Did you attend?
                </button>
              </div>
            ))}
          </>
        )}
        <span className="grp">Upcoming</span>
        {upcoming.length === 0 && <span className="s13 mut">No sessions scheduled. Host one about something your team figured out.</span>}
        {upcoming.map((s) => {
          const mine = s.host === me
          return (
            <div key={s.id} className="card" style={{ padding: 12, gap: 6 }}>
              <div className="row jb">
                <span className="b s13">{s.title}</span>
                <Tag cls={s.mine === 'yes' ? 't-grn' : 't-bro'}>{s.mine === 'yes' ? "You're going" : 'Scheduled'}</Tag>
              </div>
              <span className="s12 mut">
                {mine ? 'You' : firstName(s.host)} · {when(s)} · {s.joining} joining
              </span>
              {s.about && <span className="s12 mut">{s.about}</span>}
              {!mine && (
                <button
                  type="button"
                  className={`btn sm ${s.mine === 'yes' ? 'gh' : ''}`}
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    mutate((d) => {
                      const x = d.sessions.find((y) => y.id === s.id)!
                      x.mine = x.mine === 'yes' ? undefined : 'yes'
                      x.joining += x.mine === 'yes' ? 1 : -1
                    })
                    toast(s.mine === 'yes' ? 'You left the session' : `You're going · reminder an hour before`)
                  }}
                >
                  {s.mine === 'yes' ? 'Not going' : 'Join'}
                </button>
              )}
            </div>
          )
        })}
        {waiting.length > 0 && (
          <span className="grp" style={{ color: '#111111' }}>
            Waiting for attendees
          </span>
        )}
        {waiting.map((s) => (
          <div key={s.id} className="card" style={{ padding: 12, gap: 6 }}>
            <div className="row jb">
              <span className="b s13">{s.title}</span>
              <Tag cls="t-ter">
                {s.confirmed} of {s.attendees} confirmed
              </Tag>
            </div>
            <span className="s12 mut">You hosted · {fmtDate(s.at)}</span>
            <Bar pct={(s.confirmed / s.attendees) * 100} />
            <span className="s12 mut">XP pays out to you and each attendee as they confirm.</span>
            <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => toast(`Reminder sent to ${plural(s.attendees - s.confirmed, 'attendee')}`)}>
              <Icon n="bell" s="sm" />
              Remind attendees
            </button>
          </div>
        ))}
        <span className="grp">Done</span>
        {done.map((s) => (
          <div key={s.id} className="card" style={{ padding: 12, gap: 6 }}>
            <div className="row jb">
              <span className="b s13">{s.title}</span>
              <Tag cls={s.mine === 'no' ? 't-drf' : 't-grn'}>{s.mine === 'no' ? "Didn't attend" : `${s.confirmed} attended`}</Tag>
            </div>
            <span className="s12 mut">
              {s.host === me ? 'You' : firstName(s.host)} · {fmtDate(s.at)}
            </span>
          </div>
        ))}
        {done.length === 0 && <span className="s13 mut">Past sessions show up here.</span>}
      </div>
      {host && <HostSheet onClose={() => setHost(false)} />}
      {confirming && (
        <Confirm
          icon="users"
          iconBg="#EAE5DC"
          iconFg="#111111"
          title={`Did you attend ${firstName(confirming.host)}'s session?`}
          body={`${confirming.title} · ${fmtDate(confirming.at)}, ${fmtTime(confirming.at)}`}
          confirm="Yes, I attended"
          confirmIcon="check"
          confirmCls="pri"
          cancel="No, I didn't"
          onConfirm={() => {
            mutate((d) => {
              const x = d.sessions.find((y) => y.id === confirming.id)!
              x.mine = 'yes'
              x.confirmed += 1
              d.points.unshift({ id: uid('pt'), at: new Date().toISOString(), xp: 25, title: 'Attended a peer session', sub: `${firstName(confirming.host)}'s session · ${confirming.title}` })
            })
            setConfirming(null)
            toast(`Confirmed · +25 XP for you and XP for ${firstName(confirming.host)}`)
          }}
          onClose={() => {
            mutate((d) => {
              d.sessions.find((y) => y.id === confirming.id)!.mine = 'no'
            })
            setConfirming(null)
            toast('Noted · no XP for this session', 'info')
          }}
          foot={<span className="s12 fnt" style={{ lineHeight: 1.5 }}>Host and attendees earn XP only after attendees confirm.</span>}
        />
      )}
    </Page>
  )
}

// ---------- Content & reach ----------

const KIND_LABEL: Record<ContentItem['kind'], string> = { recording: 'Session recording · YouTube', reel: 'Instagram reel', post: 'Instagram post' }

function SubmitContent({ onClose }: { onClose: () => void }) {
  const { mutate, toast } = useStore()
  const mobile = useIsMobile()
  const [kind, setKind] = useState<ContentItem['kind']>('reel')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const gate = useGate()
  const ok = /^https?:\/\/\S+\.\S+/.test(url.trim()) || /^\S+\.\S+\/\S+/.test(url.trim())
  const missing = ok ? [] : ['A link to the reel, video or post']
  const save = () =>
    gate.run(missing, () => {
      mutate((d) => {
        d.content.unshift({ id: uid('ct'), kind, title: title.trim() || 'Untitled', url: url.trim(), submittedAt: new Date().toISOString(), status: 'pending' })
      })
      onClose()
      toast('Submitted · reach is read once a day')
    })
  return (
    <Responsive mobile={mobile} onClose={onClose} label="Submit content" width={480}>
      <OverlayHead title="Submit a reel, video or post" sub="XP for reach, read from the link" onClose={onClose} />
      <Seg
        value={kind}
        onChange={setKind}
        options={[
          { value: 'reel', label: 'Reel' },
          { value: 'recording', label: 'Video' },
          { value: 'post', label: 'Post' },
        ]}
      />
      <Field label="Link" req>
        <TextInput bad={gate.tried && !ok} placeholder="https://instagram.com/reel/…" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoCapitalize="off" autoFocus />
      </Field>
      <Field label="What it's about">
        <TextInput placeholder="e.g. How we pitched a sweet shop" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <GateNote tried={gate.tried} missing={missing} />
      <button type="button" className="btn pri" onClick={save}>
        Submit
      </button>
    </Responsive>
  )
}

export function ContentPage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const [open, setOpen] = useState(false)
  return (
    <Page mobile={mobile} header={<SubBar title="Content" fallback="/me" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Content & reach</span>}
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          <Icon n="up" />
          Submit a reel, video or post
        </button>
        {state.content.length === 0 && <span className="s13 mut">Recordings, reels and posts earn XP for reach. Submit a link to start.</span>}
        {state.content.map((c) => (
          <div key={c.id} className="card" style={{ padding: 12, gap: 6, borderColor: c.status === 'private' ? '#F0C8C2' : undefined }}>
            <div className="row jb">
              <span className="b s13">{KIND_LABEL[c.kind]}</span>
              {c.status === 'live' && <Tag cls="t-grn">{c.views?.toLocaleString('en-IN')} views</Tag>}
              {c.status === 'pending' && <Tag cls="t-ter">Reach pending</Tag>}
              {c.status === 'private' && <Tag cls="t-red">Can't read reach</Tag>}
              {c.status === 'review' && <Tag cls="t-ter">In admin review</Tag>}
            </div>
            <span className="s12 mut">
              {c.title} · {c.status === 'live' ? 'updated today' : `submitted ${fmtDate(c.submittedAt)}`}
              {c.status === 'pending' ? ' · refreshes daily' : ''}
            </span>
            {c.status === 'private' && (
              <>
                <span className="s12 mut" style={{ lineHeight: 1.45 }}>
                  The account is private. Upload an insights screenshot; an admin reviews it.
                </span>
                <FilePick
                  className="btn sm"
                  style={{ alignSelf: 'flex-start' }}
                  onPick={() => {
                    mutate((d) => {
                      d.content.find((x) => x.id === c.id)!.status = 'review'
                    })
                    toast('Screenshot sent · an admin reviews it')
                  }}
                >
                  <Icon n="up" s="sm" />
                  Upload screenshot
                </FilePick>
              </>
            )}
            {c.status === 'pending' && (
              <button
                type="button"
                className="lnk s12"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  const views = 300 + Math.round(Math.random() * 900)
                  mutate((d) => {
                    const x = d.content.find((y) => y.id === c.id)!
                    x.status = 'live'
                    x.views = views
                    d.points.unshift({ id: uid('pt'), at: new Date().toISOString(), xp: Math.round(views / 40), title: 'Reach', sub: `${KIND_LABEL[c.kind]} · ${views.toLocaleString('en-IN')} views` })
                  })
                  toast(`Reach read · ${views.toLocaleString('en-IN')} views · +${Math.round(views / 40)} XP`)
                }}
              >
                <Icon n="refresh" s="sm" />
                Refresh now (prototype)
              </button>
            )}
          </div>
        ))}
      </div>
      {open && <SubmitContent onClose={() => setOpen(false)} />}
    </Page>
  )
}

// ---------- Parent updates ----------

export function ParentPage({ mobile }: { mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const p = state.parent
  const [name, setName] = useState(p.name)
  const [phone, setPhone] = useState(p.phone)
  const [asking, setAsking] = useState(false)
  const gate = useGate()
  const w = weekSummary(state)
  const approved = state.projects.filter((x) => x.brd.approved > 0).length
  useEffect(() => {
    if (!asking) return
    const t = window.setTimeout(() => {
      mutate((d) => {
        d.parent = { ...d.parent, on: true, consentAt: new Date().toISOString(), stoppedAt: undefined }
      })
      setAsking(false)
      toast(`${name.split(' ')[0] || 'Your parent'} agreed · updates start this Sunday`)
    }, 2500)
    return () => window.clearTimeout(t)
  }, [asking, mutate, toast, name])
  const missing = [...(name.trim() ? [] : ["Parent's name"]), ...(/^\d{10}$/.test(phone.replace(/\D/g, '')) ? [] : ['WhatsApp number'])]
  const turnOn = () =>
    gate.run(missing, () => {
      mutate((d) => {
        d.parent.name = name.trim()
        d.parent.phone = phone.replace(/\D/g, '')
      })
      setAsking(true)
      toast('Consent request sent on WhatsApp', 'info')
    })
  const turnOff = () => {
    mutate((d) => {
      d.parent = { ...d.parent, on: false, stoppedAt: new Date().toISOString() }
    })
    toast(`Updates stopped · nothing more goes to ${p.name}`)
  }
  return (
    <Page mobile={mobile} header={<SubBar title="Parent updates" fallback="/me" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Parent updates</span>}
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          <div className="col f1" style={{ gap: 2 }}>
            <span className="b">Weekly update to my parent</span>
            <span className="s12 mut">{p.on ? 'Every Sunday on WhatsApp' : asking ? 'Waiting for your parent to agree…' : 'Off'}</span>
          </div>
          <Toggle on={p.on || asking} onChange={(v) => (v ? turnOn() : p.on ? turnOff() : setAsking(false))} label="Weekly update to my parent" />
        </div>
        {!p.on && p.stoppedAt && !asking && (
          <Banner tone="gry" icon="mute">
            Updates stopped on {fmtDate(p.stoppedAt)}. Nothing more is sent to {p.name}.
          </Banner>
        )}
        {(p.on || !p.stoppedAt || asking) && (
          <>
            <Field label="Parent's name">
              <TextInput bad={gate.tried && !name.trim()} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunita Kumar" locked={p.on} />
            </Field>
            <Field label="WhatsApp number">
              <div className="row">
                <div className="in" style={{ width: 64 }}>
                  +91
                </div>
                <TextInput boxStyle={{ flex: 1 }} bad={gate.tried && missing.includes('WhatsApp number')} inputMode="numeric" value={phone.replace(/(\d{5})(\d{5})/, '$1 $2')} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} locked={p.on} />
              </div>
            </Field>
            <GateNote tried={gate.tried} missing={missing} again="Tap the switch again to continue anyway." />
          </>
        )}
        {p.on && p.consentAt && (
          <span className="s12 gd row" style={{ gap: 5 }}>
            <Icon n="shield" s="sm" />
            Consent recorded {fmtDate(p.consentAt)}
          </span>
        )}
        {p.on && (
          <>
            <span className="grp">What they get</span>
            <div className="card" style={{ background: '#EAE5DC', borderColor: '#CFC7BA', padding: 12 }}>
              <span className="s13" style={{ lineHeight: 1.5 }}>
                {state.me}'s BRAVE week: {w.done === 5 ? 'all 5 tasks done' : `${w.done} of 5 tasks done`}, {state.team.name} is #{(state.others.filter((o) => o.campus === state.team.campus && o.xp > xpTotal(state)).length + 1)} on campus, {plural(approved, 'BRD')} approved.
              </span>
            </div>
            <span className="s12 fnt">Read only. Parents never sign in.</span>
          </>
        )}
        {!p.on && !asking && <span className="s13 mut" style={{ lineHeight: 1.5 }}>You can turn this on again anytime. Your parent will need to agree again.</span>}
      </div>
    </Page>
  )
}

// ---------- Testimonials ----------

export function TestimonialsPage({ mobile }: { mobile: boolean }) {
  const { state } = useStore()
  const delivered = state.projects.filter((p) => p.deliveredAt)
  const clients = new Set(delivered.map((p) => p.client.business))
  const got = new Set(delivered.filter((p) => p.testimonial?.status === 'received').map((p) => p.client.business))
  const pct = clients.size ? (got.size / clients.size) * 100 : 0
  return (
    <Page mobile={mobile} header={<SubBar title="Testimonials" fallback="/me" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Testimonials</span>}
        <div className="card" style={{ gap: 8 }}>
          <div className="row jb s13">
            <span className="b">
              {got.size} of {plural(clients.size, 'client')} served
            </span>
            <span className="mut">Season target 80%</span>
          </div>
          <Bar pct={pct} g />
        </div>
        {delivered.length === 0 && <span className="s13 mut">After you deliver a project, ask the client for a short video here.</span>}
        {delivered.map((p) => {
          const t = p.testimonial
          const tag = !t ? { text: 'Not asked', cls: 't-drf' } : t.status === 'received' ? { text: 'Received', cls: 't-grn' } : t.status === 'declined' ? { text: 'Declined', cls: 't-drf' } : { text: `Due ${fmtDate(t.due)}`, cls: 't-ter' }
          return (
            <button key={p.id} type="button" className="card click" style={{ padding: 12, gap: 4 }} onClick={() => go(`/testimonials/${p.id}`)}>
              <div className="row jb">
                <span className="b s13">{p.client.business}</span>
                <Tag cls={tag.cls}>{tag.text}</Tag>
              </div>
              <span className="s12 mut">
                {offeringName(state, p)} · delivered {fmtDate(p.deliveredAt!)}
              </span>
            </button>
          )
        })}
      </div>
    </Page>
  )
}

export function TestimonialPage({ id, mobile }: { id: string; mobile: boolean }) {
  const { state, mutate, toast } = useStore()
  const p = state.projects.find((x) => x.id === id) as Project | undefined
  const [declining, setDeclining] = useState(false)
  const [consent, setConsent] = useState<{ name: string } | null>(null)
  if (!p) return <Center icon="star" title="Project not found" />
  const t = p.testimonial
  const owner = p.client.owner ?? p.client.business
  const verified = p.payments.filter((x) => x.status === 'verified').reduce((a, x) => a + x.amount, 0)
  const set = (fn: (pp: Project) => void) =>
    mutate((d) => {
      fn(d.projects.find((x) => x.id === p.id)!)
    })
  const header = <SubBar title="Testimonial" fallback="/testimonials" right={t?.status === 'received' ? <Tag cls="t-grn">Received</Tag> : t?.status === 'declined' ? <Tag cls="t-drf">Declined</Tag> : undefined} />
  if (t?.status === 'received') {
    return (
      <Page mobile={mobile} header={header}>
        <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
          <button type="button" className="player" onClick={() => toast('Playing the testimonial', 'info')} aria-label="Play testimonial">
            <span className="col" style={{ alignItems: 'center', gap: 6 }}>
              <Icon n="play" s="xl" style={{ color: '#fff' }} />
              <span style={{ font: '500 11px ui-monospace, Menlo, monospace' }}>{t.video?.name ?? 'video'} · 48 sec</span>
            </span>
          </button>
          <div className="col" style={{ gap: 2 }}>
            <span className="h2">Testimonial received, well done</span>
            <span className="s13 mut">
              {owner} · {p.client.business} · {fmtDate(t.receivedAt!)}
            </span>
          </div>
          <span className="s12 gd row" style={{ gap: 5 }}>
            <Icon n="shield" s="sm" />
            Client consent recorded
          </span>
          <span className="s13 mut">Your mentor has been told.</span>
          <button type="button" className="btn" onClick={() => toast('Share sheet opens on the phone', 'info')}>
            <Icon n="share" />
            Share
          </button>
        </div>
      </Page>
    )
  }
  return (
    <Page mobile={mobile} header={header}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        <div className="card" style={{ padding: 14, gap: 4 }}>
          <span className="b" style={{ fontSize: 15 }}>
            {p.client.business} · {owner}
          </span>
          <span className="s12 mut">
            {offeringName(state, p)}
            {p.deliveredAt ? ` · delivered ${fmtDate(p.deliveredAt)}` : ''} · {verified.toLocaleString('en-IN') && `₹${verified.toLocaleString('en-IN')}`} verified
          </span>
        </div>
        <span className="s13 mut" style={{ lineHeight: 1.5 }}>
          Record a short video of {owner} saying what changed for the business, then upload it here.
          {t?.status === 'requested' && t.due ? (
            <>
              {' '}
              <b className="td">Due by {fmtDate(t.due)}.</b>
            </>
          ) : null}
        </span>
        {t?.status === 'declined' && (
          <Banner tone="gry" icon="mute">
            Marked declined on {fmtDate(t.declinedAt!)}. You can still upload a video if {owner} changes their mind.
          </Banner>
        )}
        <FilePick className="btn pri" accept="video/*" onPick={(f) => setConsent({ name: f[0].name })}>
          <Icon n="up" />
          Upload testimonial video
        </FilePick>
        {t?.status !== 'declined' && (
          <button type="button" className="btn gh" style={{ color: '#C0392B' }} onClick={() => setDeclining(true)}>
            Client declined
          </button>
        )}
      </div>
      {declining && (
        <Confirm
          title="Mark as declined?"
          body={`${owner} doesn't want to give a video. Testimonial reminders stop for this client.`}
          confirm="Mark declined"
          confirmCls="drk"
          onClose={() => setDeclining(false)}
          onConfirm={() => {
            set((pp) => {
              pp.testimonial = { ...pp.testimonial!, status: 'declined', declinedAt: new Date().toISOString() }
            })
            setDeclining(false)
            toast('Marked declined · reminders stopped')
          }}
        />
      )}
      {consent && (
        <Confirm
          icon="shield"
          iconBg="#EAE5DC"
          iconFg="#111111"
          title={`Did ${owner} agree to share this video?`}
          body="Consent is recorded before anything is shared with your mentor or the BRAVE team."
          confirm="Yes, consent given"
          confirmCls="pri"
          confirmIcon="check"
          cancel="Not yet"
          onClose={() => setConsent(null)}
          onConfirm={() => {
            set((pp) => {
              pp.testimonial = { requestedAt: new Date().toISOString(), due: daysFromToday(0), ...pp.testimonial, status: 'received', receivedAt: new Date().toISOString(), video: { id: uid('f'), name: consent.name, label: 'video' } }
            })
            setConsent(null)
            toast('Testimonial received · your mentor has been told')
          }}
        />
      )}
    </Page>
  )
}

// ---------- Prototype controls ----------

export function PrototypePage({ mobile }: { mobile: boolean }) {
  const { state, mutate, reset, toast } = useStore()
  const sys = state.sys
  const flip = (k: keyof typeof sys, label: string) => (v: boolean) => {
    mutate((d) => {
      ;(d.sys as unknown as Record<string, boolean>)[k] = v
    })
    toast(`${label} ${v ? 'on' : 'off'}`, 'info')
  }
  const scenarios: [Scenario, string, string][] = [
    ['mid', 'Mid-season', `Week 4, 24 active leads, 10 projects, BRDs in every state`],
    ['new', 'New team, leads locked', 'Brochure done, website missing, cutoff in 11 days'],
    ['cutoff', 'Missed the cutoff', 'Auto-locked, COS asked for an exception'],
    ['solo', 'Solo team', 'Mid-season data with a team of 1 and a pending invite'],
  ]
  const toggles: [keyof typeof sys, string, string][] = [
    ['online', 'Online', 'Off = offline: logs, leads, drafts and payments save on this device and sync later'],
    ['locationDenied', 'Location permission denied', 'Logs and leads save as “no location” and count after a review'],
    ['weakNetwork', 'Weak network', 'Workshop video drops to 240p'],
    ['failNextLoad', 'Next list load fails', 'Leads, Projects or BRDs show an error; Try again works'],
    ['grace', 'Server outage grace window', 'Home shows the extended week deadline'],
    ['inactive', 'Team inactive 2 weeks', 'Home shows the mentor alert and the easiest way back'],
    ['reviewSim', 'Reviewer simulator on BRDs', 'Shows Approve / Reject on submitted BRDs so you can play the reviewer'],
  ]
  return (
    <Page mobile={mobile} header={<SubBar title="Prototype controls" fallback="/me" />}>
      <div className={mobile ? 'scr' : 'col'} style={{ gap: 12 }}>
        {!mobile && <span className="h1">Prototype controls</span>}
        <Banner tone="amb" icon="info">
          Not part of the student app. Use these to walk through the edge cases in the design. Data is saved in this browser.
        </Banner>
        <span className="grp">Scenario</span>
        {scenarios.map(([k, t, s]) => (
          <button
            key={k}
            type="button"
            className={`opt ${state.scenario === k ? 'on' : ''}`}
            onClick={() => {
              reset(k)
              toast(`Scenario: ${t}`, 'info')
              go('/home')
            }}
          >
            <div className="rad" />
            <div className="col f1" style={{ gap: 1 }}>
              <span className="b s13">{t}</span>
              <span className="s12 mut">{s}</span>
            </div>
          </button>
        ))}
        <span className="grp">Conditions</span>
        <div className="proto">
          {toggles.map(([k, t, s]) => (
            <div key={k} className="prow">
              <div className="col f1" style={{ gap: 1 }}>
                <span className="b s13">{t}</span>
                <span className="s12 mut">{s}</span>
              </div>
              <Toggle on={!!sys[k]} onChange={flip(k, t)} label={t} />
            </div>
          ))}
          <div className="prow">
            <div className="col f1" style={{ gap: 1 }}>
              <span className="b s13">Lead Rush themed week</span>
              <span className="s12 mut">Bonus XP card on Home</span>
            </div>
            <Toggle on={!!state.week.themed} onChange={(v) => mutate((d) => { d.week.themed = v })} label="Lead Rush" />
          </div>
        </div>
        <span className="grp">Actions</span>
        <div className="col" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={() => { mutate((d) => { d.week.forceDone = true }); go('/home') }} disabled={state.week.paidWeek === 4}>
            <Icon n="flame" />
            Complete this week's tasks
          </button>
          <button type="button" className="btn" onClick={() => mutate((d) => { d.sys.removed = true })}>
            <Icon n="uminus" />
            Remove me from the team
          </button>
          <button type="button" className="btn gh" onClick={() => { reset(state.scenario); toast('Demo data reset', 'info'); go('/home') }}>
            <Icon n="redo" />
            Reset demo data
          </button>
        </div>
        <span className="grp">Try these</span>
        <div className="card s13" style={{ gap: 6, lineHeight: 1.5 }}>
          <span>
            <b>Duplicate in your team:</b> add a lead with phone 98110 42317.
          </span>
          <span>
            <b>Another team has this client:</b> add a lead with phone 98480 12345.
          </span>
          <span>
            <b>Backdated lead:</b> pick a first-meeting date before today.
          </span>
          <span>
            <b>Burst of identical logs:</b> log the same note 3 times on one lead within 2 minutes.
          </span>
          <span>
            <b>Duplicate UTR:</b> log a payment with UTR 4281 9930 1127.
          </span>
          <span>
            <b>BRD decisions:</b> open a submitted BRD and use Simulate.
          </span>
          <span className="mut">
            Any required step you skip shows what's missing first. Tap again and it goes ahead, so the walkthrough never gets stuck. Today is {fmtDate(today())}; demo dates move with it.
          </span>
        </div>
      </div>
    </Page>
  )
}

