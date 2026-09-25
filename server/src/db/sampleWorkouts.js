import { addDays, startOfWeek } from '../utils/dates.js';

const WEEKS = 9;
const DELOAD_WEEK = 5;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const snap = (value, step) => Math.round(value / step) * step;

const lift = (name, base, weekly, step, reps) => ({ name, base, weekly, step, reps });

const TEMPLATES = {
  push: {
    label: 'Push Day',
    day: 0,
    lifts: [
      lift('Bench Press', 60, 1.25, 2.5, [8, 8, 7, 6]),
      lift('Overhead Press', 40, 0.75, 1.25, [8, 8, 7]),
      lift('Incline Dumbbell Press', 22, 0.5, 1, [10, 9, 8]),
      lift('Lateral Raise', 8, 0.25, 1, [12, 12, 10]),
      lift('Triceps Pushdown', 25, 0.75, 2.5, [12, 10, 10]),
    ],
  },
  pull: {
    label: 'Pull Day',
    day: 2,
    lifts: [
      lift('Deadlift', 100, 3, 2.5, [5, 5, 5]),
      lift('Pull-up', 0, 0, 1, [6, 6, 5, 5]),
      lift('Barbell Row', 60, 1, 2.5, [8, 8, 8]),
      lift('Lat Pulldown', 50, 1, 2.5, [10, 10, 9]),
      lift('Barbell Curl', 25, 0.6, 1.25, [10, 9, 8]),
    ],
  },
  legs: {
    label: 'Leg Day',
    day: 4,
    lifts: [
      lift('Squat', 80, 2.5, 2.5, [6, 6, 6, 5]),
      lift('Romanian Deadlift', 70, 1.5, 2.5, [8, 8, 8]),
      lift('Leg Press', 140, 5, 5, [10, 10, 9]),
      lift('Leg Curl', 40, 1, 2.5, [12, 10, 10]),
      lift('Calf Raise', 60, 2, 2.5, [15, 15, 12]),
    ],
  },
  upper: {
    label: 'Upper Body',
    day: 5,
    lifts: [
      lift('Incline Dumbbell Press', 20, 0.5, 1, [10, 10, 8]),
      lift('Seated Cable Row', 45, 1, 2.5, [10, 10, 10]),
      lift('Face Pull', 20, 0.5, 2.5, [15, 15, 12]),
      lift('Dumbbell Curl', 12, 0.25, 1, [10, 10, 8]),
    ],
  },
};

const NOTES = [
  'Felt strong today.',
  'Slept badly, kept it controlled.',
  'Great pump.',
  'Shoulder a bit tight, warmed up longer.',
  'Rushed session, short rests.',
];

function buildSets(spec, week, rng) {
  const deload = week === DELOAD_WEEK ? 0.9 : 1;
  const weight = spec.base === 0 ? 0 : snap((spec.base + spec.weekly * week) * deload, spec.step);
  const bonusReps = spec.base === 0 ? Math.floor(week / 2) : 0;

  return spec.reps.map((reps) => {
    const jitter = rng() < 0.2 ? -1 : 0;
    return { reps: Math.max(1, reps + bonusReps + jitter), weight_kg: weight };
  });
}

export function generateSampleWorkouts(today, exerciseIdByName) {
  const rng = mulberry32(20240607);
  const thisWeek = startOfWeek(today);
  const workouts = [];

  for (let week = 0; week < WEEKS; week += 1) {
    const weekStart = addDays(thisWeek, -7 * (WEEKS - 1 - week));
    const templates = week % 2 === 1 ? ['push', 'pull', 'legs', 'upper'] : ['push', 'pull', 'legs'];

    for (const key of templates) {
      const template = TEMPLATES[key];
      const date = addDays(weekStart, template.day);
      if (date > today) continue;
      if (key !== 'push' && rng() < 0.1) continue;

      workouts.push({
        date,
        name: template.label,
        notes: rng() < 0.3 ? NOTES[Math.floor(rng() * NOTES.length)] : null,
        duration_minutes: 50 + Math.floor(rng() * 7) * 5,
        exercises: template.lifts.map((spec) => ({
          exercise_id: exerciseIdByName.get(spec.name),
          sets: buildSets(spec, week, rng),
        })),
      });
    }
  }

  return workouts;
}
