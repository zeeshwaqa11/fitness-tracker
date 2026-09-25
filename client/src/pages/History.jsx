import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, query } from '../api/client.js';
import PrBadge from '../components/PrBadge.jsx';
import { EmptyState, ErrorMessage, Loading, PageHeader } from '../components/Status.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, groupByMuscle, plural } from '../utils/format.js';

export default function History() {
  const { formatWeight } = useSettings();
  const [filters, setFilters] = useState({ from: '', to: '', exerciseId: '' });

  const exercises = useApi(() => api.get('/exercises'));
  const workouts = useApi(() => api.get(`/workouts${query(filters)}`), [filters.from, filters.to, filters.exerciseId]);

  const setFilter = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;

  const groupedExercises = exercises.data ? groupByMuscle(exercises.data) : [];

  return (
    <>
      <PageHeader title="Workout history" subtitle="Every workout you have logged, newest first.">
        <Link to="/log" className="btn btn-primary">
          Log workout
        </Link>
      </PageHeader>

      <section className="card filters">
        <label>
          <span>From</span>
          <input type="date" value={filters.from} onChange={setFilter('from')} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={filters.to} onChange={setFilter('to')} />
        </label>
        <label>
          <span>Exercise</span>
          <select value={filters.exerciseId} onChange={setFilter('exerciseId')}>
            <option value="">All exercises</option>
            {groupedExercises.map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button type="button" className="btn" onClick={() => setFilters({ from: '', to: '', exerciseId: '' })}>
            Clear filters
          </button>
        )}
      </section>

      {rangeInvalid ? (
        <div className="alert alert-error">The start date must not be after the end date.</div>
      ) : workouts.error ? (
        <ErrorMessage error={workouts.error} onRetry={workouts.reload} />
      ) : workouts.loading && !workouts.data ? (
        <Loading />
      ) : workouts.data.length === 0 ? (
        <EmptyState title={hasFilters ? 'No workouts match these filters' : 'No workouts yet'}>
          {hasFilters ? 'Try widening the date range or clearing the exercise filter.' : 'Log your first workout to see it here.'}
        </EmptyState>
      ) : (
        <ul className="list card">
          {workouts.data.map((workout) => (
            <li key={workout.id}>
              <Link to={`/history/${workout.id}`} className="list-row list-link">
                <div>
                  <div className="strong">
                    {workout.name || 'Workout'} {workout.record_count > 0 && <PrBadge />}
                  </div>
                  <div className="muted small">{formatDate(workout.date)}</div>
                </div>
                <div className="right">
                  <div className="strong">{formatWeight(workout.total_volume_kg)}</div>
                  <div className="muted small">
                    {plural(workout.exercise_count, 'exercise')} · {plural(workout.set_count, 'set')}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
