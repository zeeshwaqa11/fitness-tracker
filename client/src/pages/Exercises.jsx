import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, query } from '../api/client.js';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { EmptyState, ErrorMessage, Loading, PageHeader } from '../components/Status.jsx';
import { useApi } from '../hooks/useApi.js';
import { EQUIPMENT, MUSCLE_GROUPS, groupByMuscle } from '../utils/format.js';

const EMPTY_FORM = { name: '', muscle_group: 'Chest', equipment: 'Barbell' };

function ExerciseForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(new Error('Give the exercise a name.'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...form, name: form.name.trim() });
    } catch (failure) {
      setError(failure);
      setSaving(false);
    }
  };

  return (
    <form className="card exercise-form" onSubmit={submit} noValidate>
      <label>
        <span>Name</span>
        <input type="text" value={form.name} onChange={setField('name')} maxLength={100} autoFocus />
      </label>
      <label>
        <span>Muscle group</span>
        <select value={form.muscle_group} onChange={setField('muscle_group')}>
          {MUSCLE_GROUPS.map((group) => (
            <option key={group}>{group}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Equipment</span>
        <select value={form.equipment} onChange={setField('equipment')}>
          {EQUIPMENT.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {submitLabel}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
      <ErrorMessage error={error} />
    </form>
  );
}

export default function Exercises() {
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data, error, loading, reload } = useApi(
    () => api.get(`/exercises${query({ search: search.trim(), muscleGroup })}`),
    [search, muscleGroup],
  );

  const create = async (values) => {
    await api.post('/exercises', values);
    setAdding(false);
    reload();
  };

  const update = async (id, values) => {
    await api.put(`/exercises/${id}`, values);
    setEditingId(null);
    reload();
  };

  const remove = async (exercise) => {
    setActionError(null);
    try {
      await api.delete(`/exercises/${exercise.id}`);
      reload();
    } catch (failure) {
      setActionError(failure);
    }
  };

  const groups = data ? groupByMuscle(data) : [];

  return (
    <>
      <PageHeader title="Exercises" subtitle="Your exercise library. Built-in exercises are read-only; custom ones can be edited or deleted.">
        {!adding && (
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            Add exercise
          </button>
        )}
      </PageHeader>

      {adding && (
        <ExerciseForm initial={EMPTY_FORM} submitLabel="Add exercise" onSubmit={create} onCancel={() => setAdding(false)} />
      )}

      <section className="card filters">
        <label>
          <span>Search</span>
          <input type="search" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          <span>Muscle group</span>
          <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
            <option value="">All</option>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
        </label>
      </section>

      <ErrorMessage error={actionError} />

      {error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading />
      ) : groups.length === 0 ? (
        <EmptyState title="No exercises found">Try a different search or add a custom exercise.</EmptyState>
      ) : (
        groups.map(([group, items]) => (
          <section key={group} className="card">
            <h2>{group}</h2>
            <ul className="list">
              {items.map((exercise) =>
                editingId === exercise.id ? (
                  <li key={exercise.id}>
                    <ExerciseForm
                      initial={{ name: exercise.name, muscle_group: exercise.muscle_group, equipment: exercise.equipment }}
                      submitLabel="Save"
                      onSubmit={(values) => update(exercise.id, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li key={exercise.id} className="list-row">
                    <div>
                      <Link to={`/progress/${exercise.id}`} className="strong">
                        {exercise.name}
                      </Link>{' '}
                      {exercise.is_custom ? <span className="badge">Custom</span> : null}
                      <div className="muted small">
                        {exercise.equipment} · logged in {exercise.workout_count} workout{exercise.workout_count === 1 ? '' : 's'}
                      </div>
                    </div>
                    {exercise.is_custom ? (
                      <div className="row-actions">
                        <button type="button" className="btn btn-small" onClick={() => setEditingId(exercise.id)}>
                          Edit
                        </button>
                        <ConfirmButton className="btn btn-small btn-danger" onConfirm={() => remove(exercise)}>
                          Delete
                        </ConfirmButton>
                      </div>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
