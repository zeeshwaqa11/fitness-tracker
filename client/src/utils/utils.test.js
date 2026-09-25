import { describe, expect, it } from 'vitest';
import { formatDate, formatRecordValue, groupBy } from './format.js';
import { displayToKg, formatWeight, kgToDisplay } from './units.js';
import {
  addSet,
  emptySet,
  fromWorkout,
  newExerciseEntry,
  removeSet,
  toPayload,
  updateSet,
  validateForm,
} from './workoutForm.js';

describe('unit conversion', () => {
  it('leaves kilograms untouched', () => {
    expect(kgToDisplay(62.5, 'kg')).toBe(62.5);
    expect(displayToKg(62.5, 'kg')).toBe(62.5);
  });

  it('converts to pounds for display', () => {
    expect(kgToDisplay(100, 'lbs')).toBe(220.46);
    expect(formatWeight(100, 'lbs')).toBe('220.46 lbs');
  });

  it('round-trips typical gym weights entered in pounds', () => {
    for (const lbs of [2.5, 45, 95, 135, 185, 225, 315, 405]) {
      expect(kgToDisplay(displayToKg(lbs, 'lbs'), 'lbs')).toBe(lbs);
    }
  });

  it('formats large numbers with separators', () => {
    expect(formatWeight(12345.5, 'kg')).toBe('12,345.5 kg');
  });
});

describe('formatting helpers', () => {
  it('formats record values by type', () => {
    expect(formatRecordValue('max_reps', 12, 'kg')).toBe('12 reps');
    expect(formatRecordValue('max_weight', 100, 'kg')).toBe('100 kg');
  });

  it('formats dates without timezone drift', () => {
    expect(formatDate('2026-03-01')).toContain('1 Mar 2026');
  });

  it('groups items preserving order', () => {
    const groups = groupBy([{ g: 'a', n: 1 }, { g: 'b', n: 2 }, { g: 'a', n: 3 }], (item) => item.g);
    expect([...groups.keys()]).toEqual(['a', 'b']);
    expect(groups.get('a').map((item) => item.n)).toEqual([1, 3]);
  });
});

describe('workout form helpers', () => {
  const bench = { id: 1, name: 'Bench Press', muscle_group: 'Chest' };

  it('starts a new exercise with the last session first set', () => {
    const entry = newExerciseEntry(bench, { sets: [{ reps: 8, weight_kg: 60 }] }, 'kg');
    expect(entry.sets).toHaveLength(1);
    expect(entry.sets[0]).toMatchObject({ reps: '8', weight: '60' });
  });

  it('shows the previous weight in the chosen unit', () => {
    const entry = newExerciseEntry(bench, { sets: [{ reps: 5, weight_kg: 100 }] }, 'lbs');
    expect(entry.sets[0].weight).toBe('220.46');
  });

  it('starts with a blank set when there is no history', () => {
    const entry = newExerciseEntry(bench, null, 'kg');
    expect(entry.sets[0]).toMatchObject({ reps: '', weight: '' });
  });

  it('copies the previous set when adding a set', () => {
    let entry = { ...newExerciseEntry(bench, null, 'kg'), sets: [{ ...emptySet(), reps: '8', weight: '60' }] };
    entry = addSet(entry);
    expect(entry.sets).toHaveLength(2);
    expect(entry.sets[1]).toMatchObject({ reps: '8', weight: '60' });
    expect(entry.sets[1].key).not.toBe(entry.sets[0].key);
  });

  it('edits only the targeted set after copying', () => {
    let entry = { ...newExerciseEntry(bench, null, 'kg'), sets: [{ ...emptySet(), reps: '8', weight: '60' }] };
    entry = addSet(entry);
    entry = updateSet(entry, entry.sets[1].key, 'weight', '62.5');
    expect(entry.sets.map((set) => set.weight)).toEqual(['60', '62.5']);
  });

  it('removes a set by key', () => {
    let entry = { ...newExerciseEntry(bench, null, 'kg'), sets: [{ ...emptySet(), reps: '8', weight: '60' }] };
    entry = addSet(entry);
    entry = removeSet(entry, entry.sets[0].key);
    expect(entry.sets).toHaveLength(1);
  });

  it('validates required fields and set values', () => {
    const empty = { date: '2026-03-01', name: '', notes: '', duration: '', exercises: [] };
    expect(validateForm(empty)).toContain('Add at least one exercise.');

    const bad = { ...empty, exercises: [{ ...newExerciseEntry(bench, null, 'kg') }] };
    expect(validateForm(bad).length).toBe(2);

    const good = { ...empty, exercises: [{ ...bench, name: 'Bench Press', sets: [{ key: 'a', reps: '5', weight: '100' }] }] };
    expect(validateForm(good)).toEqual([]);
  });

  it('allows zero weight for bodyweight movements', () => {
    const form = {
      date: '2026-03-01',
      name: '',
      notes: '',
      duration: '',
      exercises: [{ name: 'Pull-up', sets: [{ key: 'a', reps: '8', weight: '0' }] }],
    };
    expect(validateForm(form)).toEqual([]);
  });

  it('builds an API payload in kilograms', () => {
    const form = {
      date: '2026-03-01',
      name: ' Push ',
      notes: '',
      duration: '45',
      exercises: [{ exercise_id: 1, name: 'Bench Press', sets: [{ key: 'a', reps: '5', weight: '225' }] }],
    };

    const payload = toPayload(form, 'lbs');

    expect(payload).toMatchObject({ name: 'Push', notes: null, duration_minutes: 45 });
    expect(payload.exercises[0].sets[0]).toEqual({ reps: 5, weight_kg: 102.0583 });
  });

  it('does not drift stored weights when an edit leaves them untouched in lbs mode', () => {
    const workout = {
      date: '2026-03-01',
      name: null,
      notes: null,
      duration_minutes: null,
      exercises: [{ exercise_id: 1, name: 'Squat', muscle_group: 'Legs', sets: [{ reps: 5, weight_kg: 100 }, { reps: 5, weight_kg: 60 }] }],
    };

    const form = fromWorkout(workout, 'lbs');
    form.exercises[0].sets[1] = updateSet(form.exercises[0], form.exercises[0].sets[1].key, 'weight', '140').sets[1];
    const sets = toPayload(form, 'lbs').exercises[0].sets;

    expect(sets[0].weight_kg).toBe(100);
    expect(sets[1].weight_kg).toBe(63.5029);
  });

  it('loads a saved workout back into the form using the display unit', () => {
    const form = fromWorkout(
      {
        date: '2026-03-01',
        name: null,
        notes: null,
        duration_minutes: null,
        exercises: [{ exercise_id: 1, name: 'Bench Press', muscle_group: 'Chest', sets: [{ reps: 5, weight_kg: 102.0583 }] }],
      },
      'lbs',
    );

    expect(form.exercises[0].sets[0]).toMatchObject({ reps: '5', weight: '225' });
    expect(form.name).toBe('');
  });
});
