import { Router } from 'express';
import {
  badRequest,
  optionalDate,
  optionalId,
  optionalPositiveInt,
  optionalString,
  requireDate,
  requireId,
  requireReps,
  requireWeightKg,
} from '../middleware/validate.js';
import { createWorkout, deleteWorkout, getWorkout, listWorkouts, updateWorkout } from '../services/workoutService.js';

const MAX_EXERCISES = 30;
const MAX_SETS = 50;

function parseSet(set, label) {
  if (typeof set !== 'object' || set === null) throw badRequest(`${label} must be an object`);
  return {
    reps: requireReps(set.reps, `${label}.reps`),
    weight_kg: requireWeightKg(set.weight_kg, `${label}.weight_kg`),
  };
}

function parseExercise(exercise, index) {
  const label = `exercises[${index}]`;
  if (typeof exercise !== 'object' || exercise === null) throw badRequest(`${label} must be an object`);
  if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
    throw badRequest(`${label} needs at least one set`);
  }
  if (exercise.sets.length > MAX_SETS) throw badRequest(`${label} can have at most ${MAX_SETS} sets`);

  return {
    exercise_id: requireId(exercise.exercise_id, `${label}.exercise_id`),
    sets: exercise.sets.map((set, i) => parseSet(set, `${label}.sets[${i}]`)),
  };
}

function parseWorkout(body = {}) {
  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    throw badRequest('A workout needs at least one exercise');
  }
  if (body.exercises.length > MAX_EXERCISES) throw badRequest(`A workout can have at most ${MAX_EXERCISES} exercises`);

  const exercises = body.exercises.map(parseExercise);
  const ids = exercises.map((e) => e.exercise_id);
  if (new Set(ids).size !== ids.length) throw badRequest('An exercise can only appear once per workout');

  return {
    date: requireDate(body.date, 'date'),
    name: optionalString(body.name, 'name', { max: 100 }),
    notes: optionalString(body.notes, 'notes', { max: 2000 }),
    duration_minutes: optionalPositiveInt(body.duration_minutes, 'duration_minutes', { max: 1440 }),
    exercises,
  };
}

export default function workoutsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const from = optionalDate(req.query.from, 'from');
    const to = optionalDate(req.query.to, 'to');
    if (from && to && from > to) throw badRequest('from must not be after to');

    res.json(listWorkouts(db, { from, to, exerciseId: optionalId(req.query.exerciseId, 'exerciseId') }));
  });

  router.get('/:id', (req, res) => {
    res.json(getWorkout(db, requireId(req.params.id, 'id')));
  });

  router.post('/', (req, res) => {
    const id = createWorkout(db, parseWorkout(req.body));
    res.status(201).json(getWorkout(db, id));
  });

  router.put('/:id', (req, res) => {
    const id = updateWorkout(db, requireId(req.params.id, 'id'), parseWorkout(req.body));
    res.json(getWorkout(db, id));
  });

  router.delete('/:id', (req, res) => {
    deleteWorkout(db, requireId(req.params.id, 'id'));
    res.status(204).end();
  });

  return router;
}
