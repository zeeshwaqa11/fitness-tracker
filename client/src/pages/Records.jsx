import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { EmptyState, ErrorMessage, Loading, PageHeader } from '../components/Status.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { MUSCLE_GROUPS, RECORD_LABELS, RECORD_ORDER, formatDate, formatRecordValue, groupBy } from '../utils/format.js';

export default function Records() {
  const { unit } = useSettings();
  const { data, error, loading, reload } = useApi(() => api.get('/records'));

  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;

  const byGroup = groupBy(data, (record) => record.muscle_group);
  const groups = MUSCLE_GROUPS.filter((group) => byGroup.has(group));

  return (
    <>
      <PageHeader title="Personal records" subtitle="Your current best for every exercise, grouped by muscle group." />

      {groups.length === 0 ? (
        <EmptyState title="No records yet">Save a workout and your first records will appear here.</EmptyState>
      ) : (
        groups.map((group) => {
          const byExercise = [...groupBy(byGroup.get(group), (record) => record.exercise_id)];
          return (
            <section key={group} className="card">
              <h2>{group}</h2>
              <div className="table-scroll">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Exercise</th>
                      {RECORD_ORDER.map((type) => (
                        <th key={type}>{RECORD_LABELS[type]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byExercise.map(([exerciseId, records]) => {
                      const byType = Object.fromEntries(records.map((record) => [record.record_type, record]));
                      return (
                        <tr key={exerciseId}>
                          <td>
                            <Link to={`/progress/${exerciseId}`} className="strong">
                              {records[0].exercise_name}
                            </Link>
                          </td>
                          {RECORD_ORDER.map((type) => (
                            <td key={type}>
                              {byType[type] ? (
                                <>
                                  <span className="strong">{formatRecordValue(type, byType[type].value, unit)}</span>
                                  <div className="muted small">{formatDate(byType[type].achieved_at)}</div>
                                </>
                              ) : (
                                <span className="muted">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
