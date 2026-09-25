import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import ExercisePicker from '../components/ExercisePicker.jsx';
import { ErrorMessage, Loading, PageHeader } from '../components/Status.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { formatDate, todayISO } from '../utils/format.js';
import { kgToDisplay } from '../utils/units.js';
import {
  addSet,
  blankForm,
  fromWorkout,
  newExerciseEntry,
  removeSet,
  toPayload,
  updateSet,
  validateForm,
} from '../utils/workoutForm.js';

function LastSessionHint({ session, unit }) {
  if (!session) return null;
  const summary = session.sets.map((set) => `${set.reps}×${kgToDisplay(set.weight_kg, unit)}`).join(', ');
  return (
    <p className="muted small">
      Last time ({formatDate(session.date)}): {summary} {unit}
    </p>
  );
}

function ExerciseBlock({ entry, unit, focusKey, onChange, onRemove }) {
  const focusRef = useRef(null);

  useEffect(() => {
    if (focusKey && focusRef.current) focusRef.current.focus();
  }, [focusKey]);

  return (
    <section className="card exercise-block">
      <div className="exercise-head">
        <div>
          <h3>{entry.name}</h3>
          <span className="muted small">{entry.muscle_group}</span>
        </div>
        <button type="button" className="btn btn-small btn-ghost" onClick={onRemove}>
          Remove exercise
        </button>
      </div>
      <LastSessionHint session={entry.lastSession} unit={unit} />

      <table className="sets-table">
        <thead>
          <tr>
            <th>Set</th>
            <th>Reps</th>
            <th>Weight ({unit})</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((set, index) => (
            <tr key={set.key}>
              <td className="set-number">{index + 1}</td>
              <td>
                <input
                  ref={set.key === focusKey ? focusRef : undefined}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={set.reps}
                  onChange={(event) => onChange(updateSet(entry, set.key, 'reps', event.target.value))}
                  aria-label={`${entry.name} set ${index + 1} reps`}
                />
              </td>
              <td>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={set.weight}
                  onChange={(event) => onChange(updateSet(entry, set.key, 'weight', event.target.value))}
                  aria-label={`${entry.name} set ${index + 1} weight`}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-small btn-ghost"
                  onClick={() => onChange(removeSet(entry, set.key))}
                  aria-label={`Remove ${entry.name} set ${index + 1}`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className="btn btn-small" onClick={() => onChange(addSet(entry))}>
        + Add set
      </button>
    </section>
  );
}

export default function LogWorkout() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { unit } = useSettings();

  const [exercises, setExercises] = useState([]);
  const [form, setForm] = useState(() => blankForm(todayISO()));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [focusKey, setFocusKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([api.get('/exercises'), editing ? api.get(`/workouts/${id}`) : null])
      .then(([exerciseList, workout]) => {
        if (cancelled) return;
        setExercises(exerciseList);
        setForm(workout ? fromWorkout(workout, unit) : blankForm(todayISO()));
      })
      .catch((error) => !cancelled && setLoadError(error))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, editing]);

  const usedIds = useMemo(() => form.exercises.map((entry) => entry.exercise_id), [form.exercises]);

  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const updateEntry = (key, next) =>
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((entry) => (entry.key === key ? { ...next, key } : entry)),
    }));

  const removeEntry = (key) =>
    setForm((current) => ({ ...current, exercises: current.exercises.filter((entry) => entry.key !== key) }));

  const pickExercise = async (exercise) => {
    setPicking(false);
    let lastSession = null;
    try {
      const before = form.date ? `?before=${form.date}` : '';
      lastSession = await api.get(`/exercises/${exercise.id}/last-session${before}`);
    } catch {
      lastSession = null;
    }

    const entry = newExerciseEntry(exercise, lastSession, unit);
    setForm((current) => ({ ...current, exercises: [...current.exercises, entry] }));
    setFocusKey(entry.sets[0].key);
  };

  const handleEntryChange = (entry, next) => {
    updateEntry(entry.key, next);
    if (next.sets.length > entry.sets.length) setFocusKey(next.sets.at(-1).key);
  };

  const save = async (event) => {
    event.preventDefault();
    const problems = validateForm(form);
    setErrors(problems);
    if (problems.length > 0) return;

    setSaving(true);
    try {
      const payload = toPayload(form, unit);
      const saved = editing ? await api.put(`/workouts/${id}`, payload) : await api.post('/workouts', payload);
      navigate(`/history/${saved.id}`, { state: { justSaved: true } });
    } catch (error) {
      setErrors([error.message]);
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (loadError) return <ErrorMessage error={loadError} />;

  return (
    <form onSubmit={save} noValidate>
      <PageHeader title={editing ? 'Edit workout' : 'Log workout'} subtitle={`Weights are entered in ${unit}.`} />

      <section className="card form-grid">
        <label>
          <span>Date</span>
          <input type="date" value={form.date} onChange={setField('date')} required />
        </label>
        <label>
          <span>Name (optional)</span>
          <input type="text" value={form.name} onChange={setField('name')} placeholder="Push Day" maxLength={100} />
        </label>
        <label>
          <span>Duration in minutes (optional)</span>
          <input type="number" min="1" step="1" value={form.duration} onChange={setField('duration')} placeholder="60" />
        </label>
        <label className="span-all">
          <span>Notes (optional)</span>
          <textarea rows="2" value={form.notes} onChange={setField('notes')} maxLength={2000} />
        </label>
      </section>

      {form.exercises.map((entry) => (
        <ExerciseBlock
          key={entry.key}
          entry={entry}
          unit={unit}
          focusKey={entry.sets.some((set) => set.key === focusKey) ? focusKey : null}
          onChange={(next) => handleEntryChange(entry, next)}
          onRemove={() => removeEntry(entry.key)}
        />
      ))}

      {picking ? (
        <ExercisePicker exercises={exercises} excludeIds={usedIds} onPick={pickExercise} onClose={() => setPicking(false)} />
      ) : (
        <button type="button" className="btn btn-block" onClick={() => setPicking(true)}>
          + Add exercise
        </button>
      )}

      {errors.length > 0 && (
        <div className="alert alert-error" role="alert">
          <ul>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Save workout'}
        </button>
        <button type="button" className="btn" onClick={() => navigate(-1)} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
