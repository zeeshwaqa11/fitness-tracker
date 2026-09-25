import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import ConfirmButton from '../components/ConfirmButton.jsx';
import PrBadge from '../components/PrBadge.jsx';
import { ErrorMessage, Loading, PageHeader } from '../components/Status.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { RECORD_LABELS, RECORD_ORDER, formatDate, formatRecordValue, plural } from '../utils/format.js';
import { formatNumber, kgToDisplay } from '../utils/units.js';

function ExerciseDetail({ exercise }) {
  const { unit, formatWeight } = useSettings();
  const records = [...exercise.records].sort((a, b) => RECORD_ORDER.indexOf(a.record_type) - RECORD_ORDER.indexOf(b.record_type));

  return (
    <section className="card">
      <div className="exercise-head">
        <div>
          <h3>
            <Link to={`/progress/${exercise.exercise_id}`}>{exercise.name}</Link> {records.length > 0 && <PrBadge />}
          </h3>
          <span className="muted small">
            {exercise.muscle_group} · {formatWeight(exercise.volume_kg)} volume
          </span>
        </div>
      </div>

      <table className="sets-table read-only">
        <thead>
          <tr>
            <th>Set</th>
            <th>Reps</th>
            <th>Weight ({unit})</th>
          </tr>
        </thead>
        <tbody>
          {exercise.sets.map((set) => (
            <tr key={set.id}>
              <td className="set-number">{set.set_number}</td>
              <td>{set.reps}</td>
              <td>{formatNumber(kgToDisplay(set.weight_kg, unit))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {records.length > 0 && (
        <ul className="pr-list">
          {records.map((record) => (
            <li key={record.id}>
              <PrBadge type={record.record_type}>{RECORD_LABELS[record.record_type]}</PrBadge>{' '}
              <span className="strong">{formatRecordValue(record.record_type, record.value, unit)}</span>
              {record.previous_value !== null && (
                <span className="muted small"> (previous {formatRecordValue(record.record_type, record.previous_value, unit)})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { formatWeight } = useSettings();
  const { data: workout, error, loading, reload } = useApi(() => api.get(`/workouts/${id}`), [id]);
  const [deleteError, setDeleteError] = useState(null);

  if (loading && !workout) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const justSaved = Boolean(location.state?.justSaved);
  const recordCount = workout.records.length;

  const remove = async () => {
    try {
      await api.delete(`/workouts/${workout.id}`);
      navigate('/history');
    } catch (failure) {
      setDeleteError(failure);
    }
  };

  const setCount = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  return (
    <>
      <PageHeader title={workout.name || 'Workout'} subtitle={formatDate(workout.date)}>
        <Link to={`/log/${workout.id}`} className="btn">
          Edit
        </Link>
        <ConfirmButton onConfirm={remove}>Delete</ConfirmButton>
      </PageHeader>

      {justSaved && (
        <div className={`alert ${recordCount > 0 ? 'alert-pr' : 'alert-success'}`} role="status">
          <strong>Workout saved.</strong>{' '}
          {recordCount > 0 ? (
            <>
              <PrBadge /> You set {plural(recordCount, 'new personal record')} in this workout.
            </>
          ) : (
            'No new personal records this time. Keep pushing.'
          )}
        </div>
      )}

      <ErrorMessage error={deleteError} />

      <section className="card summary">
        <div>
          <span className="stat-label">Total volume</span>
          <span className="stat-value">{formatWeight(workout.total_volume_kg)}</span>
        </div>
        <div>
          <span className="stat-label">Exercises</span>
          <span className="stat-value">{workout.exercises.length}</span>
        </div>
        <div>
          <span className="stat-label">Sets</span>
          <span className="stat-value">{setCount}</span>
        </div>
        {workout.duration_minutes && (
          <div>
            <span className="stat-label">Duration</span>
            <span className="stat-value">{workout.duration_minutes} min</span>
          </div>
        )}
        {recordCount > 0 && (
          <div>
            <span className="stat-label">Records</span>
            <span className="stat-value">
              <PrBadge>{recordCount} PR{recordCount === 1 ? '' : 's'}</PrBadge>
            </span>
          </div>
        )}
      </section>

      {workout.notes && (
        <section className="card">
          <h2>Notes</h2>
          <p>{workout.notes}</p>
        </section>
      )}

      {workout.exercises.map((exercise) => (
        <ExerciseDetail key={exercise.id} exercise={exercise} />
      ))}

      <p>
        <Link to="/history">← Back to history</Link>
      </p>
    </>
  );
}
