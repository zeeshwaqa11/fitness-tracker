import { todayISO } from '../utils/dates.js';
import { createWorkout } from '../services/workoutService.js';
import { EXERCISE_LIBRARY } from './exerciseData.js';
import { generateSampleWorkouts } from './sampleWorkouts.js';

export function seedExercises(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO exercises (name, muscle_group, equipment, is_custom) VALUES (?, ?, ?, 0)');
  db.transaction(() => {
    for (const [name, muscleGroup, equipment] of EXERCISE_LIBRARY) insert.run(name, muscleGroup, equipment);
  })();
}

export function seedSampleWorkouts(db, today = todayISO()) {
  const idByName = new Map(db.prepare('SELECT id, name FROM exercises').all().map((row) => [row.name, row.id]));
  const workouts = generateSampleWorkouts(today, idByName);

  db.transaction(() => {
    for (const workout of workouts) createWorkout(db, workout);
  })();
  return workouts.length;
}

export function seedAll(db) {
  seedExercises(db);
  return seedSampleWorkouts(db);
}

export function resetDatabase(db, { empty = false } = {}) {
  db.transaction(() => {
    for (const table of ['personal_records', 'workout_sets', 'workout_exercises', 'workouts', 'exercises']) {
      db.exec(`DELETE FROM ${table}`);
    }
    db.exec("DELETE FROM sqlite_sequence WHERE name != 'settings'");
    seedExercises(db);
    if (!empty) seedSampleWorkouts(db);
  })();
}
