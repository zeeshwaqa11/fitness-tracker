import { RECORD_TYPES } from '../constants.js';
import { getExerciseSessions } from './exerciseHistory.js';

const round = (n, places = 2) => {
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
};

export const epley1RM = (weight, reps) => weight * (1 + reps / 30);

export function summarizeSets(sets) {
  if (sets.length === 0) return null;

  let maxWeight = 0;
  let best1RM = 0;
  let maxReps = 0;
  let volume = 0;

  for (const { reps, weight_kg: weight } of sets) {
    maxWeight = Math.max(maxWeight, weight);
    best1RM = Math.max(best1RM, epley1RM(weight, reps));
    maxReps = Math.max(maxReps, reps);
    volume += reps * weight;
  }

  return {
    max_weight: round(maxWeight),
    est_1rm: round(best1RM),
    max_reps: maxReps,
    max_volume: round(volume),
  };
}

export function detectNewRecords(bests, summary) {
  const found = [];
  for (const type of RECORD_TYPES) {
    const value = summary[type];
    const previous = bests[type];
    if (value > 0 && (previous === undefined || value > previous)) {
      found.push({ record_type: type, value, previous_value: previous ?? null });
    }
  }
  return found;
}

export function recalculateExercise(db, exerciseId) {
  const insert = db.prepare(`
    INSERT INTO personal_records (exercise_id, record_type, value, previous_value, workout_id, achieved_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    db.prepare('DELETE FROM personal_records WHERE exercise_id = ?').run(exerciseId);

    const bests = {};
    for (const session of getExerciseSessions(db, exerciseId)) {
      const summary = summarizeSets(session.sets);
      for (const record of detectNewRecords(bests, summary)) {
        insert.run(exerciseId, record.record_type, record.value, record.previous_value, session.workoutId, session.date);
        bests[record.record_type] = record.value;
      }
    }
  })();
}

export function recalculateExercises(db, exerciseIds) {
  db.transaction(() => {
    for (const id of new Set(exerciseIds)) recalculateExercise(db, id);
  })();
}

export function recalculateAll(db) {
  const ids = db.prepare('SELECT id FROM exercises').all().map((row) => row.id);
  recalculateExercises(db, ids);
}

const RECORD_COLUMNS = `
  pr.id, pr.exercise_id, pr.record_type, pr.value, pr.previous_value, pr.workout_id, pr.achieved_at,
  e.name AS exercise_name, e.muscle_group, e.equipment
`;

export function getCurrentRecords(db) {
  return db.prepare(`
    SELECT ${RECORD_COLUMNS}
    FROM personal_records pr
    JOIN exercises e ON e.id = pr.exercise_id
    WHERE pr.id = (
      SELECT p2.id FROM personal_records p2
      WHERE p2.exercise_id = pr.exercise_id AND p2.record_type = pr.record_type
      ORDER BY p2.value DESC, p2.id DESC
      LIMIT 1
    )
    ORDER BY e.muscle_group, e.name, pr.record_type
  `).all();
}

export function getRecordsForWorkout(db, workoutId) {
  return db.prepare(`
    SELECT ${RECORD_COLUMNS}
    FROM personal_records pr
    JOIN exercises e ON e.id = pr.exercise_id
    WHERE pr.workout_id = ?
    ORDER BY pr.id
  `).all(workoutId);
}

export function getRecentRecords(db, limit = 5) {
  return db.prepare(`
    SELECT ${RECORD_COLUMNS}
    FROM personal_records pr
    JOIN exercises e ON e.id = pr.exercise_id
    ORDER BY pr.achieved_at DESC, pr.id DESC
    LIMIT ?
  `).all(limit);
}

export function getExerciseRecordHistory(db, exerciseId) {
  return db.prepare(`
    SELECT ${RECORD_COLUMNS}
    FROM personal_records pr
    JOIN exercises e ON e.id = pr.exercise_id
    WHERE pr.exercise_id = ?
    ORDER BY pr.achieved_at DESC, pr.id DESC
  `).all(exerciseId);
}
