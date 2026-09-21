# Iron Log → Browsination: migration plan (Stage 10)

Source: `JoeBrowse/IronLogV2` at v1.23.0 (`src/App.jsx`, 14,735 lines; `IronLogV3` is an identical public mirror).
Iron Log keeps everything in Capacitor Preferences under the `iron-log:` prefix and can write a backup file
(`Settings → Backup`, `iron-log-backup-YYYY-MM-DD.json`, `{ format: 1, app: "Iron Log", version, exportedAt, data }`).
That backup file is the import source: another app's Preferences cannot be read directly.

## What is ported (as the `fitness` module, split into files)

| Feature | Where |
|---|---|
| Exercise database (66 lifts + 8 mobility moves, muscles, aliases, secondary muscles, implements) | `data/exercises.ts`, `data/recovery.ts` (generated from Iron Log's tables, data only) |
| Programme presets (PPLUL, PPL, Upper/Lower, Full Body, Bro, Arnold, Project Arms, Custom) and block lengths | `data/presets.ts`; programmes in `programmes` |
| Workout logging with per-set tick boxes for planning ahead (pre-filled from last time, tick as you go; a set with data is saved whether ticked or not) | `workouts`, `workout_exercises`, `workout_sets`; `WorkoutScreen` |
| Backdating (date and time of a session) | `workouts.ts` + `tz_offset_min`; the picker on the workout screen |
| Bodyweight tracking with goal and trend | `bodyweight` log entries (one per day), `fitness.weightGoal` |
| Cardio activities (run, walk, cycle, other) feeding readiness | `activity` log entries |
| Muscle readiness (recovery windows, direct/indirect, hard/easy, pace) | `logic.ts` `readiness()`, hub list (no body drawing) |
| Weekly volume per muscle (secondary muscles count half) | `logic.ts` `weeklyVolume()` |
| "Last time" per exercise, e1RM (Epley), PBs, manual 1RM, 1RM goals | derived from workouts; `fitness_records`, `fitness_goals` |
| Templates | `workout_templates` |
| Custom exercises | `fitness_exercises` |
| Unfinished workout resume | a `workouts` row with `finished_at` null |
| Training settings (unit, rest seconds, starting sets, recovery pace) | `fitness.*` settings |

Every finished workout also writes a `workout` log entry (value = sets, payload = split, exercises, volume, muscles),
so Insights' "gym consistency vs mood" fills in and the weekly review's consistency glance shows "x of 7".

## What is dropped

Paywall, trial and Google Play billing; the app tour and release notes; themes and colour schemes; the SVG body map
(`body-muscles`); Strava sharing; the guided-programme questionnaire; exercise database editing, hiding, pausing and
reordering; body measurements; the RIR/RPE display toggle (RIR is stored and shown); supersets and drop sets as
editable UI (imported data is kept and shown, see Later ideas); machine brand and grip editing (kept as text on import).

## Data mapping

| Iron Log key | Browsination |
|---|---|
| `workout-history[]` `{ id, date, at, split, exercises[{ id, name, muscle, sets[{ weight, reps, rir?, drops? }], notes?, method?, brand?, grip? }], supersets?, programmeId?, dayKey?, dayName? }` | `workouts` (`source='ironlog'`, `source_id=id`, `ts=at` or noon on `date`, `unit` from Iron Log settings) + `workout_exercises` (position, superset letter) + `workout_sets` (done=1) + one `workout` log entry |
| `ex-history:<exerciseId>[]` `{ date, at, sets, order, total, ... }` | entries whose `at` matches no session are grouped by `at` into reconstructed workouts (`source='ironlog-history'`, `source_id='hist-<at>'`); this recovers sessions older than Iron Log's 200-session cap |
| `in-progress-workout` `{ split, exercises, sets{exId: [{weight, reps, rir, done, drops}]}, workoutDate, startedAt }` | an unfinished `workouts` row (only when it has data and nothing is already in progress) |
| `pb:<exerciseId>` `{ weight, reps, date }`, `manual-1rm:<exerciseId>` `{ value, date }` | `fitness_records` (`kind` pb / manual_1rm), upsert |
| `1rm-goals` `{ [exerciseId]: { current, target, level, weeks, isBodyweight, createdAt, milestones } }` | `fitness_goals`, upsert |
| `bodyweight-history[]` `{ value, unit, date }` | `bodyweight` log entries, one per day (upsert) |
| `weight-tracking` `{ goal, unit }`, `personal-stats` `{ height }` | `fitness.weightGoal`, `fitness.heightCm` |
| `activity-history[]` `{ id, date, at, type, name, minutes, seconds, distance, rpe }` | `activity` log entries (`entity_type='ironlog.activity'`, `entity_id=id`) |
| `templates[]` `{ id, name, split, mode, exercises?, selection?, createdAt }` | `workout_templates` (`source_id=id`) |
| `active-programme`, `finished-programmes[]` `{ id, name, presetKey, createdAt, weeks, days, log, finishedAt?, endedEarly? }` | `programmes` (status active / finished, `source_id=id`) |
| `custom-exercises[]` `{ id, name, muscle, type, pattern?, cue?, secondary? }` | `fitness_exercises` |
| `settings` `{ weightUnit, restCompound, restIsolation, startingSets, recoveryPace }` | `fitness.*` settings (only when the file has them) |
| `exercise-edits`, `hidden-exercises`, `paused-exercises`, `exercise-order`, `measurements-*`, `license`, `tour-seen`, `schema-version`, `last-seen-version`, `mode-chosen`, `feature-list-hint-shown` | skipped; listed in the dry-run report |

Exercise ids that are neither in the database nor in `custom-exercises` get a placeholder custom exercise
(name and muscle from the session) so their history stays visible; the report lists them.

## Importer behaviour

1. Pick the backup file (Settings → Fitness → Import Iron Log). The file is validated (`format === 1`, `app === "Iron Log"`).
2. **Dry run** (always first): a report of what would be imported, what would be skipped as already present,
   and every warning. Nothing is written.
3. **Import**: a snapshot of the whole database is written first (Settings → Data lists it as `pre-import`),
   then everything is inserted in one transaction. Existing rows are never deleted or overwritten; re-running
   the import is safe because sessions, programmes, templates and activities are matched on their Iron Log ids
   and records, goals and bodyweight entries are upserted.
4. The report is shown again with the actual counts.
