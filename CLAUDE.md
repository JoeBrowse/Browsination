# Browsination

Personal life manager for one user (Joe). React + TypeScript + Vite, packaged for Android with Capacitor 8. Local-first SQLite. No accounts, no server.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Desktop browser dev server (sql.js database persisted in IndexedDB) |
| `npm run check` | typecheck + lint + tests (what CI runs before building the APK) |
| `npm test` | Vitest (`WRITE_GOLDEN=1 npx vitest run src/test/golden` writes the golden export for a new schema version) |
| `npm run build` | Production web build into `dist/` |
| `npm run apk` | build + `cap sync android` + `gradlew assembleDebug` (needs Android SDK + JDK 21 locally) |

CI (`.github/workflows/ci.yml`): `check` on every push/PR; `apk` on push to `main`. The first main build after the `STAGE` file changes creates the `stage-<STAGE>` tag and a GitHub Release with the APK.

## Layout

```
src/main.tsx            boot
src/app/                shell: Boot, boot.ts (open db -> snapshot -> migrate), router, AppShell (nav, FAB slot, toast), screens/, services.ts
src/core/db/            SqlDriver interface, driver.sqljs (web + tests), driver.native (Android), migrate.ts, migrations/, schema.ts, events.ts
src/core/repos/         repositories: the only place SQL is written for app data
src/core/backup/        export/import envelope, snapshots, FileStore interface
src/core/platform/      the only files allowed to import @capacitor/* and @aparajita/* (lint-enforced): db, fileStore, exportTransport, notifications, appEvents, biometric
src/core/modules/       ModuleDef contract + registry (the single core -> modules import)
src/core/today/         collectToday: merges module cards, sorts, caps
src/core/tasks/         task queries over items (overdue, due, focus, chase, wins) and recurring completion
src/core/recurrence/    RRULE subset: parse, format, describe, nextOccurrence
src/core/notifications/ pure planner + reconcile, sync service; the port lives in platform/notifications.ts
src/core/time/          localDay: day-start-hour rule, civil day arithmetic
src/app/tasks/          TaskRow, ItemSheet (create/edit/triage, including when a done item was finished), FocusPicker, WinsList, fields, useComplete
src/core/logs/          the log type registry (LogTypeDef: label, value, editable payload fields, daily, addable, a module's own editor)
src/app/logs/           WhenField and WhenToggle (when it happened, defaults to now), LogSheet (edits any log entry); the History screen is src/app/screens/History.tsx
src/app/capture/        QuickCapture (registers the FAB handler)
src/core/consistency/   "x of last N days" and heat map maths (never streaks)
src/modules/brain/      Stage 2: check-in panel, habits, sleep and timer sheets
src/modules/life/       Stage 3: lists over items, people and birthdays, date nights, trips, life admin; logic.ts holds the pure nudge maths
src/modules/chess/      Stage 4: ics.ts (iCalendar reader + recurrence expansion), sync.ts, students, repertoire, tournaments; data/egca.ts is the EGCA 2026/27 fixture list + team directory, loaded on request by data/loadEgca.ts
src/core/league/        seasons, fixtures (home/away, round, venue, start time), the opposition directory (`league_teams`), stats and views shared by chess and snooker (`module` column)
src/modules/banjo/      Stage 5: practice timer panel, sessions, goals, library with on-device sheet music and the full-screen viewer; learning/ (spaced, interleaved chunk scheduler + plan hook), screens/PlanScreen
src/modules/snooker/    Stage 5: breaks, routines with stats, league (shared view)
src/modules/alcohol/    Stage 6: model.ts (Widmark + absorption + elimination), forecast.ts, caffeine.ts, drink/caffeine sheets, medication
src/modules/money/      Stage 7: logic.ts (net worth series, utilisation, due dates, goal progress, check-in due), repo, sheets/, screens/ (hub, account, holdings, goals, credit, check-in)
src/modules/work/       Stage 8: projects (next actions are items with entity 'work.project'), work contacts (people.context = 'work') with 1:1 notes, progression + evidence, learning list
src/core/review/        Stage 9: weekly review timing (Monday weeks, review day rule) and the reviews repo; screen in src/app/screens/Review.tsx with steps in src/app/review
src/core/focus/         Stage 9: focus session store (localStorage); src/app/focus has the sheet, the bar and the hook that logs `focus` entries
src/core/insights/      Stage 9: stats.ts (pearson, grouping, pairing) and queries.ts (period summaries + correlation cards over log_entries)
src/core/lock/          Stage 7: pin.ts (PBKDF2 record + verify), lockStore (zustand), install.ts (boot + background re-lock), LockScreen, RequireUnlock layout route
src/core/ui/GoalPicker  select an active savings goal from any module (trips, gifts)
src/core/ui/format.ts   pounds/pence, sparkline path, minutes labels; MoneyInput.tsx and Sparkline.tsx next to it
src/core/time/zoned.ts  IANA-zone wall clock <-> UTC via Intl (used by the iCalendar reader)
src/core/settings/      typed settings schema + defaults
src/core/ui/            tokens.css, primitives, Sheet, useQuery, theme
src/modules/<id>/       one folder per module; registered in src/modules/index.ts
src/test/               makeTestDb (sql.js in memory), fixtures, golden exports
```

## Conventions

- **No file over 400 lines** (ESLint `max-lines`, fails CI). Split by concern, not by line count.
- **UI never touches SQL.** Screens call repositories; repositories call `SqlDriver`.
- **Capacitor plugins only in `src/core/platform/`** (plus `driver.native.ts`). Everything else is platform-agnostic and testable in Node. Network requests go through `platform/http.ts` (Capacitor HTTP natively, so the WebView's CORS rules do not apply).
- **Module hooks** (`ModuleDef`): `routes`, `today` (data cards), `panels` (interactive Today cards), `digest` (morning digest lines), `reminders` (timed notifications the planner schedules), `settings` (Settings section), `start` (background work at boot, returns a disposer), `week` (dated things in a range, for the weekly review), `consistency` (x-of-7 lines for the review), `logTypes` (how this module's log types are shown and edited), `requiresLock`.
- **Everything logged can be edited and backdated.** A new log type ships with a `LogTypeDef` (there is a test for that) so History can edit it; a repository function that writes a log takes an optional `ts`; a list of logged things is tappable, opening either `LogSheet` or the module's own sheet (`LogTypeDef.editor`, used for drinks and caffeine so grams and units stay consistent). Backdated entries are stamped at midday when the day is not today, never at "now on an old day". History hides a locked module's entries, the same as Today.
- **Alcohol module tone**: informative and neutral, positives and negatives, no lecturing, the disclaimer wherever an estimate is shown, and never any "safe to drive" indicator.
- **Ids** are text UUIDs from `newId()`. Never integer autoincrement.
- **Time.** Instants (things that happened) are ISO 8601 UTC strings + `tz_offset_min` captured at write. Scheduled things are civil: `due_date` `YYYY-MM-DD`, `due_time`/`reminder_at` local wall-clock. "Which day" is computed at read time with `localDayOf(ts, offset, dayStartHour)`; never store a day column.
- **Every table**: `id`, `created_at`, `updated_at`; JSON columns are TEXT parsed in the repository.
- **Migrations** (`src/core/db/migrations/NNNN_name.ts`): plain SQL, append-only, contiguous versions, one transaction each, checksum-verified. Declare `tables` (parent first) and `fixtures` (one full row per table). Adding a table = migration + repository + fixtures; export/import and the round-trip test pick it up automatically. Portable SQL only: no STRICT tables, no generated columns, no RETURNING, no DROP COLUMN (rebuild instead). `PRAGMA foreign_keys` cannot be changed inside a transaction.
- **Export/import** is our own JSON envelope (`src/core/backup/format.ts`), never the plugin's. Import is replace-all: drop, migrate to the file's version, insert, migrate to head, foreign-key check; on failure the in-memory copy is restored. A golden export per schema version lives in `src/test/golden/` and must import forever.
- **Snapshots** are the same envelope written to app storage before every migration and import (keep 10).
- **Today cards are data** (`TodayCard`), not JSX. Core renders them and enforces the cap. A module that needs an interactive card (check-in, quick log) registers a `panel` component instead; panels render above the task sections inside the module's accent.
- **Log types** are owned by the module that writes them (documented in that module's `repo.ts`): fixed `unit` per type, payload shape typed at the repository boundary. One-per-day types upsert via `upsertDaily`.
- **Module accent** is one CSS variable (`--accent`) set by `ModuleScope`; components inherit it.
- **Forgiving consistency, never streaks.** Show "x of last 7 days". No red badges, no guilt copy.
- **No prose in the UI.** Labels are one or two words.
- Locale: en-GB, Europe/London, Monday week start, 24-hour clock, GBP stored as integer pence.

## Adding a module (Stage N recipe)

1. `src/modules/<id>/module.ts` exporting a `ModuleDef` (id from `ModuleId`, one-word `name`, lucide `icon`, `accent`, `order`, `routes`, optional `today` contributors).
2. `src/core/db/migrations/NNNN_<id>.ts` with `tables` + `fixtures`; append to `MIGRATIONS`.
3. `src/modules/<id>/repo.ts` for the module's tables; use core repos for `items`, `log_entries`, `people`, `files`.
4. Add the module to `src/modules/index.ts`. Add the `ModuleId` to `src/core/modules/types.ts` if new.
5. Logic in `src/modules/<id>/logic/*.ts` is pure and unit-tested.
6. `npm run check`, then `WRITE_GOLDEN=1 npx vitest run src/test/golden` for the new schema version.

## Android

- `appId` `com.browsination.app` and the signing key in `android/keystore/debug.keystore` are permanent. Changing either makes Android treat the build as a different app and loses on-device data. Signing SHA-1: `51:6B:38:1C:38:05:8A:C3:37:8A:95:AD:3E:1E:C3:E7:0C:E1:B5:71`.
- `versionCode` comes from the git commit count (`VERSION_CODE` env in CI); `versionName` from `git describe`.
- Manifest adds `USE_EXACT_ALARM` (sideloaded personal app, never on Play). The notifications plugin already declares `POST_NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM`.
- `npx cap sync android` regenerates `android/app/src/main/assets/public`, `capacitor.build.gradle` and the cordova plugins folder; the first two are not committed.
