import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const defaultDbPath = process.env.DB_PATH ?? path.resolve(here, '../../data/fitness.db');

const SCHEMA_VERSION = 1;

export function applySchema(db) {
  if (db.pragma('user_version', { simple: true }) >= SCHEMA_VERSION) return false;

  const schema = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');

  db.transaction(() => {
    db.exec(schema);
    db.prepare("INSERT INTO settings (key, value) VALUES ('weight_unit', 'kg')").run();
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  })();
  return true;
}

export function openDatabase(file = defaultDbPath) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  const created = applySchema(db);
  return { db, created };
}
