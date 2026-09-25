import { describe, expect, it } from 'vitest';
import {
  detectNewRecords,
  epley1RM,
  getCurrentRecords,
  recalculateExercise,
  summarizeSets,
} from '../src/services/prService.js';
import { deleteWorkout, updateWorkout } from '../src/services/workoutService.js';
import { createTestDb, logWorkout, recordsFor } from './helpers.js';

describe('epley1RM', () => {
  it('applies weight x (1 + reps / 30)', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.6667, 4);
    expect(epley1RM(60, 30)).toBeCloseTo(120, 6);
  });
});

describe('summarizeSets', () => {
  it('returns the best of each metric and the total volume', () => {
    const summary = summarizeSets([
      { reps: 5, weight_kg: 100 },
      { reps: 8, weight_kg: 80 },
      { reps: 3, weight_kg: 110 },
    ]);

    expect(summary).toEqual({
      max_weight: 110,
      est_1rm: 121,
      max_reps: 8,
      max_volume: 1470,
    });
  });

  it('returns null when there are no sets', () => {
    expect(summarizeSets([])).toBeNull();
  });
});

describe('detectNewRecords', () => {
  const summary = { max_weight: 100, est_1rm: 116.67, max_reps: 5, max_volume: 1500 };

  it('treats every positive metric as a record when nothing exists yet', () => {
    const found = detectNewRecords({}, summary);
    expect(found.map((r) => r.record_type)).toEqual(['max_weight', 'est_1rm', 'max_reps', 'max_volume']);
    expect(found.every((r) => r.previous_value === null)).toBe(true);
  });

  it('only reports metrics that strictly beat the current best', () => {
    const bests = { max_weight: 100, est_1rm: 120, max_reps: 4, max_volume: 1500 };
    const found = detectNewRecords(bests, summary);

    expect(found).toEqual([{ record_type: 'max_reps', value: 5, previous_value: 4 }]);
  });

  it('ignores zero values such as the weight of a bodyweight movement', () => {
    const found = detectNewRecords({}, { max_weight: 0, est_1rm: 0, max_reps: 12, max_volume: 0 });
    expect(found.map((r) => r.record_type)).toEqual(['max_reps']);
  });
});

describe('recording PRs when a workout is saved', () => {
  it('records a new PR for every metric on the first workout', () => {
    const { db, ids } = createTestDb();
    const workoutId = logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100], [5, 100]]]]);

    const records = recordsFor(db, ids.bench);
    expect(records.map((r) => r.record_type).sort()).toEqual(['est_1rm', 'max_reps', 'max_volume', 'max_weight']);
    expect(records.every((r) => r.workout_id === workoutId)).toBe(true);
  });

  it('detects a new PR when a later workout beats the existing record', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);
    const second = logWorkout(db, '2026-01-12', [[ids.bench, [[5, 105]]]]);

    const newRecords = recordsFor(db, ids.bench).filter((r) => r.workout_id === second);
    const byType = Object.fromEntries(newRecords.map((r) => [r.record_type, r]));

    expect(byType.max_weight).toMatchObject({ value: 105, previous_value: 100 });
    expect(byType.est_1rm.value).toBeCloseTo(122.5, 2);
    expect(byType.max_volume).toMatchObject({ value: 525, previous_value: 500 });
    expect(byType.max_reps).toBeUndefined();
  });

  it('does not record anything when a set does not beat the existing PR', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);
    const before = recordsFor(db, ids.bench).length;

    const weaker = logWorkout(db, '2026-01-12', [[ids.bench, [[4, 100]]]]);

    expect(recordsFor(db, ids.bench)).toHaveLength(before);
    expect(recordsFor(db, ids.bench).some((r) => r.workout_id === weaker)).toBe(false);
  });

  it('does not count a tie as a PR', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);
    const tie = logWorkout(db, '2026-01-12', [[ids.bench, [[5, 100]]]]);

    expect(recordsFor(db, ids.bench).some((r) => r.workout_id === tie)).toBe(false);
  });

  it('keeps history correct when a workout is logged with an earlier date', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-02-01', [[ids.bench, [[5, 110]]]]);
    const backdated = logWorkout(db, '2026-01-01', [[ids.bench, [[5, 100]]]]);

    const records = recordsFor(db, ids.bench);
    const maxWeight = records.filter((r) => r.record_type === 'max_weight');
    expect(maxWeight.map((r) => r.value)).toEqual([100, 110]);
    expect(maxWeight[0].workout_id).toBe(backdated);
  });

  it('tracks each exercise independently', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-01-05', [
      [ids.bench, [[5, 100]]],
      [ids.squat, [[5, 140]]],
    ]);

    const maxWeightOf = (id) => recordsFor(db, id).find((r) => r.record_type === 'max_weight').value;
    expect(maxWeightOf(ids.bench)).toBe(100);
    expect(maxWeightOf(ids.squat)).toBe(140);
  });

  it('only records reps for a bodyweight exercise logged at 0 kg', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-01-05', [[ids.pullUp, [[8, 0], [6, 0]]]]);

    expect(recordsFor(db, ids.pullUp).map((r) => r.record_type)).toEqual(['max_reps']);
  });
});

describe('recalculating PRs after edits and deletes', () => {
  it('rolls the PR back to the previous best when the record workout is deleted', () => {
    const { db, ids } = createTestDb();
    const first = logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);
    const second = logWorkout(db, '2026-01-12', [[ids.bench, [[5, 110]]]]);

    deleteWorkout(db, second);

    const current = getCurrentRecords(db).filter((r) => r.exercise_id === ids.bench);
    const maxWeight = current.find((r) => r.record_type === 'max_weight');
    expect(maxWeight).toMatchObject({ value: 100, workout_id: first });
    expect(recordsFor(db, ids.bench).some((r) => r.workout_id === second)).toBe(false);
  });

  it('removes every record for an exercise when its last workout is deleted', () => {
    const { db, ids } = createTestDb();
    const only = logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);

    deleteWorkout(db, only);

    expect(recordsFor(db, ids.bench)).toEqual([]);
  });

  it('promotes a later workout to PR holder when an earlier record is deleted', () => {
    const { db, ids } = createTestDb();
    const first = logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);
    const second = logWorkout(db, '2026-01-12', [[ids.bench, [[5, 100]]]]);

    deleteWorkout(db, first);

    const maxWeight = recordsFor(db, ids.bench).filter((r) => r.record_type === 'max_weight');
    expect(maxWeight).toHaveLength(1);
    expect(maxWeight[0]).toMatchObject({ value: 100, workout_id: second, previous_value: null });
  });

  it('recalculates when a set is edited down so it no longer beats the record', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);
    const second = logWorkout(db, '2026-01-12', [[ids.bench, [[5, 110]]]]);

    updateWorkout(db, second, {
      date: '2026-01-12',
      name: null,
      notes: null,
      duration_minutes: null,
      exercises: [{ exercise_id: ids.bench, sets: [{ reps: 5, weight_kg: 90 }] }],
    });

    const maxWeight = recordsFor(db, ids.bench).filter((r) => r.record_type === 'max_weight');
    expect(maxWeight.map((r) => r.value)).toEqual([100]);
  });

  it('recalculates the old exercise when it is removed from a workout during an edit', () => {
    const { db, ids } = createTestDb();
    const workout = logWorkout(db, '2026-01-05', [
      [ids.bench, [[5, 100]]],
      [ids.squat, [[5, 140]]],
    ]);

    updateWorkout(db, workout, {
      date: '2026-01-05',
      name: null,
      notes: null,
      duration_minutes: null,
      exercises: [{ exercise_id: ids.bench, sets: [{ reps: 5, weight_kg: 100 }] }],
    });

    expect(recordsFor(db, ids.squat)).toEqual([]);
    expect(recordsFor(db, ids.bench).length).toBeGreaterThan(0);
  });

  it('is idempotent: recalculating twice produces identical records', () => {
    const { db, ids } = createTestDb();
    logWorkout(db, '2026-01-05', [[ids.bench, [[5, 100]]]]);
    logWorkout(db, '2026-01-12', [[ids.bench, [[6, 102.5], [4, 107.5]]]]);

    const strip = (rows) => rows.map(({ record_type, value, workout_id }) => ({ record_type, value, workout_id }));
    const before = strip(recordsFor(db, ids.bench));
    recalculateExercise(db, ids.bench);

    expect(strip(recordsFor(db, ids.bench))).toEqual(before);
  });
});
