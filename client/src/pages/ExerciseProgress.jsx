import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api/client.js';
import { TrendLineChart } from '../components/Charts.jsx';
import { EmptyState, ErrorMessage, Loading, PageHeader } from '../components/Status.jsx';
import { SERIES_COLORS } from '../charts/setup.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { RECORD_LABELS, formatDate, formatRecordValue, formatShortDate, groupByMuscle } from '../utils/format.js';
import { kgToDisplay } from '../utils/units.js';

const RANGES = [
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: 'all', label: 'All time' },
];

function ExerciseSelect({ exercises, value, onChange }) {
  const groups = groupByMuscle(exercises);

  return (
    <label className="picker-select">
      <span>Exercise</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="" disabled>
          Choose an exercise…
        </option>
        {groups.map(([group, items]) => (
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
  );
}

function ProgressCharts({ exerciseId }) {
  const { unit } = useSettings();
  const [range, setRange] = useState('3m');
  const { data, error, loading, reload } = useApi(
    () => api.get(`/stats/exercises/${exerciseId}/progress?range=${range}`),
    [exerciseId, range],
  );

  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const labels = data.points.map((point) => formatShortDate(point.date));
  const titles = data.points.map((point) => formatDate(point.date));
  const weights = (key) => data.points.map((point) => kgToDisplay(point[key], unit));
  const bodyweightOnly = data.points.length > 0 && data.points.every((point) => point.max_weight === 0);

  const charts = [
    { key: 'est_1rm', title: 'Estimated 1RM', label: 'Est. 1RM', values: weights('est_1rm'), unit },
    { key: 'max_weight', title: 'Heaviest weight', label: 'Heaviest weight', values: weights('max_weight'), unit },
    { key: 'volume', title: 'Total volume', label: 'Volume', values: weights('volume'), unit },
  ];

  return (
    <>
      <div className="segmented" role="group" aria-label="Time range">
        {RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`segment${range === option.value ? ' is-active' : ''}`}
            aria-pressed={range === option.value}
            onClick={() => setRange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {data.points.length === 0 ? (
        <EmptyState title="No data in this range">
          {range === 'all' ? 'Log a workout with this exercise to see progress.' : 'Try a longer time range.'}
        </EmptyState>
      ) : (
        <>
          {bodyweightOnly && (
            <p className="muted">All sessions were logged at 0 {unit}, so the charts stay flat. Records track reps for bodyweight work.</p>
          )}
          <div className="chart-grid" style={{ opacity: loading ? 0.6 : 1 }}>
            {charts.map((chart) => (
              <section key={chart.key} className="card">
                <h2>{chart.title}</h2>
                <TrendLineChart
                  labels={labels}
                  tooltipTitles={titles}
                  values={chart.values}
                  label={chart.label}
                  color={SERIES_COLORS[chart.key]}
                  unit={chart.unit}
                />
              </section>
            ))}
          </div>
        </>
      )}

      <section className="card">
        <h2>PR history</h2>
        {data.records.length === 0 ? (
          <EmptyState title="No records yet">Records appear once you log this exercise.</EmptyState>
        ) : (
          <ul className="list">
            {data.records.map((record) => (
              <li key={record.id} className="list-row">
                <div>
                  <span className="strong">{RECORD_LABELS[record.record_type]}</span>
                  <div className="muted small">{formatDate(record.achieved_at)}</div>
                </div>
                <div className="right">
                  <span className="strong">{formatRecordValue(record.record_type, record.value, unit)}</span>
                  {record.previous_value !== null && (
                    <div className="muted small">was {formatRecordValue(record.record_type, record.previous_value, unit)}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function ExerciseProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: exercises, error, reload } = useApi(() => api.get('/exercises'));

  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  if (!exercises) return <Loading />;

  const selected = exercises.find((exercise) => String(exercise.id) === id);

  return (
    <>
      <PageHeader title="Exercise progress" subtitle={selected ? `${selected.muscle_group} · ${selected.equipment}` : 'Pick an exercise to see how it is trending.'}>
        <ExerciseSelect exercises={exercises} value={selected?.id} onChange={(next) => navigate(`/progress/${next}`)} />
      </PageHeader>

      {selected ? (
        <ProgressCharts key={selected.id} exerciseId={selected.id} />
      ) : (
        <EmptyState title={id ? 'Exercise not found' : 'No exercise selected'}>Choose one from the list above.</EmptyState>
      )}
    </>
  );
}
