import { defaultDbPath, openDatabase } from './database.js';

const { db, created } = openDatabase();

export { db, defaultDbPath as dbPath, created as isNewDatabase };
