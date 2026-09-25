import { describe, expect, it } from 'vitest';
import { seedExercises, seedSampleWorkouts } from '../src/db/seed.js';
import { getDashboard, getExerciseProgress, rangeStart } from '../src/services/statsService.js';
import { addDays, startOfWeek } from '../src/utils/dates.js';
import { createTestDb, logWorkout } from './helpers.js';

const TODAY = '2026-03-11';

describe('date helpers', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-03-11')).toBe('2026-03-09');
    expect(startOfWeek('2026-03-09')).toBe('2026-03-09');
    expect(startOfWeek('2026-03-15')).toBe('2026-03-09');
  });

  it('computes range starts', () => {
    expect(rangeStart('1m', TODAY)).toBe('2026-02-11');
    expect(rangeStart('3m', TODAY)).toBe('2025-12-11');
    expect(rangeStart('all', TODAY)).toBeNull();
    expect(rangeStart('1m', '2026-03-31')).toBe('2026-02-28');
  });
});

describe('getDashboard', () => {
  it('counts workouts and volume for this week versus last week', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-03-10', [[ids.bench, [[10, 100]]]]);
    logWorkout(db, '2026-03-09', [[ids.squat, [[5, 100]]]]);
    logWorkout(db, '2026-03-03', [[ids.bench, [[10, 50]]]]);
    logWorkout(db, '2026-02-20', [[ids.bench, [[10, 50]]]]);

    const dashboard = getDashboard(db, TODAY);

    expect(dashboard.workouts_this_week).toBe(2);
    expect(dashboard.workouts_this_month).toBe(3);
    expect(dashboard.volume_this_week_kg).toBe(1500);
    expect(dashboard.volume_last_week_kg).toBe(500);
  });

  it('returns 8 weekly buckets ending with the current week', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-03-10', [[ids.bench, [[5, 100]]]]);
    logWorkout(db, '2026-01-20', [[ids.bench, [[5, 100]]]]);

    const weeks = getDashboard(db, TODAY).workouts_per_week;

    expect(weeks).toHaveLength(8);
    expect(weeks.at(-1)).toEqual({ week_start: '2026-03-09', count: 1 });
    expect(weeks[0].week_start).toBe('2026-01-19');
    expect(weeks[0].count).toBe(1);
  });

  it('counts consecutive weeks with a workout as the streak', () => {
    const { db, ids } = createTestDb();
    for (const date of ['2026-03-10', '2026-03-03', '2026-02-24', '2026-02-10']) {
      logWorkout(db, date, [[ids.bench, [[5, 100]]]]);
    }

    expect(getDashboard(db, TODAY).streak_weeks).toBe(3);
  });

  it('keeps the streak alive when this week has no workout yet', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-03-03', [[ids.bench, [[5, 100]]]]);
    logWorkout(db, '2026-02-24', [[ids.bench, [[5, 100]]]]);

    expect(getDashboard(db, TODAY).streak_weeks).toBe(2);
  });

  it('resets the streak after a fully skipped week', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-02-24', [[ids.bench, [[5, 100]]]]);

    expect(getDashboard(db, TODAY).streak_weeks).toBe(0);
  });

  it('groups sets from the last 30 days by muscle group', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-03-10', [
      [ids.bench, [[5, 100], [5, 100], [5, 100]]],
      [ids.squat, [[5, 100]]],
    ]);
    logWorkout(db, addDays(TODAY, -40), [[ids.pullUp, [[5, 0]]]]);

    expect(getDashboard(db, TODAY).sets_by_muscle_group).toEqual([
      { muscle_group: 'Chest', sets: 3 },
      { muscle_group: 'Legs', sets: 1 },
    ]);
  });

  it('lists the most recent records first, limited to five', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-03-01', [[ids.bench, [[5, 100]]]]);
    logWorkout(db, '2026-03-08', [[ids.squat, [[5, 140]]]]);

    const recent = getDashboard(db, TODAY).recent_records;

    expect(recent).toHaveLength(5);
    expect(recent[0].exercise_id).toBe(ids.squat);
  });
});

describe('getExerciseProgress', () => {
  it('aggregates one point per workout with 1RM, top weight and volume', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-03-01', [[ids.bench, [[5, 100], [5, 100]]]]);
    logWorkout(db, '2026-03-08', [[ids.bench, [[8, 80], [3, 110]]]]);

    const { points } = getExerciseProgress(db, ids.bench, 'all', TODAY);

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ date: '2026-03-01', est_1rm: 116.67, max_weight: 100, volume: 1000 });
    expect(points[1]).toMatchObject({ date: '2026-03-08', est_1rm: 121, max_weight: 110, volume: 970 });
  });

  it('respects the time range', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2025-11-01', [[ids.bench, [[5, 90]]]]);
    logWorkout(db, '2026-03-01', [[ids.bench, [[5, 100]]]]);

    expect(getExerciseProgress(db, ids.bench, '1m', TODAY).points).toHaveLength(1);
    expect(getExerciseProgress(db, ids.bench, '3m', TODAY).points).toHaveLength(1);
    expect(getExerciseProgress(db, ids.bench, '6m', TODAY).points).toHaveLength(2);
    expect(getExerciseProgress(db, ids.bench, 'all', TODAY).points).toHaveLength(2);
  });

  it('returns the full PR history regardless of range', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2025-11-01', [[ids.bench, [[5, 90]]]]);
    logWorkout(db, '2026-03-01', [[ids.bench, [[5, 100]]]]);

    const { records } = getExerciseProgress(db, ids.bench, '1m', TODAY);

    expect(records.some((r) => r.achieved_at === '2025-11-01')).toBe(true);
  });
});

describe('sample data', () => {
  it('produces about 9 weeks of workouts with rising weights and PRs', () => {
    const { db } = createTestDb();
    db.exec('DELETE FROM exercises');
    seedExercises(db);
    const count = seedSampleWorkouts(db, TODAY);

    expect(count).toBeGreaterThanOrEqual(26);
    expect(count).toBeLessThanOrEqual(36);

    const dashboard = getDashboard(db, TODAY);
    expect(dashboard.streak_weeks).toBeGreaterThanOrEqual(8);
    expect(dashboard.recent_records).toHaveLength(5);

    const bench = db.prepare("SELECT id FROM exercises WHERE name = 'Bench Press'").get().id;
    const { points } = getExerciseProgress(db, bench, 'all', TODAY);
    expect(points.at(-1).max_weight).toBeGreaterThan(points[0].max_weight);
    expect(startOfWeek(points[0].date)).toBe(addDays(startOfWeek(TODAY), -56));
  });
});
