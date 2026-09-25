import { displayToKg, kgToDisplay } from './units.js';

let counter = 0;
const nextKey = () => {
  counter += 1;
  return `k${counter}`;
};

export const emptySet = () => ({ key: nextKey(), reps: '', weight: '' });

export function blankForm(date) {
  return { date, name: '', notes: '', duration: '', exercises: [] };
}

export function newExerciseEntry(exercise, lastSession, unit) {
  const first = lastSession?.sets?.[0];
  return {
    key: nextKey(),
    exercise_id: exercise.id,
    name: exercise.name,
    muscle_group: exercise.muscle_group,
    lastSession: lastSession ?? null,
    sets: [
      first
        ? { key: nextKey(), reps: String(first.reps), weight: String(kgToDisplay(first.weight_kg, unit)) }
        : emptySet(),
    ],
  };
}

export function addSet(entry) {
  const previous = entry.sets.at(-1);
  const created = previous ? { key: nextKey(), reps: previous.reps, weight: previous.weight } : emptySet();
  return { ...entry, sets: [...entry.sets, created] };
}

export function updateSet(entry, key, field, value) {
  return { ...entry, sets: entry.sets.map((set) => (set.key === key ? { ...set, [field]: value } : set)) };
}

export function removeSet(entry, key) {
  return { ...entry, sets: entry.sets.filter((set) => set.key !== key) };
}

export function fromWorkout(workout, unit) {
  return {
    date: workout.date,
    name: workout.name ?? '',
    notes: workout.notes ?? '',
    duration: workout.duration_minutes ? String(workout.duration_minutes) : '',
    exercises: workout.exercises.map((exercise) => ({
      key: nextKey(),
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      lastSession: null,
      sets: exercise.sets.map((set) => {
        const weight = String(kgToDisplay(set.weight_kg, unit));
        return { key: nextKey(), reps: String(set.reps), weight, savedWeight: weight, savedKg: set.weight_kg };
      }),
    })),
  };
}

const isWholeNumber = (value) => /^\d+$/.test(String(value).trim()) && Number(value) > 0;
const isWeight = (value) => String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

export function validateForm(form) {
  const errors = [];
  if (!form.date) errors.push('Pick a date for the workout.');
  if (form.duration !== '' && !isWholeNumber(form.duration)) errors.push('Duration must be a whole number of minutes.');
  if (form.exercises.length === 0) errors.push('Add at least one exercise.');

  for (const entry of form.exercises) {
    if (entry.sets.length === 0) errors.push(`${entry.name} needs at least one set.`);
    entry.sets.forEach((set, index) => {
      if (!isWholeNumber(set.reps)) errors.push(`${entry.name}, set ${index + 1}: enter reps as a whole number above 0.`);
      if (!isWeight(set.weight)) errors.push(`${entry.name}, set ${index + 1}: enter a weight (0 for bodyweight).`);
    });
  }
  return errors;
}

export function toPayload(form, unit) {
  return {
    date: form.date,
    name: form.name.trim() || null,
    notes: form.notes.trim() || null,
    duration_minutes: form.duration === '' ? null : Number(form.duration),
    exercises: form.exercises.map((entry) => ({
      exercise_id: entry.exercise_id,
      sets: entry.sets.map((set) => ({
        reps: Number(set.reps),
        weight_kg: set.savedKg !== undefined && set.weight === set.savedWeight ? set.savedKg : displayToKg(Number(set.weight), unit),
      })),
    })),
  };
}
