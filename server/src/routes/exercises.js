import { Router } from 'express';
import { EQUIPMENT, MUSCLE_GROUPS } from '../constants.js';
import {
  optionalDate,
  optionalEnum,
  optionalString,
  requireEnum,
  requireId,
  requireString,
} from '../middleware/validate.js';
import {
  createExercise,
  deleteExercise,
  getExercise,
  getLastSession,
  listExercises,
  updateExercise,
} from '../services/exerciseService.js';

function parseExercise(body = {}) {
  return {
    name: requireString(body.name, 'name'),
    muscle_group: requireEnum(body.muscle_group, 'muscle_group', MUSCLE_GROUPS),
    equipment: requireEnum(body.equipment, 'equipment', EQUIPMENT),
  };
}

export default function exercisesRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(
      listExercises(db, {
        search: optionalString(req.query.search, 'search', { max: 100 }),
        muscleGroup: optionalEnum(req.query.muscleGroup, 'muscleGroup', MUSCLE_GROUPS),
        equipment: optionalEnum(req.query.equipment, 'equipment', EQUIPMENT),
      }),
    );
  });

  router.get('/:id', (req, res) => {
    res.json(getExercise(db, requireId(req.params.id, 'id')));
  });

  router.get('/:id/last-session', (req, res) => {
    res.json(getLastSession(db, requireId(req.params.id, 'id'), optionalDate(req.query.before, 'before')));
  });

  router.post('/', (req, res) => {
    res.status(201).json(createExercise(db, parseExercise(req.body)));
  });

  router.put('/:id', (req, res) => {
    res.json(updateExercise(db, requireId(req.params.id, 'id'), parseExercise(req.body)));
  });

  router.delete('/:id', (req, res) => {
    deleteExercise(db, requireId(req.params.id, 'id'));
    res.status(204).end();
  });

  return router;
}
