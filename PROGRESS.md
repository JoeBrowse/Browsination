# Progress

## Stages

| Stage | Status | Tag | Notes |
|---|---|---|---|
| 0 Foundation | done | `stage-0` | scaffold, SQLite layer, migrations, snapshots, export/import, shell, CI APK |
| 1 Capture, tasks, Today | next | | |
| 2 Brain fitness, daily log | | | |
| 3 Personal life | | | |
| 4 Chess | | | |
| 5 Banjo, snooker | | | |
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
- Google Calendar OAuth (read-only) as an alternative to the secret iCal address, with the Cloud console walkthrough.
- Free flight price API (Stage 3) and free stock price API (Stage 7): evaluate terms before adding.
- Light theme design pass.
- Custom launcher icon (currently the Capacitor default).
