import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createTestDb } from './helpers.js';

let server;
let base;
let ids;
let db;

async function call(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const workoutBody = (overrides = {}) => ({
  date: '2026-03-01',
  name: 'Push Day',
  exercises: [{ exercise_id: ids.bench, sets: [{ reps: 5, weight_kg: 100 }, { reps: 5, weight_kg: 100 }] }],
  ...overrides,
});

beforeAll(async () => {
  const test = createTestDb();
  db = test.db;
  ids = test.ids;
  await new Promise((resolve) => {
    server = createApp(db).listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  db.exec('DELETE FROM personal_records; DELETE FROM workout_sets; DELETE FROM workout_exercises; DELETE FROM workouts;');
  db.exec("DELETE FROM exercises WHERE is_custom = 1");
});

describe('exercises API', () => {
  it('lists, searches and filters exercises', async () => {
    const all = await call('GET', '/api/exercises');
    expect(all.body).toHaveLength(3);

    const search = await call('GET', '/api/exercises?search=bench');
    expect(search.body.map((e) => e.name)).toEqual(['Bench Press']);

    const group = await call('GET', '/api/exercises?muscleGroup=Legs');
    expect(group.body.map((e) => e.name)).toEqual(['Squat']);
  });

  it('creates, edits and deletes a custom exercise', async () => {
    const created = await call('POST', '/api/exercises', { name: 'Zercher Squat', muscle_group: 'Legs', equipment: 'Barbell' });
    expect(created.status).toBe(201);
    expect(created.body.is_custom).toBe(1);

    const edited = await call('PUT', `/api/exercises/${created.body.id}`, { name: 'Zercher Squats', muscle_group: 'Legs', equipment: 'Barbell' });
    expect(edited.body.name).toBe('Zercher Squats');

    expect((await call('DELETE', `/api/exercises/${created.body.id}`)).status).toBe(204);
    expect((await call('GET', `/api/exercises/${created.body.id}`)).status).toBe(404);
  });

  it('returns the last logged session for an exercise', async () => {
    expect((await call('GET', `/api/exercises/${ids.bench}/last-session`)).body).toBeNull();

    await call('POST', '/api/workouts', workoutBody({ date: '2026-03-01' }));
    await call('POST', '/api/workouts', workoutBody({
      date: '2026-03-08',
      exercises: [{ exercise_id: ids.bench, sets: [{ reps: 3, weight_kg: 120 }] }],
    }));

    const last = await call('GET', `/api/exercises/${ids.bench}/last-session`);
    expect(last.body).toMatchObject({ date: '2026-03-08', sets: [{ reps: 3, weight_kg: 120 }] });

    const before = await call('GET', `/api/exercises/${ids.bench}/last-session?before=2026-03-08`);
    expect(before.body.date).toBe('2026-03-01');
  });

  it('rejects invalid input and duplicate names', async () => {
    expect((await call('POST', '/api/exercises', { name: '', muscle_group: 'Legs', equipment: 'Barbell' })).status).toBe(400);
    expect((await call('POST', '/api/exercises', { name: 'X', muscle_group: 'Neck', equipment: 'Barbell' })).status).toBe(400);
    expect((await call('POST', '/api/exercises', { name: 'bench press', muscle_group: 'Chest', equipment: 'Barbell' })).status).toBe(409);
  });

  it('protects built-in exercises and exercises that have been logged', async () => {
    expect((await call('DELETE', `/api/exercises/${ids.bench}`)).status).toBe(403);
    expect((await call('PUT', `/api/exercises/${ids.bench}`, { name: 'Bench', muscle_group: 'Chest', equipment: 'Barbell' })).status).toBe(403);

    const custom = await call('POST', '/api/exercises', { name: 'Custom Move', muscle_group: 'Core', equipment: 'Cable' });
    await call('POST', '/api/workouts', workoutBody({ exercises: [{ exercise_id: custom.body.id, sets: [{ reps: 10, weight_kg: 20 }] }] }));
    expect((await call('DELETE', `/api/exercises/${custom.body.id}`)).status).toBe(409);
  });
});

describe('workouts API', () => {
  it('creates a workout and returns its detail with new PRs', async () => {
    const created = await call('POST', '/api/workouts', workoutBody());

    expect(created.status).toBe(201);
    expect(created.body.total_volume_kg).toBe(1000);
    expect(created.body.exercises[0].sets).toHaveLength(2);
    expect(created.body.records.map((r) => r.record_type).sort()).toEqual(['est_1rm', 'max_reps', 'max_volume', 'max_weight']);
  });

  it('lists workouts newest first with summary numbers and filters', async () => {
    await call('POST', '/api/workouts', workoutBody({ date: '2026-03-01' }));
    await call('POST', '/api/workouts', workoutBody({
      date: '2026-03-08',
      exercises: [{ exercise_id: ids.squat, sets: [{ reps: 5, weight_kg: 140 }] }],
    }));

    const list = await call('GET', '/api/workouts');
    expect(list.body.map((w) => w.date)).toEqual(['2026-03-08', '2026-03-01']);
    expect(list.body[0]).toMatchObject({ exercise_count: 1, set_count: 1, total_volume_kg: 700 });

    expect((await call('GET', '/api/workouts?from=2026-03-05')).body).toHaveLength(1);
    expect((await call('GET', '/api/workouts?to=2026-03-05')).body).toHaveLength(1);
    expect((await call('GET', `/api/workouts?exerciseId=${ids.squat}`)).body).toHaveLength(1);
  });

  it('updates a workout and recalculates records', async () => {
    const first = await call('POST', '/api/workouts', workoutBody());
    const second = await call('POST', '/api/workouts', workoutBody({
      date: '2026-03-08',
      exercises: [{ exercise_id: ids.bench, sets: [{ reps: 5, weight_kg: 110 }] }],
    }));
    expect(second.body.records.some((r) => r.record_type === 'max_weight')).toBe(true);

    const edited = await call('PUT', `/api/workouts/${second.body.id}`, workoutBody({
      date: '2026-03-08',
      exercises: [{ exercise_id: ids.bench, sets: [{ reps: 5, weight_kg: 90 }] }],
    }));
    expect(edited.body.records).toEqual([]);

    const records = await call('GET', '/api/records');
    expect(records.body.find((r) => r.record_type === 'max_weight')).toMatchObject({ value: 100, workout_id: first.body.id });
  });

  it('deletes a workout and its records', async () => {
    const created = await call('POST', '/api/workouts', workoutBody());

    expect((await call('DELETE', `/api/workouts/${created.body.id}`)).status).toBe(204);
    expect((await call('GET', `/api/workouts/${created.body.id}`)).status).toBe(404);
    expect((await call('GET', '/api/records')).body).toEqual([]);
  });

  it('validates the workout payload', async () => {
    expect((await call('POST', '/api/workouts', workoutBody({ date: '2026-13-01' }))).status).toBe(400);
    expect((await call('POST', '/api/workouts', workoutBody({ exercises: [] }))).status).toBe(400);
    expect((await call('POST', '/api/workouts', workoutBody({ exercises: [{ exercise_id: ids.bench, sets: [] }] }))).status).toBe(400);
    expect((await call('POST', '/api/workouts', workoutBody({ exercises: [{ exercise_id: ids.bench, sets: [{ reps: 0, weight_kg: 10 }] }] }))).status).toBe(400);
    expect((await call('POST', '/api/workouts', workoutBody({ exercises: [{ exercise_id: ids.bench, sets: [{ reps: 5, weight_kg: -5 }] }] }))).status).toBe(400);
    expect((await call('POST', '/api/workouts', workoutBody({ exercises: [{ exercise_id: 9999, sets: [{ reps: 5, weight_kg: 5 }] }] }))).status).toBe(400);
    const duplicate = { exercise_id: ids.bench, sets: [{ reps: 5, weight_kg: 5 }] };
    expect((await call('POST', '/api/workouts', workoutBody({ exercises: [duplicate, duplicate] }))).status).toBe(400);
    expect((await call('PUT', '/api/workouts/9999', workoutBody())).status).toBe(404);
  });
});

describe('stats, records and settings API', () => {
  it('serves dashboard and progress data', async () => {
    await call('POST', '/api/workouts', workoutBody());

    const dashboard = await call('GET', '/api/stats/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.workouts_per_week).toHaveLength(8);

    const progress = await call('GET', `/api/stats/exercises/${ids.bench}/progress?range=all`);
    expect(progress.body.points).toHaveLength(1);
    expect(progress.body.exercise.name).toBe('Bench Press');

    expect((await call('GET', `/api/stats/exercises/${ids.bench}/progress?range=2y`)).status).toBe(400);
  });

  it('reads and updates the weight unit', async () => {
    expect((await call('GET', '/api/settings')).body.weight_unit).toBe('kg');
    expect((await call('PUT', '/api/settings', { weight_unit: 'lbs' })).body.weight_unit).toBe('lbs');
    expect((await call('PUT', '/api/settings', { weight_unit: 'stone' })).status).toBe(400);
    await call('PUT', '/api/settings', { weight_unit: 'kg' });
  });

  it('resets the database to sample data or an empty state', async () => {
    await call('POST', '/api/workouts', workoutBody());

    expect((await call('POST', '/api/settings/reset', { mode: 'empty' })).status).toBe(200);
    expect((await call('GET', '/api/workouts')).body).toEqual([]);
    expect((await call('GET', '/api/exercises')).body.length).toBeGreaterThan(20);

    expect((await call('POST', '/api/settings/reset', { mode: 'sample' })).status).toBe(200);
    expect((await call('GET', '/api/workouts')).body.length).toBeGreaterThan(20);
    expect((await call('GET', '/api/records')).body.length).toBeGreaterThan(20);

    expect((await call('POST', '/api/settings/reset', { mode: 'nope' })).status).toBe(400);
  });
});
