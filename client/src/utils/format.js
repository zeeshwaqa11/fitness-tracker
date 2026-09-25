import { formatNumber, formatWeight } from './units.js';

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable'];

export const RECORD_LABELS = {
  max_weight: 'Heaviest weight',
  est_1rm: 'Estimated 1RM',
  max_reps: 'Most reps in a set',
  max_volume: 'Best workout volume',
};

export const RECORD_ORDER = ['max_weight', 'est_1rm', 'max_reps', 'max_volume'];

const parseDate = (value) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const formatUTC = (value, options) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(parseDate(value));

export const formatDate = (value) =>
  formatUTC(value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const formatShortDate = (value) => formatUTC(value, { day: 'numeric', month: 'short' });

export function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatRecordValue(type, value, unit) {
  if (type === 'max_reps') return `${formatNumber(value)} reps`;
  return formatWeight(value, unit);
}

export function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

export function groupByMuscle(exercises) {
  const groups = groupBy(exercises, (exercise) => exercise.muscle_group);
  return MUSCLE_GROUPS.filter((name) => groups.has(name)).map((name) => [name, groups.get(name)]);
}

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
