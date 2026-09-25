CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  muscle_group TEXT NOT NULL CHECK (muscle_group IN ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio')),
  equipment TEXT NOT NULL CHECK (equipment IN ('Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable')),
  is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  name TEXT,
  notes TEXT,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_workouts_date ON workouts (date);

CREATE TABLE workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises (id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  UNIQUE (workout_id, exercise_id),
  UNIQUE (workout_id, position)
);

CREATE INDEX idx_workout_exercises_exercise ON workout_exercises (exercise_id);

CREATE TABLE workout_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises (id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight_kg REAL NOT NULL CHECK (weight_kg >= 0),
  UNIQUE (workout_exercise_id, set_number)
);

CREATE TABLE personal_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('max_weight', 'est_1rm', 'max_reps', 'max_volume')),
  value REAL NOT NULL,
  previous_value REAL,
  workout_id INTEGER NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
  achieved_at TEXT NOT NULL
);

CREATE INDEX idx_personal_records_exercise ON personal_records (exercise_id, record_type);
CREATE INDEX idx_personal_records_workout ON personal_records (workout_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
