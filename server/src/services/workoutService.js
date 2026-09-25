import { badRequest, notFound } from '../middleware/validate.js';
import { getRecordsForWorkout, recalculateExercises } from './prService.js';

function assertExercisesExist(db, exerciseIds) {
  const find = db.prepare('SELECT id FROM exercises WHERE id = ?');
  for (const id of exerciseIds) {
    if (!find.get(id)) throw badRequest(`Exercise ${id} does not exist`);
  }
}

function insertExercises(db, workoutId, exercises) {
  const insertExercise = db.prepare(
    'INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)',
  );
  const insertSet = db.prepare(
    'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight_kg) VALUES (?, ?, ?, ?)',
  );

  exercises.forEach((exercise, index) => {
    const { lastInsertRowid } = insertExercise.run(workoutId, exercise.exercise_id, index + 1);
    exercise.sets.forEach((set, setIndex) => {
      insertSet.run(lastInsertRowid, setIndex + 1, set.reps, set.weight_kg);
    });
  });
}

function exerciseIdsOfWorkout(db, workoutId) {
  return db
    .prepare('SELECT exercise_id FROM workout_exercises WHERE workout_id = ?')
    .all(workoutId)
    .map((row) => row.exercise_id);
}

export function createWorkout(db, input) {
  const exerciseIds = input.exercises.map((e) => e.exercise_id);
  assertExercisesExist(db, exerciseIds);

  return db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO workouts (date, name, notes, duration_minutes) VALUES (?, ?, ?, ?)')
      .run(input.date, input.name, input.notes, input.duration_minutes);
    const workoutId = Number(lastInsertRowid);

    insertExercises(db, workoutId, input.exercises);
    recalculateExercises(db, exerciseIds);
    return workoutId;
  })();
}

export function updateWorkout(db, workoutId, input) {
  if (!db.prepare('SELECT 1 FROM workouts WHERE id = ?').get(workoutId)) throw notFound('Workout');

  const newExerciseIds = input.exercises.map((e) => e.exercise_id);
  assertExercisesExist(db, newExerciseIds);

  return db.transaction(() => {
    const previousExerciseIds = exerciseIdsOfWorkout(db, workoutId);

    db.prepare('UPDATE workouts SET date = ?, name = ?, notes = ?, duration_minutes = ? WHERE id = ?').run(
      input.date,
      input.name,
      input.notes,
      input.duration_minutes,
      workoutId,
    );
    db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(workoutId);
    insertExercises(db, workoutId, input.exercises);

    recalculateExercises(db, [...previousExerciseIds, ...newExerciseIds]);
    return workoutId;
  })();
}

export function deleteWorkout(db, workoutId) {
  if (!db.prepare('SELECT 1 FROM workouts WHERE id = ?').get(workoutId)) throw notFound('Workout');

  db.transaction(() => {
    const affected = exerciseIdsOfWorkout(db, workoutId);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
    recalculateExercises(db, affected);
  })();
}

export function getWorkout(db, workoutId) {
  const workout = db.prepare('SELECT id, date, name, notes, duration_minutes, created_at FROM workouts WHERE id = ?').get(workoutId);
  if (!workout) throw notFound('Workout');

  const records = getRecordsForWorkout(db, workoutId);

  const exercises = db.prepare(`
    SELECT we.id, we.exercise_id, we.position, e.name, e.muscle_group, e.equipment
    FROM workout_exercises we
    JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = ?
    ORDER BY we.position
  `).all(workoutId);

  const findSets = db.prepare(
    'SELECT id, set_number, reps, weight_kg FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number',
  );

  let totalVolume = 0;
  for (const exercise of exercises) {
    exercise.sets = findSets.all(exercise.id);
    exercise.volume_kg = exercise.sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
    exercise.records = records.filter((r) => r.exercise_id === exercise.exercise_id);
    totalVolume += exercise.volume_kg;
  }

  return { ...workout, total_volume_kg: totalVolume, exercises, records };
}

export function listWorkouts(db, { from = null, to = null, exerciseId = null } = {}) {
  return db.prepare(`
    SELECT w.id, w.date, w.name, w.notes, w.duration_minutes,
      COUNT(DISTINCT we.id) AS exercise_count,
      COUNT(s.id) AS set_count,
      COALESCE(SUM(s.reps * s.weight_kg), 0) AS total_volume_kg,
      (SELECT COUNT(*) FROM personal_records pr WHERE pr.workout_id = w.id) AS record_count
    FROM workouts w
    LEFT JOIN workout_exercises we ON we.workout_id = w.id
    LEFT JOIN workout_sets s ON s.workout_exercise_id = we.id
    WHERE (@from IS NULL OR w.date >= @from)
      AND (@to IS NULL OR w.date <= @to)
      AND (@exerciseId IS NULL OR EXISTS (
        SELECT 1 FROM workout_exercises x WHERE x.workout_id = w.id AND x.exercise_id = @exerciseId
      ))
    GROUP BY w.id
    ORDER BY w.date DESC, w.id DESC
  `).all({ from, to, exerciseId });
}
