import { Router } from 'express';
import { optionalPositiveInt } from '../middleware/validate.js';
import { getCurrentRecords, getRecentRecords } from '../services/prService.js';

export default function recordsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(getCurrentRecords(db));
  });

  router.get('/recent', (req, res) => {
    const limit = optionalPositiveInt(req.query.limit, 'limit', { max: 100 }) ?? 5;
    res.json(getRecentRecords(db, limit));
  });

  return router;
}
