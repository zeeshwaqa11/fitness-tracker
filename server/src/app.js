import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import exercisesRouter from './routes/exercises.js';
import recordsRouter from './routes/records.js';
import settingsRouter from './routes/settings.js';
import statsRouter from './routes/stats.js';
import workoutsRouter from './routes/workouts.js';

export function createApp(db) {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/exercises', exercisesRouter(db));
  app.use('/api/workouts', workoutsRouter(db));
  app.use('/api/records', recordsRouter(db));
  app.use('/api/stats', statsRouter(db));
  app.use('/api/settings', settingsRouter(db));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
