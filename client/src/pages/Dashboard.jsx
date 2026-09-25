import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { MuscleDoughnut, WeeklyBarChart } from '../components/Charts.jsx';
import { EmptyState, ErrorMessage, Loading, PageHeader } from '../components/Status.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { RECORD_LABELS, formatDate, formatRecordValue, formatShortDate, plural } from '../utils/format.js';

function StatCard({ label, value, hint, hintTone }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className={`stat-hint ${hintTone ?? ''}`}>{hint}</span>}
    </div>
  );
}

function volumeComparison(thisWeek, lastWeek) {
  if (lastWeek === 0) return { text: thisWeek === 0 ? 'No volume yet' : 'No workouts last week', tone: '' };
  const change = ((thisWeek - lastWeek) / lastWeek) * 100;
  const rounded = Math.round(change);
  const sign = rounded > 0 ? '+' : '';
  return { text: `${sign}${rounded}% vs last week`, tone: rounded >= 0 ? 'up' : 'down' };
}

export default function Dashboard() {
  const { formatWeight, unit } = useSettings();
  const { data, error, loading, reload } = useApi(() => api.get('/stats/dashboard'));

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const comparison = volumeComparison(data.volume_this_week_kg, data.volume_last_week_kg);
  const hasWorkouts = data.workouts_per_week.some((week) => week.count > 0);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your training at a glance.">
        <Link to="/log" className="btn btn-primary">
          Log workout
        </Link>
      </PageHeader>

      <section className="stat-grid" aria-label="Summary">
        <StatCard label="Workouts this week" value={data.workouts_this_week} />
        <StatCard label="Workouts this month" value={data.workouts_this_month} />
        <StatCard
          label="Current streak"
          value={plural(data.streak_weeks, 'week')}
          hint={data.streak_weeks > 0 ? 'Consecutive weeks with a workout' : 'Log a workout to start one'}
        />
        <StatCard
          label={`Volume this week`}
          value={formatWeight(data.volume_this_week_kg)}
          hint={comparison.text}
          hintTone={comparison.tone}
        />
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Workouts per week</h2>
          <p className="muted small">Last 8 weeks, weeks start on Monday</p>
          {hasWorkouts ? (
            <WeeklyBarChart
              labels={data.workouts_per_week.map((week) => formatShortDate(week.week_start))}
              values={data.workouts_per_week.map((week) => week.count)}
            />
          ) : (
            <EmptyState title="No workouts yet">Log a workout and it will show up here.</EmptyState>
          )}
        </section>

        <section className="card">
          <h2>Sets by muscle group</h2>
          <p className="muted small">Last 30 days</p>
          {data.sets_by_muscle_group.length > 0 ? (
            <MuscleDoughnut groups={data.sets_by_muscle_group} />
          ) : (
            <EmptyState title="No sets logged">Nothing in the last 30 days.</EmptyState>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Recent personal records</h2>
        {data.recent_records.length === 0 ? (
          <EmptyState title="No records yet">Records are detected automatically when you save a workout.</EmptyState>
        ) : (
          <ul className="list">
            {data.recent_records.map((record) => (
              <li key={record.id} className="list-row">
                <div>
                  <Link to={`/progress/${record.exercise_id}`} className="strong">
                    {record.exercise_name}
                  </Link>
                  <div className="muted small">
                    {RECORD_LABELS[record.record_type]} · {formatDate(record.achieved_at)}
                  </div>
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
