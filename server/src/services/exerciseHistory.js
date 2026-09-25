const SESSIONS_SQL = `
  SELECT w.id AS workout_id, w.date, s.reps, s.weight_kg
  FROM workout_exercises we
  JOIN workouts w ON w.id = we.workout_id
  JOIN workout_sets s ON s.workout_exercise_id = we.id
  WHERE we.exercise_id = @exerciseId AND (@from IS NULL OR w.date >= @from)
  ORDER BY w.date, w.id, s.set_number
`;

export function getExerciseSessions(db, exerciseId, { from = null } = {}) {
  const rows = db.prepare(SESSIONS_SQL).all({ exerciseId, from });
  const sessions = [];
  let current = null;

  for (const row of rows) {
    if (!current || current.workoutId !== row.workout_id) {
      current = { workoutId: row.workout_id, date: row.date, sets: [] };
      sessions.push(current);
    }
    current.sets.push({ reps: row.reps, weight_kg: row.weight_kg });
  }
  return sessions;
}
