import { Router } from 'express';
import { WEIGHT_UNITS } from '../constants.js';
import { requireEnum } from '../middleware/validate.js';
import { resetDatabase } from '../db/seed.js';

const RESET_MODES = ['sample', 'empty'];

function readSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export default function settingsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(readSettings(db));
  });

  router.put('/', (req, res) => {
    const unit = requireEnum(req.body?.weight_unit, 'weight_unit', WEIGHT_UNITS);
    db.prepare("INSERT INTO settings (key, value) VALUES ('weight_unit', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(unit);
    res.json(readSettings(db));
  });

  router.post('/reset', (req, res) => {
    const mode = requireEnum(req.body?.mode, 'mode', RESET_MODES);
    resetDatabase(db, { empty: mode === 'empty' });
    res.json({ mode });
  });

  return router;
}
