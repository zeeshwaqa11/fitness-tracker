import { openDatabase } from '../src/db/database.js';
import { createWorkout } from '../src/services/workoutService.js';

export function createTestDb() {
  const { db } = openDatabase(':memory:');
  const insert = db.prepare('INSERT INTO exercises (name, muscle_group, equipment) VALUES (?, ?, ?)');
  const bench = Number(insert.run('Bench Press', 'Chest', 'Barbell').lastInsertRowid);
  const squat = Number(insert.run('Squat', 'Legs', 'Barbell').lastInsertRowid);
  const pullUp = Number(insert.run('Pull-up', 'Back', 'Bodyweight').lastInsertRowid);
  return { db, ids: { bench, squat, pullUp } };
}

export function logWorkout(db, date, exercises, extra = {}) {
  return createWorkout(db, {
    date,
    name: null,
    notes: null,
    duration_minutes: null,
    ...extra,
    exercises: exercises.map(([exercise_id, sets]) => ({
      exercise_id,
      sets: sets.map(([reps, weight_kg]) => ({ reps, weight_kg })),
    })),
  });
}

export function recordsFor(db, exerciseId) {
  return db
    .prepare('SELECT record_type, value, previous_value, workout_id, achieved_at FROM personal_records WHERE exercise_id = ? ORDER BY id')
    .all(exerciseId);
}
