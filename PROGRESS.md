# Progress

## Stages

| Stage | Status | Tag | Notes |
|---|---|---|---|
| 0 Foundation | done | `stage-0` | scaffold, SQLite layer, migrations, snapshots, export/import, shell, CI APK |
| 1 Capture, tasks, Today | done | `stage-1` | quick capture, triage, tasks, recurrence, focus, notifications, wins |
| 2 Brain fitness, daily log | done | `stage-2` | check-in card (mood, sleep, meditation timer, stretch), habits with x-of-7 and heat map |
| 3 Personal life | done | `stage-3` | lists, people and birthdays, date nights, trips with flight price log, life admin |
| 4 Chess | done | `stage-4` | calendar feeds cached offline, students and lesson plans, repertoire tree with review queue, tournaments, league |
| 5 Banjo, snooker | done | `stage-5` | practice timer and sessions, goals, sheet music library with keep-awake viewer; breaks, routines with stats, league |
| 6 Alcohol, caffeine, medication | | | |
| 7 Money | | | |
| 8 Work, side projects | | | |
| 9 Weekly review, focus, insights | | | |
| 10 Iron Log merge | | | |
| 11 Sync (only if asked) | | | |

## Stage 0: what was built

- Vite 8 / React 19 / TypeScript 5.9 scaffold, ESLint 10 with the 400-line cap, Vitest 5.
- `SqlDriver` interface with two drivers: `@capacitor-community/sqlite` on Android, sql.js in the desktop browser (persisted to IndexedDB) and in tests.
- Migration runner: `schema_migrations` with checksums, one transaction per migration, `PRAGMA user_version` mirrored, contiguity check, snapshot hook before upgrades.
- Migration 0001: `settings`, `people`, `gift_ideas`, `items`, `log_entries`, `files`.
- Repositories for all six tables. Table-change bus + `useQuery` hook.
- Export/import: own JSON envelope, schema-agnostic dump, replace-all import that replays the file's schema version then migrates forward, foreign-key check, in-memory rollback. Golden export per schema version (`src/test/golden`).
- Snapshots before migration and import, plus manual; listed and restorable in Settings; last 10 kept.
- Shell: five tabs (Today, Inbox, Modules tray, Insights placeholder, Settings), quick-capture FAB slot (hidden until Stage 1 registers a handler), dark tokens with light override, safe-area padding.
- Settings: Export (public Documents folder, Share), Import (file chooser, confirm sheet with row counts), snapshots, notification toggles (stored only), theme, version/schema.
- Module registry (`ModuleDef`, static list) and Today collector (data cards, priority sort, cap, failure-tolerant).
- Android project committed with a fixed `appId`, committed debug keystore, `versionCode` from git commit count, `USE_EXACT_ALARM`.
- CI: check job on every push; APK job on main and stage tags with GitHub Release upload.

Deferred from Stage 0: nothing in scope. On-device checks not possible from this environment (see checklist below).

## Stage 1: what was built

- Quick capture: FAB on every screen opens a one-field sheet; Enter saves to the inbox; toast confirms.
- Migration 0002: `items` gains `waiting_person_id`, `chase_date`, `focus_date`, `series_id`, `recur_from`.
- Item sheet (create/edit/triage): status chips (Inbox, To-do, Waiting with person + chase date), module, due date with quick chips, due time, reminder time, priority, recurrence (daily, weekly, monthly, yearly, every N days; from due date or from completion), notes, Done, Drop.
- Recurrence engine (`src/core/recurrence`): RRULE subset parser/formatter, next occurrence with month-end clamping, missed occurrences skipped.
- Completion: one tap marks done with an undo toast; recurring items spawn the next occurrence in the same series (wins keep every instance).
- Inbox screen segments: Inbox, To-do, Waiting, Wins (done items by day inside week headers).
- Today: Focus (pick up to five), Overdue, Due today, Chase (waiting items whose chase date arrived), calendar placeholder, module cards.
- Notifications: pure planner (timed reminders in a 14-day window, morning/evening digests as next occurrence with live counts), pure reconcile diff, sync on boot/foreground/background and after item or settings writes, permission-gated. Channels `timed` and `digest`. Tap opens the relevant screen.
- Golden export v2.

Deferred from Stage 1: swipe gestures for triage (tap-based actions instead, per the spec's "swipe or tap").

## Stage 2: what was built

- First module: `brain` (tray tile "Brain", purple accent). Registry gains `panels`: module-owned interactive Today cards rendered inside the module's accent scope.
- Check-in panel on Today: mood 1-5 (one tap, optional note), sleep (bed time, wake time, quality; hours computed, wraps midnight), meditation (Done logs the last duration; Timer sheet counts down and logs elapsed minutes), stretch toggle, habit ticks with "x of 7" pills.
- Migration 0003: `habits` (name, target per week, sort order, archived). Everything else is `log_entries` rows with module `brain`: `mood` (score), `sleep` (hours, payload bed/wake/quality), `meditation` (min), `stretch`, `habit` (entity `brain.habit`).
- Consistency primitive (`src/core/consistency`): distinct days with the day-start rule, "x of last N days", proportional weekly target, 12-week heat map. No streaks anywhere.
- Brain screen: habits list with consistency pills, add habit (name + target/week), last-14-days history table. Habit screen: 7-day and 28-day counts, heat map, rename, target, archive.
- One-per-day types (mood, sleep, stretch) upsert today's entry; meditation entries accumulate.
- Golden export v3.

Deferred from Stage 2: nothing in scope.

## Stage 3: what was built

- Module `life` (tray tile "Life", green accent) with a hub screen: Lists, People, Dates, Trips, Admin.
- Lists: house, garden, buy, general as views over `items` (module `life`, entity `life.list`). Buy items carry a price estimate and link (`buy_details`); the buy list shows its total.
- People: add/edit, relationship, birthday (year optional), notes, keep-in-touch interval, "Contacted" button (writes a `contact` log entry), gift ideas per person. Birthday cards and digest lines at configurable lead days (default 21 and 7) and on the day; keep-in-touch nudges with a one-tap "Contacted" action.
- Date nights: ideas, planned (date, place, budget), history with spend; completion writes a `date_night` log entry. Nudge when nothing is planned within N weeks (default 3).
- Trips: dates, destination, budget vs spent, booking references, checklist (items linked to the trip), manual flight price log with a trend line. Trips starting within 7 days appear on Today.
- Life admin: renewals, health appointments, subscriptions (monthly total), documents with a "where is it" location. Recurring items roll to the next occurrence on Done (`admin_done` log entry). Cards and digest lines within the lead window (default 14 days). No fields for ID numbers.
- Registry gains `digest` (module lines for the morning digest, batched) and `settings` (module section on the Settings screen). Life settings: birthday lead days, date-night nudge weeks, admin lead days, keep-in-touch toggle; every nudge can be switched off.
- Migration 0004; golden export v4.

Deferred from Stage 3: nothing in scope.

Note: the `stage-2` release was never created because that main build failed on a test-harness error (an unhandled rejection from the fake database in a component test), fixed in Stage 3. The `stage-3` build contains Stage 2.

## Stage 4: what was built

- Module `chess` (tray tile "Chess", gold accent) with a hub: Calendar, Students, Openings, Events, League.
- Teaching calendar: add any iCalendar feed URL (Google Calendar's "Secret address in iCal format", one per calendar), enable/disable per calendar, manual Refresh, automatic sync on app start and on every return to the foreground (at most once per five minutes). Events are cached in `calendar_events` for 7 days back and 60 days ahead so the app works offline. Own RFC 5545 reader: unfolding, TZID and UTC times, all-day dates, RRULE subset (daily, weekly with BYDAY, monthly, yearly, INTERVAL, UNTIL, COUNT), EXDATE, RECURRENCE-ID overrides, cancelled events. Native HTTP goes through Capacitor's HTTP plugin (no CORS issue in the WebView). Today's events appear in Today's Calendar section; the digest says how many lessons today.
- Students: profile (level, goals, notes) backed by a `people` row, lesson plan templates, per-lesson plan and after-lesson notes, optional link to a calendar event. Archive keeps history.
- Repertoire: tree by colour, each line with PGN (plain text), notes, confidence 1-5, last reviewed. Review queue: never reviewed first, then by overdue days from a confidence-based interval (3, 7, 14, 30, 60 days). Today shows how many lines are due.
- Tournaments: name, dates, location, entry deadline, fee, link, notes, entered / not yet / skipped. Nudges on Today and in the digest from 14 days before the deadline until entered or skipped.
- League: seasons (default team Cardiff Crows), fixtures with date, opponent, their team, board, colour, result, ratings, optional PGN, notes; season summary (W-D-L, points, score %, average opponent rating, performance, by colour). Fixture results write `match_result` log entries. League tables and views live in `src/core/league` so snooker reuses them.
- Registry gains `start` (module background work at boot). Migration 0005; golden export v5.

Deferred from Stage 4: Google OAuth calendar access (the secret iCal address needs no Cloud console, no client ID and no signing fingerprint; see Later ideas for the OAuth walkthrough); PGN board viewer (nice-to-have per the spec).

## Stage 5: what was built

- Module `banjo` (orange accent). Today panel: Start/Stop practice timer (survives an app restart), "x of 7" pill, minutes this week; stopping opens a one-field sheet for what was worked on and an optional piece, then logs a `practice` entry with start and end instants. Hub: 7-day and 28-day consistency, 12-week heat map, recent sessions, manual Log. Goals (pieces or techniques, target date, done). Library: pieces with tuning and status (learning, polishing, ready), PDF or image files imported from the device picker and stored under the app data directory with a `files` row; full-screen viewer (pdf.js for PDFs, native image for pictures, zoom) that keeps the screen awake via the keep-awake plugin (Screen Wake Lock in a browser). Sessions screen edits worked-on, notes and minutes.
- Module `snooker` (teal accent). Highest break with one-tap logging (`break` entries), practice routines defined by the user with attempts (`routine_attempt` entries): personal best, recent average of the last ten with delta against earlier, attempt count, trend line of the last twenty. League reuses the shared league view without board, colour, ratings or PGN. Practised-this-week consistency.
- Shared: `MoneyInput`, `pounds`, `sparklinePath` moved to `src/core/ui`; the file store gained base64 read/write and display URLs (Capacitor file URIs converted for the WebView).
- Migration 0006; golden export v6.

Deferred from Stage 5: PDF files are stored on the device but are not part of the JSON export (metadata is); a zip bundle remains in Later ideas.

## Device checklist (run after installing a stage build)

- Fresh install opens to Today; five tabs navigate; theme toggle works.
- Settings > Export writes to `Documents/Browsination/` and Share hands the file to Drive.
- Settings > Import restores the same file; row counts match.
- Install the next CI build over the previous one without uninstalling.
- After a stage that adds a migration: a `pre-migration` snapshot appears in Settings.

## Decisions log

- **applicationId** `com.browsination.app`, display name Browsination. Permanent.
- **Signing**: one project debug keystore committed at `android/keystore/debug.keystore` (standard debug alias/password). CI runners have no debug keystore of their own, so without this every build would have a new signature and Android would demand an uninstall (data loss). Repo is public by Joe's decision; the key only guards who can ship updates to a sideloaded personal app.
- **versionCode** = git commit count, so every main build is an upgrade and a recreated workflow cannot go backwards.
- **No service worker / no vite-plugin-pwa.** No benefit inside the APK; stale-bundle risk. Web manifest kept for the desktop dev tab.
- **sql.js for browser dev and tests**, not the plugin's jeep-sqlite web layer: one engine for both, no custom element, runs in Node.
- **Own migration runner and own export format**; the plugin is used purely as a SQLite engine (`version` always 1, no encryption).
- **Snapshot = JSON export** to app storage, not a copy of the .db file. One tested code path, restorable through the importer, works on both drivers. `VACUUM INTO` noted as a possible native extra.
- **Ids** are text UUIDs. **Instants** are ISO UTC strings with `tz_offset_min`; **scheduled** things are civil dates/times. No stored day column; `dayStartHour` (default 4) applied at read time.
- **`items.module` and `items.status` are independent.** Inbox = `status = 'inbox'`.
- **Recurrence** stored as an RFC 5545 subset string; own parser in Stage 1. No rrule dependency.
- **Recurring completion** spawns a new row per occurrence (same `series_id`), so the wins log and insights see every instance. Missed occurrences are skipped: the next due date is always after today.
- **Reminder time** is stored as local wall clock (`reminder_at` 'YYYY-MM-DDTHH:MM'); the scheduler converts it to an instant in the device zone at scheduling time, so a 09:00 reminder stays 09:00 abroad.
- **Digests** are one-shot notifications for the next occurrence only, re-planned on every sync so their text is at most one app-switch old. Chase nudges ride the digest, never their own alarm.
- **Notification ids** are a 31-bit FNV-1a hash of a logical key (`item:<id>`, `digest:morning`), so rescheduling under the same id replaces in place.
- **Stage tags** are created by CI from the `STAGE` file (tag pushes from the build environment were cut off by the proxy).
- **Task lists** live under the Inbox tab as segments (Inbox, To-do, Waiting, Wins) to keep the five-tab nav.
- **Money** as integer pence, GBP only (Stage 3 gift prices, Stage 7).
- **No soft-delete tombstones yet.** Items are dropped, never deleted. Additive `deleted_at` if Stage 11 happens.
- **Exact alarms**: `USE_EXACT_ALARM` declared. Assumes the app is never published on Google Play.
- **Notification permission** is requested when the master toggle is switched on, not at launch.
- **Export destination**: public `Documents/Browsination/` (survives uninstall) with Share as a second tap; falls back to app storage if the write is refused. Import via the WebView file chooser, no plugin.
- **Android Auto Backup** left at the Capacitor default (on). The sqlite plugin README suggests off; JSON export remains the real backup. Revisit if a stale restore is ever observed.
- **Insights tab** is shown as a placeholder as the spec asks; it becomes real in Stage 9.
- **TypeScript pinned to 5.9**: TypeScript 7 shipped on 2026-09-20 and typescript-eslint does not support it yet.
- **Stage 4 calendar** will use Google Calendar's per-calendar secret iCal address (paste a URL into Settings): no OAuth, no Cloud console, works offline-cached. OAuth walkthrough parked in Later ideas.
- **Stage 10**: if the Iron Log repository is not reachable from the build environment, the importer targets Iron Log's JSON export shape and the mapping is documented for verification.

## Later ideas

- Weekly "export nudge" if the last export is older than N days.
- `VACUUM INTO` native .db snapshot alongside the JSON snapshot.
- Zip export bundle (JSON + files) once sheet music exists (Stage 5 will add this).
- Merge-import (combine two devices) instead of replace-all.
- Google Calendar OAuth (read-only) as an alternative to the secret iCal address. Walkthrough if ever wanted: Google Cloud console › new project › APIs & Services › enable "Google Calendar API" › OAuth consent screen (External, Testing, add your own Gmail as a test user) › Credentials › Create OAuth client ID › type Android › package `com.browsination.app` › SHA-1 from CLAUDE.md › paste the client ID into a Settings field. The app would then use an Authorization Code + PKCE flow through the system browser with the custom scheme redirect, store the refresh token in app storage, and call `calendarList` and `events.list` with `syncToken`. Refresh tokens for Testing-status projects expire after seven days unless the app is published, which is the main reason the iCal route was chosen.
- Free flight price API (Stage 3) and free stock price API (Stage 7): evaluate terms before adding.
- Light theme design pass.
- Custom launcher icon (currently the Capacitor default).
