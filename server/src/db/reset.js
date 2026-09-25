import { db } from './connection.js';
import { resetDatabase } from './seed.js';

const empty = process.argv.includes('--empty');

resetDatabase(db, { empty });

const workouts = db.prepare('SELECT COUNT(*) AS n FROM workouts').get().n;
const exercises = db.prepare('SELECT COUNT(*) AS n FROM exercises').get().n;
console.log(`Database reset: ${exercises} exercises, ${workouts} workouts${empty ? ' (empty state)' : ' (sample data)'}.`);
