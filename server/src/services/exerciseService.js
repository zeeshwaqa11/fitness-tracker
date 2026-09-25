import { conflict, forbidden, notFound } from '../middleware/validate.js';
import { getExerciseSessions } from './exerciseHistory.js';

const SELECT_WITH_USAGE = `
  SELECT e.id, e.name, e.muscle_group, e.equipment, e.is_custom, e.created_at,
    (SELECT COUNT(*) FROM workout_exercises we WHERE we.exercise_id = e.id) AS workout_count
  FROM exercises e
`;

export function listExercises(db, { search = null, muscleGroup = null, equipment = null } = {}) {
  return db.prepare(`
    ${SELECT_WITH_USAGE}
    WHERE (@search IS NULL OR e.name LIKE '%' || @search || '%')
      AND (@muscleGroup IS NULL OR e.muscle_group = @muscleGroup)
      AND (@equipment IS NULL OR e.equipment = @equipment)
    ORDER BY e.muscle_group, e.name
  `).all({ search, muscleGroup, equipment });
}

export function getExercise(db, id) {
  const exercise = db.prepare(`${SELECT_WITH_USAGE} WHERE e.id = ?`).get(id);
  if (!exercise) throw notFound('Exercise');
  return exercise;
}

export function getLastSession(db, id, before = null) {
  getExercise(db, id);
  const sessions = getExerciseSessions(db, id).filter((session) => before === null || session.date < before);
  const last = sessions.at(-1);
  return last ? { workout_id: last.workoutId, date: last.date, sets: last.sets } : null;
}

function assertNameFree(db, name, ignoreId = null) {
  const existing = db.prepare('SELECT id FROM exercises WHERE name = ?').get(name);
  if (existing && existing.id !== ignoreId) throw conflict(`An exercise named "${name}" already exists`);
}

export function createExercise(db, { name, muscle_group, equipment }) {
  assertNameFree(db, name);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO exercises (name, muscle_group, equipment, is_custom) VALUES (?, ?, ?, 1)')
    .run(name, muscle_group, equipment);
  return getExercise(db, Number(lastInsertRowid));
}

export function updateExercise(db, id, { name, muscle_group, equipment }) {
  const existing = getExercise(db, id);
  if (!existing.is_custom) throw forbidden('Built-in exercises cannot be edited');
  assertNameFree(db, name, id);
  db.prepare('UPDATE exercises SET name = ?, muscle_group = ?, equipment = ? WHERE id = ?').run(
    name,
    muscle_group,
    equipment,
    id,
  );
  return getExercise(db, id);
}

export function deleteExercise(db, id) {
  const existing = getExercise(db, id);
  if (!existing.is_custom) throw forbidden('Built-in exercises cannot be deleted');
  if (existing.workout_count > 0) {
    throw conflict(`"${existing.name}" is used in ${existing.workout_count} workout(s). Remove it from those workouts first.`);
  }
  db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
}
