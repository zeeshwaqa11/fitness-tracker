import { Router } from 'express';
import { RANGES } from '../constants.js';
import { requireEnum, requireId } from '../middleware/validate.js';
import { getExercise } from '../services/exerciseService.js';
import { getDashboard, getExerciseProgress } from '../services/statsService.js';
import { todayISO } from '../utils/dates.js';

export default function statsRouter(db) {
  const router = Router();

  router.get('/dashboard', (req, res) => {
    res.json(getDashboard(db, todayISO()));
  });

  router.get('/exercises/:id/progress', (req, res) => {
    const exercise = getExercise(db, requireId(req.params.id, 'id'));
    const range = requireEnum(req.query.range ?? 'all', 'range', RANGES);
    res.json({ exercise, ...getExerciseProgress(db, exercise.id, range, todayISO()) });
  });

  return router;
}
