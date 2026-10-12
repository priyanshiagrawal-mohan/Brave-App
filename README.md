# BRAVE S2 · Student app (prototype)

React + Vite + TypeScript build of the Claude Design handoff `BRAVE S2 Student App.dc.html`
(steps 00–19). One responsive app: below 768px it renders the phone layouts, above it the desktop ones.

Live: https://brave-s2-app.vercel.app

## Run it

Needs [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (http://localhost:5174). `npm run build` makes a static site in `dist/`
that any static host (Vercel, Netlify, GitHub Pages) can serve.

Brand styling (BRAVE Identity: red, black, bone, amber; wordmark) lives in `src/brand.css`, layered over `src/styles.css`.

Everything runs on mock data (`src/data/seed.ts`), dated relative to today, and saved in `localStorage`.
Open with `?reset` to start fresh, or use **Me → Prototype controls**.

## Prototype rule

Any required step that isn't done shows what's missing on the first tap (`useGate` + `GateNote` in `src/ui.tsx`).
Tapping again goes ahead anyway, so a walkthrough never gets stuck.

## Screens

| Design step | Route |
| --- | --- |
| 00 Sign in, shell | `#/signin`; phone bottom nav Home · Ranks · **Pipeline** (raised, centre) · Inbox · Me, shown on every screen after sign-in; desktop nav Home · Leads · Projects · BRDs · Leaderboard |
| 01 Team and roles | `#/me` (invite, remove member, solo team) |
| 02 Unlock leads | `#/home` while locked, `#/unlocked` |
| 03 Workshop & library | `#/workshop`, `#/workshop/:n`, `#/workshop/:n/quiz`, `#/library` |
| 04 Brochure & website | `#/brochure`, `#/website` (real reachability check; a second failed check goes ahead) |
| 05 Home | `#/home` (weekly tasks, streak, needs action, themed week, inactive, grace window) |
| 06–10 Leads | `#/leads`, `#/leads/archive`, `#/leads/:id`; add lead, log interaction, won/lost, mute, recover are overlays |
| 11–13 Projects, payments, offerings | `#/projects`, `#/projects/new`, `#/projects/:id`, `/edit`, `/plan`, `#/offerings/:id` |
| 14 BRDs | `#/brds`, `#/brds/:id`, `#/brds/:id/fix` |
| 15 Inbox | `#/inbox`, `#/inbox/:id`, `#/notifications` |
| 16 Points & leaderboard | `#/ranks`, `#/ranks/points` |
| 17 Sessions & content | `#/me/sessions`, `#/content` |
| 18 Parent updates & testimonials | `#/parent`, `#/testimonials`, `#/testimonials/:projectId` |
| 19 System states | Prototype controls: offline, location denied, weak network, load error, grace window, access removed |

## Simulated server (`tick` in `src/data/derive.ts`)

- Payments with a read UTR verify ~6 s after submitting; typed UTRs after ~20 s (manual check).
- Submitted BRDs move to "Auto-review running" after ~5 s. Approve/Reject from the BRD's **Simulate** panel.
- Triggers clear themselves when the action is seen (no Done button). Escalation ladder is computed from the fire time.
- All 5 weekly tasks pay 200 XP once; 4 full weeks in a row add a 500 XP streak block.
- Items saved offline sync with their original time when you go back online.

## Not wired to a backend

- Sign-in, location (demo area "Ameerpet, Hyderabad"), duplicate checks against other teams
  (`OTHER_TEAM_CLIENTS` in `src/data/constants.ts`), XP rules and reviews are all local.
- UPI screenshots are read in the browser with tesseract.js (`src/lib/receipt.ts`); "Use a sample screenshot" skips OCR.
- "Download PDF" uses the browser's print dialog.
