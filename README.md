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

## Setup

**Deadlines:** set these in Settings → Deadlines. Defaults: AI by 14:00, German by 20:00, applications by 23:00.

**Telegram:** message @BotFather → `/newbot` → name it "StudyForce Bot" → copy the token into Settings. Send your bot any message, click **Find chat ID**, then enable "Send reminders to my phone".

**Gmail:** in Google Cloud Console, create a project, enable the Gmail API, configure the OAuth consent screen (add yourself as a test user), and create an OAuth client ID of type **Desktop app**. Paste the client ID and secret into Settings → Gmail and click **Connect**. Your browser opens for sign-in, and only read-only access is requested. The search query controls which sent emails count as applications. Gmail can confirm an email was sent, not that the company received it.

**Wallpaper:** works on Windows and macOS. On Linux it depends on your desktop environment. You can turn it off in Settings.

**Streak:** Day 1 starts when you check off your first topic.

## Curriculum data

`data/curriculum.js` is loaded on first run:

- **German:** 105 topics across a diagnostic plus three phases (A2→B1, B1→B2, B2→C1), each with Grammatik / Lesen / Hören / Schreiben / Sprechen sections.
- **AI course:** 190 topics in Sections 34–62. **These titles are placeholders.** The spec this was built from didn't include the real course list. Replace them in `data/curriculum.js` before first launch (or delete the database afterwards), or import your course PDF from the Import page.

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
