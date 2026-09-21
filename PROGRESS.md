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
| 6 Alcohol, caffeine, medication | done | `stage-6` | drink presets with forecast before confirming, cumulative Widmark model, caffeine half-life, medication log with reminders, morning-after question |
| 7 Money, app lock | done | `stage-7` | accounts with dated balances and net worth, holdings, goals linked from trips and gifts, cards with utilisation and payment reminders, credit score history, monthly check-in, PIN/biometric lock |
| 8 Work, side projects | done | `stage-8` | projects with next actions as items and key dates, work contacts with 1:1 notes, progression (goals, skills, milestones) with an evidence log, learning list |
| 9 Weekly review, focus, insights | done | `stage-9` | six-step resumable review with reminder and week-ahead from every module, focus timer logging `focus` entries, Insights with period summaries and six correlations |
| 10 Iron Log merge | done | `stage-10` | `fitness` module ported from Iron Log v1.23 (exercise database, programme presets, per-set ticks, backdating, readiness, bodyweight, activities), importer with dry run and snapshot |
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

## Stage 6: what was built

- Module `alcohol` (tray tile "Drinks", rose accent). Today panel: "same as last time" drink and caffeine in one tap, "Other" opens the sheet, units today, current estimate, medication ticks.
- Drink sheet: UK presets (pint, half, bottle, can, wine 125/175/250, single, double, custom) with editable ml, ABV and time; stored as grams of ethanol (value) with UK units and the measure in the payload. Before confirming: chart of the estimated curve with and without this drink, peak time and level, back-to-zero time, plain-language timeline (feeling best, tipping negative, back to zero), sleep impact at the usual bedtime and next-morning note, session units and rolling-week units against the 14-unit guideline. Disclaimer on the sheet, the hub and Settings. No fitness-to-drive indicator anywhere; bands never mention driving (tested).
- Model (`src/modules/alcohol/model.ts`, pure, tested): Widmark distribution (r 0.68 male / 0.55 female), first-order absorption per drink (half-life default 12 min), zero-order elimination (0.15 g/L per hour) that only runs while alcohol is present, minute-step simulation so every drink still in the system carries over. Parameters live in Settings (weight, sex, bedtime, sleep length, elimination rate, absorption half-life).
- Caffeine: presets (espresso, coffee, instant, tea, green tea, energy drink, cola) or custom mg, simple half-life decay (default 5 h, adjustable), "still active at bedtime" estimate on the sheet and the hub.
- Medication: name, dose, reminder times; Taken button and Today ticks (`medication` log entries); reminders are timed notifications through the shared planner (module `reminders` hook), skipping today's dose once taken; switchable in Settings.
- Morning after: the brain check-in asks "how do you feel, 1-5" when the previous logical day had drinks (`morning_after` entry with the units drunk).
- Migration 0007 (`medications`); golden export v7.

Deferred from Stage 6: nothing in scope.

## Stage 7: what was built

- Module `money` (tray tile "Money", gold accent, `requiresLock`). Hub: net worth (latest balance of every unarchived account, cards subtracted), change over the last 30 days, month-by-month trend line, accounts with their latest balance and date, archived accounts hidden behind a button.
- Accounts: name, kind (current, savings, ISA, credit card, pension, cash, other), provider label; cards add a limit, a payment day of month and a reminder toggle. There is no column for a login, card number, sort code or account number, and a test scans every table for such names. Balances are one dated snapshot per account per day (logging twice replaces the figure); account screen shows history, trend line, archive, and delete only once archived.
- Holdings: ticker, name, quantity, total cost, price typed in by hand, held-in account. Value, gain and percentage per holding and in total. No price API: free tiers all need a personal API key or have unclear automated-use terms, and UK funds are poorly covered (see Later ideas). Records only; no recommendations anywhere.
- Savings goals: target, deadline, progress from a linked account's balance or a typed figure, pence per month needed to hit the deadline. Trips and gift ideas carry a `goal_id` (and gift ideas a `budget_pence`); the goal shows what is linked and the linked total. Picker appears in life screens only once a goal exists.
- Credit: per-card balance owed, limit, utilisation bar, next payment date, reminder toggle; all-cards total. Payment reminders are timed notifications `money.paymentLeadDays` before each due date (module `reminders` hook), plus a Today card and digest line inside the lead window. Credit score: manual history with agency chips and trend line.
- Monthly check-in (`/m/money/checkin`): from the check-in day of each month a Today card and a digest line say it is due; the flow steps through each account with the last balance ready (Same / Save / Skip), then holding prices, then the net-worth result; every save is immediate so it resumes; finishing logs a `money_checkin` entry (value = net worth) so insights can chart it.
- App lock (`src/core/lock`): modes off / money / whole app. PIN is 4–8 digits stored as a PBKDF2-SHA256 record (salt, 120k iterations) in settings; verification is constant-time. Optional biometrics through `@aparajita/capacitor-biometric-auth` (device credential allowed as fallback), only offered when the device reports biometry. Locks on boot and after the configured time in the background (0 / 1 / 5 / 15 min). Money mode wraps the module's routes in a layout route that renders the PIN pad, hides its Today cards and panels behind a "Money · Locked" row; app mode replaces the router with the pad. Settings changes need the current PIN (or a biometric pass). Five wrong attempts pause input for 30 seconds.
- Migration 0008 (`accounts`, `balance_snapshots`, `holdings`, `savings_goals`, `credit_scores`, `trips.goal_id`, `gift_ideas.budget_pence`, `gift_ideas.goal_id`); golden export v8.

Deferred from Stage 7: nothing in scope. The database is not encrypted; the lock is a privacy screen (see Later ideas for FLAG_SECURE and encryption).

## Stage 8: what was built

- Module `work` (tray tile "Work", blue accent). Hub keeps the day job and side projects under separate headings; every project row shows its next action (the oldest open item linked to it, due date first) with a Done check; "Coming up" lists key dates inside 14 days; done projects collapse to a list at the bottom.
- Projects: name, client, area (day job / side), status (idea, active, paused, done), notes, key dates (JSON `[{label, date}]`). Next actions are ordinary `items` (module `work`, entity `work.project`), so they carry due dates, reminders, focus and recurrence and appear on Today and in the Inbox like any task; the project screen adds, completes and edits them (ItemSheet).
- People: colleagues and contacts are `people` rows with `context = 'work'` plus `role` and `cares_about`; Life's people list shows `personal` rows only, birthday and keep-in-touch nudges still cover everyone. Person screen: role, what they care about, notes, and dated 1:1 notes (each note stamps `last_contacted_at`).
- Progression: goals, skills and milestones (with target dates, done dates) in one table; evidence log of achievements and feedback with date, source, optional link to a goal or project, and a Copy button that puts the whole log on the clipboard as plain lines for an appraisal form.
- Learning list: title, kind (book, course, article, video, other), status cycled by tapping the chip (todo → doing → done), link and notes.
- Today: project key dates within `work.leadDays` (default 7) and milestones within twice that as calendar cards; digest lines switchable off.
- Migration 0009 (`projects`, `one_on_ones`, `progression_items`, `evidence`, `learning_items`, `people.context/role/cares_about`); golden export v9.

Deferred from Stage 8: nothing in scope.

## Stage 9: what was built

- Weekly review (`/review`, core, not a module): six steps, each saved as it happens so it resumes (`reviews` row per Monday-dated week): Inbox triage, Waiting-on, Week ahead (tasks due plus every module's `week` hook: birthdays, trips, date nights, admin due, chess calendar events, tournaments and entry deadlines, league fixtures for chess and snooker, project key dates, milestones, card payments, the money check-in), Consistency glance (every module's `consistency` hook: mood, meditation, stretch and habits as x of 7; banjo and snooker practice; alcohol units against 14 and drink-free days), Priorities (pick up to three open items or type new ones), Done (notes, finish). Due from the review day and time (default Sunday 18:00) until that week's review is completed: a Today card, a timed reminder (switchable), and a "This week" section on Today listing the chosen priorities while they are open.
- Focus timer: from any item's sheet ("Focus"): 15/25/45/60 minutes (default in Settings), a bar above the tab bar everywhere with the countdown and Stop, an end-of-session notification (switchable; kept in step by the notification sync), and a `focus` log entry (start and end instants, minutes, linked item) when stopped. Survives an app restart.
- Insights screen replaces the placeholder: this week and this month against the period before (tasks done, units, drink-free days, meditation, practice and focus minutes, workouts, mood and sleep averages), then six correlations over the last 90 days with the number of pairs, Pearson r, plain wording that calls out small samples, and a scatter: drinks the day before vs sleep quality, hours slept vs mood, mood vs chess results, mood vs snooker results, weekly practice attempts vs routine scores (normalised per routine), weekly workout days vs mood (fills in once Stage 10 writes `workout` entries). Labelled as correlation, never cause.
- Migration 0010 (`reviews`); golden export v10. New module hooks: `week`, `consistency`.

Deferred from Stage 9: nothing in scope.

## Stage 10: what was built

- Migration plan first: `docs/IRONLOG_MIGRATION.md` (what is ported, what is dropped, the key-by-key data mapping, importer behaviour). Joe asked for the plan to wait for approval; under the later "complete everything autonomously" instruction it was written, followed, and is there to review.
- Iron Log itself: `JoeBrowse/IronLogV2` (private, v1.23.0, one 14,735-line `App.jsx`; `IronLogV3` is an identical public mirror). Nothing was pasted in: the exercise database, secondary muscles, aliases, implements, recovery windows, activity types and programme presets were extracted by a script into `src/modules/fitness/data/*.ts` (data only), and every behaviour was rewritten against this app's SQLite spine.
- Module `fitness` (tray tile "Gym", red accent, order 30). Hub: unfinished session (resume or discard), this week (days, sessions, sets, volume), readiness chips per muscle from the recovery windows (direct or indirect work, hard or with reps in reserve, pace from Settings; cardio activities count), recent sessions; Start opens the programme's next day, a template or an empty session.
- Workout screen: exercises with "last time", planned sets pre-filled from last time with a tick box per set (a set with numbers is saved ticked or not), weight × reps × RIR, add set copies the previous one, notes, exercise search with aliases and custom lifts, date and time editable for backdating (never in the future), every change saved at once so closing the app loses nothing. Finish drops empty sets, logs one `workout` entry, updates PBs for the six benchmark lifts and the active programme's log. Finished sessions reopen for edits or deletion.
- Exercises: database plus custom lifts; per exercise: history, PB, Epley e1RM (max reps for pull-ups and dips), manual tested 1RM, a target with "to go", trend line.
- Programmes: one active block from a preset (weeks 4/6/8/12), week and sessions-of-planned progress, next day, end early or finish; finished blocks listed.
- Body: bodyweight one reading per day with goal and trend (Today panel logs it in two taps), cardio activities (run, walk, cycle, other; minutes, km, RPE) that feed readiness.
- Today: panel (Start or Resume, x of 7, Weigh), a card for an unfinished session and a nudge after `fitness.nudgeDays` without training (off-switchable, no guilt copy). Weekly review consistency: gym and weigh-in days.
- Importer (Settings → Gym → Import Iron Log backup): reads Iron Log's backup file (format 1), always shows a dry run first (counts, what is already present and skipped, warnings such as unknown exercises kept as custom ones, keys not imported), then writes a `pre-import` snapshot and imports. Sessions, programmes, templates and activities are matched on their Iron Log ids so a second run adds nothing; records, targets and weigh-ins upsert. Per-exercise history older than Iron Log's 200-session cap is rebuilt into sessions. Tested end to end on a synthetic backup with one of everything (`src/modules/fitness/import/ironlog.test.ts`).
- Migration 0011 (`fitness_exercises`, `workouts`, `workout_exercises`, `workout_sets`, `programmes`, `workout_templates`, `fitness_records`, `fitness_goals`); golden export v11.

Deferred from Stage 10: rest timer, supersets and drop sets as editable UI (imported ones are shown), machine brand and grip editing, the body drawing, measurements. All in Later ideas.

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
- **Stage 7 net worth** counts account balances only; holdings are shown for their own gain/loss and are assumed to sit inside an account (ISA) whose balance already includes them, so nothing is double-counted. Archived accounts drop out of net worth entirely.
- **Stage 7 lock** stores a PIN hash in `settings` (so it travels with exports and restores with them). The lock guards the screen, not the database file.
- **Stage 10**: if the Iron Log repository is not reachable from the build environment, the importer targets Iron Log's JSON export shape and the mapping is documented for verification.

## Later ideas

- Gym: rest timer between sets (Iron Log had compound 120 s / isolation 90 s, sound and vibration), superset and drop-set editing, machine brand and grip, the muscle body drawing, body measurements, "train what is ready" session builder.
- Holding price refresh: candidates are Alpha Vantage (25 requests/day, personal key), Finnhub (personal key, US-centric), Stooq CSV (no key, terms unclear). Would need a key typed into Settings; UK funds (Vanguard LifeStrategy etc.) are not covered by any of them.
- Android `FLAG_SECURE` on the window (no screenshots, blank recents thumbnail) while locked or on money screens; SQLCipher-style database encryption keyed from the PIN.
- Weekly "export nudge" if the last export is older than N days.
- `VACUUM INTO` native .db snapshot alongside the JSON snapshot.
- Zip export bundle (JSON + files) once sheet music exists (Stage 5 will add this).
- Merge-import (combine two devices) instead of replace-all.
- Google Calendar OAuth (read-only) as an alternative to the secret iCal address. Walkthrough if ever wanted: Google Cloud console › new project › APIs & Services › enable "Google Calendar API" › OAuth consent screen (External, Testing, add your own Gmail as a test user) › Credentials › Create OAuth client ID › type Android › package `com.browsination.app` › SHA-1 from CLAUDE.md › paste the client ID into a Settings field. The app would then use an Authorization Code + PKCE flow through the system browser with the custom scheme redirect, store the refresh token in app storage, and call `calendarList` and `events.list` with `syncToken`. Refresh tokens for Testing-status projects expire after seven days unless the app is published, which is the main reason the iCal route was chosen.
- Free flight price API (Stage 3) and free stock price API (Stage 7): evaluate terms before adding.
- Light theme design pass.
- Custom launcher icon (currently the Capacitor default).
