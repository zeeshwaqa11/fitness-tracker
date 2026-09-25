import { createApp } from './app.js';
import { db, dbPath, isNewDatabase } from './db/connection.js';
import { seedAll } from './db/seed.js';

if (isNewDatabase && process.env.SEED !== 'false') {
  const count = seedAll(db);
  console.log(`New database created and seeded with the exercise library and ${count} sample workouts.`);
}

const port = Number(process.env.PORT) || 5000;
createApp(db).listen(port, () => {
  console.log(`API listening on http://localhost:${port}  (database: ${dbPath})`);
});
