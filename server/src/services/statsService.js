import { RANGES } from '../constants.js';
import { addDays, addMonths, startOfMonth, startOfWeek } from '../utils/dates.js';
import { getExerciseSessions } from './exerciseHistory.js';
import { getRecentRecords, getExerciseRecordHistory, summarizeSets } from './prService.js';

const WEEKS_IN_CHART = 8;
const MUSCLE_WINDOW_DAYS = 30;
const RECENT_RECORD_COUNT = 5;

const RANGE_MONTHS = { '1m': 1, '3m': 3, '6m': 6 };

export function rangeStart(range, today) {
  if (!RANGES.includes(range)) throw new RangeError(`Unknown range: ${range}`);
  return range === 'all' ? null : addMonths(today, -RANGE_MONTHS[range]);
}

function countWorkouts(db, from, to) {
  return db.prepare('SELECT COUNT(*) AS n FROM workouts WHERE date >= ? AND date <= ?').get(from, to).n;
}

function volumeBetween(db, from, to) {
  return db.prepare(`
    SELECT COALESCE(SUM(s.reps * s.weight_kg), 0) AS volume
    FROM workout_sets s
    JOIN workout_exercises we ON we.id = s.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    WHERE w.date >= ? AND w.date <= ?
  `).get(from, to).volume;
}

function currentStreak(db, thisWeekStart) {
  const activeWeeks = new Set(
    db.prepare('SELECT DISTINCT date FROM workouts').all().map((row) => startOfWeek(row.date)),
  );

  let cursor = activeWeeks.has(thisWeekStart) ? thisWeekStart : addDays(thisWeekStart, -7);
  let streak = 0;
  while (activeWeeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

function workoutsPerWeek(db, thisWeekStart) {
  const firstWeek = addDays(thisWeekStart, -7 * (WEEKS_IN_CHART - 1));
  const buckets = new Map();
  for (let i = 0; i < WEEKS_IN_CHART; i += 1) buckets.set(addDays(firstWeek, 7 * i), 0);

  const rows = db
    .prepare('SELECT date FROM workouts WHERE date >= ? AND date <= ?')
    .all(firstWeek, addDays(thisWeekStart, 6));
  for (const { date } of rows) {
    const week = startOfWeek(date);
    buckets.set(week, buckets.get(week) + 1);
  }

  return [...buckets].map(([week_start, count]) => ({ week_start, count }));
}

function setsByMuscleGroup(db, today) {
  return db.prepare(`
    SELECT e.muscle_group, COUNT(s.id) AS sets
    FROM workout_sets s
    JOIN workout_exercises we ON we.id = s.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    JOIN exercises e ON e.id = we.exercise_id
    WHERE w.date >= ? AND w.date <= ?
    GROUP BY e.muscle_group
    ORDER BY sets DESC, e.muscle_group
  `).all(addDays(today, -(MUSCLE_WINDOW_DAYS - 1)), today);
}

export function getDashboard(db, today) {
  const weekStart = startOfWeek(today);
  const lastWeekStart = addDays(weekStart, -7);
  const monthStart = startOfMonth(today);

  return {
    workouts_this_week: countWorkouts(db, weekStart, addDays(weekStart, 6)),
    workouts_this_month: countWorkouts(db, monthStart, `${monthStart.slice(0, 7)}-31`),
    streak_weeks: currentStreak(db, weekStart),
    volume_this_week_kg: volumeBetween(db, weekStart, addDays(weekStart, 6)),
    volume_last_week_kg: volumeBetween(db, lastWeekStart, addDays(lastWeekStart, 6)),
    workouts_per_week: workoutsPerWeek(db, weekStart),
    sets_by_muscle_group: setsByMuscleGroup(db, today),
    recent_records: getRecentRecords(db, RECENT_RECORD_COUNT),
  };
}

export function getExerciseProgress(db, exerciseId, range, today) {
  const sessions = getExerciseSessions(db, exerciseId, { from: rangeStart(range, today) });

  const points = sessions.map((session) => {
    const summary = summarizeSets(session.sets);
    return {
      workout_id: session.workoutId,
      date: session.date,
      est_1rm: summary.est_1rm,
      max_weight: summary.max_weight,
      volume: summary.max_volume,
    };
  });

  return { range, points, records: getExerciseRecordHistory(db, exerciseId) };
}
