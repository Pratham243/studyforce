# StudyForce

An always-on desktop accountability app for three daily tracks: an **AI course**, **German** (A2 → C1), and **job applications**. An owl pops up every 30 minutes with what's left, gets angrier as deadlines get close, and punishment escalates if you skip days.

Built with Electron, React (Vite), SQLite (sql.js, so there are no native modules to rebuild), and Recharts.

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev      # Vite dev server + Electron with hot reload
npm start        # production build, then launch
npm run dist     # package an installer with electron-builder (output in release/)
npm test         # planner / punishment / parser tests
```

Data is stored in `studyforce.sqlite` in Electron's user-data folder (`%APPDATA%/studyforce` on Windows, `~/Library/Application Support/studyforce` on macOS, `~/.config/studyforce` on Linux). Delete it to start over.

## What's in it

| Feature | Where |
| --- | --- |
| Live dashboard: today's progress across all tracks, deadline countdowns, streak, projected finish dates | Dashboard |
| Always-on-top desktop widget (drag it anywhere; double-click opens the dashboard) | Tray → Toggle desktop widget |
| Pace modes per track: Normal (5/day), Fast (8/day), Intensive (10/day). Finish dates update immediately | Pace switch on each track |
| Owl alerts every 30 min (15 min once a deadline passes), with tone that escalates | Popup, bottom-right |
| Loud siren with every reminder: a slow wail normally, a fast yelp once you're at Level 2+. Choose siren/soft/off, volume and length, and test it | Settings → General |
| Morning briefing at wake time: today's topics and estimated hours | Popup |
| Carry-forward: unfinished topics are added to tomorrow's count | Automatic |
| Gmail auto-detect: polls your sent folder and logs matching emails as applications | Settings → Gmail |
| Telegram reminders to your phone | Settings → Telegram |
| Public accountability: daily progress and "❌ Missed day" posts to a Telegram channel or Discord webhook | Settings → Public accountability |
| PDF import: parse a course PDF (or pasted outline) into sections/topics, choose a pace | Import PDF |
| Pomodoro with a study mode that also opens a lo-fi stream; hard topics suggest a focus block | Focus |
| Weekly review: best/worst day, average pace, completion rate, streak calendar, projected finishes | Weekly review (also opens automatically at the daily report time) |
| Milestone celebrations at 25/50/75/100%, plus section-complete and day-complete confetti | Automatic |
| Dark theme by default with a light toggle | Settings |

## Accountability levels

| Level | Trigger | What happens |
| --- | --- | --- |
| 1 · Gentle nudge | Normal day | Owl every 30 min; friendly, then more urgent as the deadline approaches |
| 2 · Annoying | A track's deadline passed with work left, **or** yesterday was only partly done (until your first check-off today) | Alerts every 15 min, angry owl, a translucent "FINISH YOUR TASKS" strip over the bottom 20% of the screen that hides on check-off and comes back after 5 minutes, Telegram nags |
| 3 · Shame | Yesterday was missed entirely | Dashboard red for 24 h, streak reset to 0, missed amount + 1 penalty topic added to today, shame wallpaper (takes 3 deliberate clicks to restore), public "❌ Missed day" post |
| 4 · Nuclear | 2+ fully missed days in a row | Everything in Level 3, plus an alarm when the app opens, a dashboard locked until you commit to a recovery (catch-up) plan, and a disappointed owl for a week |

When the app launches it checks yesterday right away, so Level 2/3 punishment shows immediately. Days the app wasn't open still count. Carry-forward is capped at twice your daily pace; anything bigger goes through the recovery plan.

## German track (A2 → C1)

German is tracked by **hours plus grammar topics**, in three phases:

| Phase | Topics | Min. hours | Unlock |
| --- | --- | --- | --- |
| 1 · A2 → B1 (Grammatik aktiv, ch. 49–80) | 32 | 150 | — |
| 2 · B1 → B2 | 19 | 225 | Pass the B1 mock exam |
| 3 · B2 → C1 | 13 | 250 | Pass the B2 mock exam |

- **Pace modes** are hours per day: Normal 2 h, Fast 3.5 h, Intensive 5 h. From Oct 2 they project C1 by Aug 11 2027, Mar 30 2027 and Feb 4 2027. The dashboard also shows a live projection from your actual daily average: "At 2.3 hrs/day → C1 by …".
- **Dashboard card:**
  - the current phase
  - phase hours and topics bars
  - a start/stop study timer, plus manual hour entry (a negative number corrects mistakes)
  - the daily practice checklist: grammar, vocabulary (SeedLang), reading/writing, listening/speaking
  - today's grammar topics, the projected C1 date and days remaining
  - a German streak
  - session notes
- **Daily score** = hours/target × 0.5 + checklist/4 × 0.25 + grammar done/grammar target × 0.25. The grammar target is the phase's remaining topics ÷ days until the phase's hours are reached at your pace. German is **30%** of the overall daily score; AI and applications are 35% each.
- **Roadmap** (click German in the sidebar or "Roadmap" on the card) is a vertical timeline:
  - the current topic is marked "You are here", and locked phases are greyed out and can't be ticked
  - each phase ends with its Goethe mock exam, which unlocks once every topic in the phase is done **and** its minimum hours are reached
  - enter a score from 0 to 100: 60+ passes and unlocks the next phase; a fail allows a retry after 7 more days with study hours logged
- **Session notes** are saved per day (`daily_logs.notes`) and listed in the Weekly review.
- **Hours across phases:** hours logged before you pass an exam count toward the phase you were in on that day. Phase hours are cached in `tracks.phase1_hours`…`phase3_hours`.
- **Carry-forward** doesn't apply to German; a missed German day still counts toward the punishment levels.

## Setup

**Deadlines:** set these in Settings → Deadlines. Defaults: AI by 14:00, German by 20:00, applications by 23:00.

**Telegram:** message @BotFather → `/newbot` → name it "StudyForce Bot" → copy the token into Settings. Send your bot any message, click **Find chat ID**, then enable "Send reminders to my phone".

**Gmail:** in Google Cloud Console, create a project, enable the Gmail API, configure the OAuth consent screen (add yourself as a test user), and create an OAuth client ID of type **Desktop app**. Paste the client ID and secret into Settings → Gmail and click **Connect**. Your browser opens for sign-in, and only read-only access is requested. The search query controls which sent emails count as applications. Gmail can confirm an email was sent, not that the company received it.

**Wallpaper:** works on Windows and macOS. On Linux it depends on your desktop environment. You can turn it off in Settings.

**Streak:** Day 1 starts when you check off your first topic.

## Curriculum data

`data/curriculum.js` is loaded on first run:

- **German:** Goethe-Zertifikat C1 track starting Oct 2, 2026: 64 grammar topics and 625 hours across three phases (see below).
- **AI course:** Apna College, Sections 34–62. That's 196 core topics, starting at AdaBoost. The four CSS sections (53, 54, 58, 59; 44 lessons) are marked optional. They can be checked off but never count toward quotas, progress or finish dates.

If you already ran an earlier version, seeded tracks with no progress are replaced with the new list automatically on next launch. A track you have already ticked topics in is left as-is; delete the database to start fresh.

Mark a topic's difficulty with a trailing `[HARD]` / `[MEDIUM]` / `[EASY]`; otherwise it inherits its section's.

## Project layout

```
electron/
  main.js            windows, tray, scheduler, IPC
  preload.js         window.sf bridge
  lib/               store (SQLite), planner, punishment, snapshot, PDF topic parser
  services/          gmail, telegram/discord, wallpaper
src/                 React renderer (dashboard, widget, alert, overlay, shame screen)
data/curriculum.js   seed topics
test/                node:test suites
```
