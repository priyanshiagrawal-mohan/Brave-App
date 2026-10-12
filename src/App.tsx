import { useEffect } from 'react'
import { unlockStatus } from './data/derive'
import { BrdFixPage, BrdPage } from './pages/BrdDoc'
import { BrdsPage } from './pages/Brds'
import { HomePage, RemovedPage, SignInPage, UnlockedPage } from './pages/Home'
import { InboxPage, NotificationsPage, TriggerPage } from './pages/Inbox'
import { LeadActionsProvider } from './pages/LeadActions'
import { LeadDetailPage } from './pages/LeadDetail'
import { ArchivePage, LeadsPage } from './pages/Leads'
import { ContentPage, MePage, ParentPage, PrototypePage, SessionsPage, TestimonialPage, TestimonialsPage } from './pages/Me'
import { PlanPage, ProjectDetailPage } from './pages/ProjectDetail'
import { ProjectEditorPage } from './pages/ProjectEditor'
import { OfferingDetailPage, ProjectsPage } from './pages/Projects'
import { RanksPage } from './pages/Ranks'
import { BrochurePage, WebsitePage } from './pages/Unlock'
import { LibraryPage, ModulePage, QuizPage, WorkshopPage } from './pages/Workshop'
import { go, useRoute, type Route } from './router'
import { StoreProvider, useStore } from './store'
import { useIsMobile } from './ui'

function Routes() {
  const r = useRoute()
  const mobile = useIsMobile()
  const { state } = useStore()
  const u = unlockStatus(state)

  // Signed out: only the sign-in screen.
  useEffect(() => {
    if (!state.sys.signedIn && r.parts[0] !== 'signin') go('/signin', { replace: true })
    else if (state.sys.signedIn && r.parts[0] === 'signin') go('/home', { replace: true })
  }, [state.sys.signedIn, r.parts])

  // The moment the gate opens, show the celebration once.
  useEffect(() => {
    if (state.sys.signedIn && u.unlocked && !state.unlock.seenUnlocked && r.parts[0] !== 'unlocked') go('/unlocked')
  }, [u.unlocked, state.unlock.seenUnlocked, state.sys.signedIn, r.parts])

  if (!state.sys.signedIn) return <SignInPage />
  if (state.sys.removed) return <RemovedPage />
  return render(r, mobile)
}

function render(r: Route, mobile: boolean) {
  const [a, b, c] = r.parts
  switch (a) {
    case 'signin':
    case 'home':
    case 'unlock':
      return <HomePage mobile={mobile} />
    case 'unlocked':
      return <UnlockedPage />
    case 'brochure':
      return <BrochurePage mobile={mobile} />
    case 'website':
      return <WebsitePage mobile={mobile} />
    case 'workshop':
      if (b && c === 'quiz') return <QuizPage key={b} n={Number(b)} mobile={mobile} />
      if (b) return <ModulePage key={b} n={Number(b)} mobile={mobile} />
      return <WorkshopPage mobile={mobile} />
    case 'library':
      return <LibraryPage mobile={mobile} />
    case 'leads':
      if (b === 'archive') return <ArchivePage mobile={mobile} />
      if (b) return <LeadDetailPage key={mobile ? b : 'desk'} id={b} mobile={mobile} />
      return <LeadsPage mobile={mobile} />
    case 'projects':
      if (b === 'new') return <ProjectEditorPage key={'new' + (r.query.get('lead') ?? '')} mobile={mobile} leadId={r.query.get('lead') ?? undefined} />
      if (b && c === 'edit') return <ProjectEditorPage key={b} id={b} mobile={mobile} />
      if (b && c === 'plan') return <PlanPage key={b} id={b} mobile={mobile} />
      if (b) return <ProjectDetailPage key={b} id={b} mobile={mobile} />
      return <ProjectsPage mobile={mobile} view={r.query.get('view') === 'offerings' ? 'offerings' : 'projects'} />
    case 'offerings':
      return <OfferingDetailPage key={b} id={b} mobile={mobile} />
    case 'brds':
      if (b && c === 'fix') return <BrdFixPage key={b} id={b} mobile={mobile} />
      if (b) return <BrdPage key={b} id={b} mobile={mobile} />
      return <BrdsPage mobile={mobile} />
    case 'inbox':
      if (b) return <TriggerPage key={b} id={b} mobile={mobile} />
      return <InboxPage mobile={mobile} />
    case 'notifications':
      return <NotificationsPage mobile={mobile} />
    case 'ranks':
      return <RanksPage key={b ?? 'board'} mobile={mobile} tab={b === 'points' ? 'points' : 'campus'} />
    case 'me':
      if (b === 'sessions') return <SessionsPage mobile={mobile} />
      return <MePage mobile={mobile} />
    case 'content':
      return <ContentPage mobile={mobile} />
    case 'parent':
      return <ParentPage mobile={mobile} />
    case 'testimonials':
      if (b) return <TestimonialPage key={b} id={b} mobile={mobile} />
      return <TestimonialsPage mobile={mobile} />
    case 'prototype':
      return <PrototypePage mobile={mobile} />
    default:
      return <Redirect to="/home" />
  }
}

function Redirect({ to }: { to: string }) {
  useEffect(() => go(to, { replace: true }), [to])
  return null
}

export default function App() {
  return (
    <StoreProvider>
      <LeadActionsProvider>
        <Routes />
      </LeadActionsProvider>
    </StoreProvider>
  )
}
