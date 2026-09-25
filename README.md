# Fitness Tracker

A single-user workout tracker that runs entirely on your machine: log workouts, browse history, track personal records automatically and chart progress over time. No accounts, no cloud services, no paid APIs.

- **Frontend:** React 19 + Vite, plain CSS, react-router, Chart.js via react-chartjs-2
- **Backend:** Node.js + Express 5 (REST API)
- **Database:** SQLite through better-sqlite3 (one file, no database server)
- **Tests:** Vitest (server and client)

## Features

| Area | What it does |
| --- | --- |
| Exercise library | 29 seeded exercises across 7 muscle groups and 5 equipment types. Add, edit and delete your own custom exercises. Search by name and filter by muscle group. |
| Workout logging | Date, optional name, notes and duration. Add exercises, then log sets. **Add set** copies the previous set so you only edit what changed. Adding an exercise pre-fills its first set from your last session and shows what you did last time. |
| History | Newest first, with date, name, exercise count and total volume. Filter by date range and by exercise. Open a workout for every exercise and set. Edit or delete any workout. |
| Personal records | Four PR types per exercise, detected automatically: heaviest weight, best estimated 1RM (Epley), most reps in a set, best total volume in one workout. A **New PR!** badge shows right after saving and in the workout detail. |
| Progress charts | Per exercise: estimated 1RM, heaviest weight and total volume per workout, with a 1 month / 3 months / 6 months / all time selector, plus that exercise's PR history. |
| Dashboard | Workouts this week and this month, current streak (weeks), volume this week vs last week, workouts per week for 8 weeks (bar), sets per muscle group for 30 days (doughnut), 5 most recent PRs. |
| Settings | Weight unit (kg or lbs) applied everywhere, and data reset. |

## Setup

Requires Node.js 20 or newer (developed on Node 22).

```bash
npm run install:all
```

This installs the root helper (`concurrently`), the server and the client. Then start both dev servers with one command:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000 (the frontend proxies `/api` to it)

The first time the backend starts it creates `server/data/fitness.db` and seeds it with the exercise library plus about 9 weeks of sample workouts, so the charts and PRs are meaningful straight away.

Prefer two terminals? Run `npm run dev:server` and `npm run dev:client` separately.

### Tests

```bash
npm test
```

Or one side at a time with `npm run test:server` and `npm run test:client`.

The server suite covers the PR service (new PR detected, set that does not beat the PR, ties, bodyweight exercises, back-dated workouts, and recalculation after a workout is deleted or edited), the stats aggregation (streaks, weekly buckets, muscle-group counts, chart ranges) and the REST API end to end against an in-memory database. The client suite covers unit conversion and the logging-form helpers (copy previous set, validation, kg payload building).

### Resetting the database

```bash
npm run reset          # exercise library + sample workouts (the seed state)
npm run reset:empty    # exercise library only, no workouts, no records
```

There is also a **Reset data** section in the Settings page that does the same thing from the UI. Both keep your weight-unit preference. `reset:empty` keeps the built-in exercise library because the app is not usable without exercises to log; it removes every workout, record and custom exercise.

Use `npm run reset:empty` rather than `npm run reset -- --empty`: PowerShell can swallow the flag.

The sample workouts are generated relative to today's date (a fixed-seed generator makes the numbers repeatable), so a reset always gives you the most recent 9 weeks ending this week.

To delete everything and start from scratch, stop the server and delete `server/data/`. It is recreated and re-seeded on the next start. Set `SEED=false` to create an empty database instead.

## Project structure

```
fitness-tracker/
├── package.json               root scripts: dev, test, reset, install:all
├── server/
│   ├── src/
│   │   ├── index.js           starts Express on :5000, seeds a brand-new database
│   │   ├── app.js             createApp(db): mounts routers and error handling
│   │   ├── constants.js       muscle groups, equipment, record types, ranges
│   │   ├── db/
│   │   │   ├── schema.sql     the whole schema
│   │   │   ├── database.js    opens a database and applies the schema
│   │   │   ├── connection.js  the file-backed singleton used by the server
│   │   │   ├── exerciseData.js   the seeded library
│   │   │   ├── sampleWorkouts.js deterministic 9-week workout generator
│   │   │   ├── seed.js        seedExercises, seedSampleWorkouts, resetDatabase
│   │   │   └── reset.js       CLI for npm run reset
│   │   ├── routes/            thin HTTP layer: validation in, JSON out
│   │   ├── services/
│   │   │   ├── prService.js        PR detection and recalculation
│   │   │   ├── workoutService.js   create / update / delete / read workouts
│   │   │   ├── exerciseService.js  exercise CRUD rules
│   │   │   ├── exerciseHistory.js  one exercise's sets grouped by workout
│   │   │   └── statsService.js     dashboard and chart aggregation
│   │   ├── middleware/        input validators and the error handler
│   │   └── utils/dates.js     date math on YYYY-MM-DD strings
│   └── test/                  Vitest suites (in-memory SQLite)
└── client/
    ├── vite.config.js         dev server on :5173 with the /api proxy
    └── src/
        ├── api/               fetch wrapper
        ├── context/           weight-unit context
        ├── hooks/useApi.js    small data-loading hook
        ├── components/        layout, charts, exercise picker, badges
        ├── pages/             Dashboard, LogWorkout, History, WorkoutDetail,
        │                      Exercises, ExerciseProgress, Records, Settings
        ├── utils/             unit conversion, formatting, logging-form helpers
        └── styles/app.css
```

Services take the database as their first argument and never touch HTTP, which is what lets the tests run against an in-memory database with no server.

## Data model

```
exercises ──┐
            │ 1..*
workouts ─── workout_exercises ─── workout_sets
   │              (position)         (set_number, reps, weight_kg)
   │
   └───────── personal_records ──── exercises
                (append-only history)

settings (key, value)
```

| Table | Columns | Notes |
| --- | --- | --- |
| `exercises` | id, name, muscle_group, equipment, is_custom, created_at | Name is unique, case-insensitive. Built-in rows have `is_custom = 0` and are read-only. |
| `workouts` | id, date, name, notes, duration_minutes, created_at | `date` is a `YYYY-MM-DD` string, so there is no timezone ambiguity. |
| `workout_exercises` | id, workout_id, exercise_id, position | One row per exercise in a workout. `position` keeps the order, and an exercise appears at most once per workout. |
| `workout_sets` | id, workout_exercise_id, set_number, reps, weight_kg | Belongs to a `workout_exercises` row and is deleted with it. |
| `personal_records` | id, exercise_id, record_type, value, previous_value, workout_id, achieved_at | Append-only history: one row every time a record was broken. |
| `settings` | key, value | Currently just `weight_unit`. |

Differences from the brief's suggested model: a `workout_exercises` table sits between workouts and sets (it stores exercise order and lets sets hang off a single workout-exercise pair), `workout_sets` therefore points at it instead of at workout and exercise directly, and `personal_records` has a `previous_value` column so the UI can show "72.5 kg, was 70 kg".

Foreign keys enforce the rules: deleting a workout cascades to its exercises, sets and records; an exercise that has been logged cannot be deleted (`ON DELETE RESTRICT`).

## REST API

| Method and path | Purpose |
| --- | --- |
| `GET /api/exercises?search=&muscleGroup=&equipment=` | List and filter exercises (includes `workout_count`) |
| `GET /api/exercises/:id` | One exercise |
| `GET /api/exercises/:id/last-session?before=YYYY-MM-DD` | Sets from the most recent session, used to pre-fill the log form |
| `POST /api/exercises` | Create a custom exercise |
| `PUT /api/exercises/:id` | Edit a custom exercise (403 for built-in) |
| `DELETE /api/exercises/:id` | Delete a custom exercise (403 built-in, 409 if it has been logged) |
| `GET /api/workouts?from=&to=&exerciseId=` | History list with exercise count, set count, total volume and PR count |
| `GET /api/workouts/:id` | Full detail: exercises, sets and the records set in that workout |
| `POST /api/workouts` | Create a workout and detect PRs. Returns the detail, including new records |
| `PUT /api/workouts/:id` | Replace a workout's contents and recalculate PRs |
| `DELETE /api/workouts/:id` | Delete a workout and recalculate PRs |
| `GET /api/records` | Current PR of each type for every exercise |
| `GET /api/records/recent?limit=5` | Most recent record-breaking events |
| `GET /api/stats/dashboard` | Everything the dashboard shows |
| `GET /api/stats/exercises/:id/progress?range=1m\|3m\|6m\|all` | Chart points per workout plus the exercise's PR history |
| `GET /api/settings`, `PUT /api/settings` | Read and change the weight unit |
| `POST /api/settings/reset` | `{ "mode": "sample" }` or `{ "mode": "empty" }` |

Create and update bodies look like this. Weights are always in kilograms on the wire.

```json
{
  "date": "2026-03-01",
  "name": "Push Day",
  "notes": null,
  "duration_minutes": 60,
  "exercises": [
    { "exercise_id": 1, "sets": [{ "reps": 8, "weight_kg": 70 }, { "reps": 8, "weight_kg": 70 }] }
  ]
}
```

## Design decisions

### Why PRs are stored instead of computed on the fly

A PR could be derived at any time with `MAX(...)` over every set, and for one number that is fine. The app needs more than the current number:

- **History.** "Bench 60 kg on 3 Aug, 62.5 kg on 17 Aug, 65 kg on 7 Sep" is a list of events. The exercise page shows it, and so does the "5 most recent PRs" widget on the dashboard. Reconstructing events from raw sets means replaying every workout on every page view.
- **Badges.** "New PR!" on a workout is a lookup of `personal_records WHERE workout_id = ?`, not a comparison of that workout against everything before it.
- **Cheap reads.** The records page and dashboard read a few indexed rows. The expensive work happens once, when data changes, and reads vastly outnumber writes in a tracker.

The cost of stored data is that it can go stale, which is why every write path re-derives it (next section).

`personal_records` is append-only history. The current record for an exercise and type is simply the newest row, and each row also stores `previous_value`.

### How PR recalculation works on edit and delete

`prService.recalculateExercise(db, exerciseId)` rebuilds one exercise's history from scratch, inside the same transaction as the change that triggered it:

1. Delete all `personal_records` rows for the exercise.
2. Load every session of that exercise (its sets grouped by workout) ordered by date, then workout id.
3. Walk the sessions in order, keeping a running "best so far" per record type. For each session, summarize the sets into four numbers (heaviest weight, best Epley 1RM, most reps, total volume) and compare each with the running best. Anything strictly greater is inserted as a new record and becomes the new best.

Every write triggers this for the exercises it touched:

- **Create:** the exercises in the new workout.
- **Edit:** the exercises the workout had before the edit **and** the ones it has after, so an exercise removed from the workout is recalculated too.
- **Delete:** the exercises the workout contained, collected before the delete.

Because the replay always runs from the underlying sets, a record can never reference data that no longer exists, back-dating a workout puts the record in the right chronological place, and deleting a record-holding workout hands the record to the next best session automatically. Replaying is also idempotent, which one of the tests checks.

The alternative is incremental updates (compare only the new sets to the current record). That is faster but wrong for edits, deletes and back-dated workouts unless you add extra bookkeeping. Replaying one exercise's history is a few dozen rows here, so the simple, obviously correct approach wins. If the data ever grew large, the incremental path could be added for the append-only case and the replay kept for edits and deletes.

Rules of the detection itself (`detectNewRecords`):

- A record must **strictly beat** the current best; a tie is not a PR.
- Values of 0 never count. A bodyweight exercise logged at 0 kg only produces a most-reps record.
- Est. 1RM uses the Epley formula, `weight × (1 + reps / 30)`.
- Volume is per exercise per workout: the sum of `reps × weight` over that exercise's sets.
- Values are rounded to 2 decimals before comparing and storing, so the comparison and the stored number always agree.

### Weight unit storage

All weights are stored in **kilograms** (`weight_kg`). The kg/lbs preference is a display and input setting only: the client converts kg to lbs when showing a value and lbs to kg before sending one.

- One stored unit means records, volume totals and the Epley calculation are always comparing like with like. Changing the preference cannot corrupt or re-scale history, and there is no per-row unit to keep consistent.
- The server never has to know what the user sees. Aggregation is unit-agnostic and the API has a single contract.
- Conversion is rounded only at the edges: weights are rounded to 2 decimals for display and to 4 decimals when converting to kg for storage. Sets you leave unchanged while editing in lbs mode keep their exact stored kg value, so opening and re-saving a workout never nudges its weights.

### Chart data aggregation

`statsService.getExerciseProgress` produces one point per workout that contained the exercise. It takes that workout's sets for the exercise and computes, with the same `summarizeSets` function the PR logic uses:

- **Estimated 1RM:** the maximum Epley value across the sets.
- **Heaviest weight:** the maximum weight of any set.
- **Total volume:** the sum of `reps × weight`.

The range selector translates to a start date (`1m`, `3m`, `6m` are calendar months back from today, `all` is unbounded) and filters `workouts.date >= start`. The x-axis is categorical (one tick per session), and the PR history list is always the full history regardless of the range. Sharing `summarizeSets` between charts and PRs means the chart's peak and the PR value can never disagree.

The dashboard aggregates in SQL where it is a plain count or sum and in JavaScript where date bucketing is clearer:

- **Weeks start on Monday.** `startOfWeek(date)` maps any date to its Monday.
- **Workouts per week:** eight buckets ending with the current week, zero-filled so empty weeks appear as empty bars.
- **Streak:** the number of consecutive weeks, counting back from this week, that contain at least one workout. If this week has no workout yet the count starts from last week, so the streak does not read 0 on a Monday morning.
- **Volume this week vs last week:** summed `reps × weight` over each Monday to Sunday range.
- **Sets per muscle group:** sets from the last 30 days (today and the 29 days before) grouped by the exercise's muscle group.

Dates are `YYYY-MM-DD` strings compared lexicographically, and date arithmetic is done in UTC on those strings, so daylight-saving changes cannot shift a workout into another day or week.

### Other decisions

- **Built-in exercises are read-only.** Only custom exercises can be edited or deleted, and only when they have never been logged. Otherwise a rename or deletion would rewrite history.
- **Editing a workout replaces its exercises and sets** (delete then re-insert in one transaction). It keeps the API simple, and the client already holds the whole workout in its form. Per-set edits happen in the form.
- **One exercise per workout.** Logging the same exercise twice in a session would make "volume for that exercise in a workout" ambiguous, so add more sets to the existing entry instead.
- **Services receive `db` as an argument** rather than importing a global connection, so tests use an isolated in-memory database.
- **SQLite pragmas:** `foreign_keys = ON` (off by default in SQLite) and WAL journaling.
- **No authentication and no cloud.** Single user, local file, by design.
