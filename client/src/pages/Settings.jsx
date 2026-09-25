import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { ErrorMessage, PageHeader } from '../components/Status.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Settings() {
  const { unit, setUnit } = useSettings();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const changeUnit = async (next) => {
    setError(null);
    setMessage(null);
    try {
      await setUnit(next);
    } catch (failure) {
      setError(failure);
    }
  };

  const reset = async (mode) => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await api.post('/settings/reset', { mode });
      setMessage(mode === 'sample' ? 'Restored the exercise library and sample workouts.' : 'Cleared all workouts and records. The exercise library is back to its built-in list.');
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" />

      <ErrorMessage error={error} />
      {message && (
        <div className="alert alert-success" role="status">
          {message} <button type="button" className="link-button" onClick={() => navigate('/')}>Go to dashboard</button>
        </div>
      )}

      <section className="card">
        <h2>Weight unit</h2>
        <p className="muted">
          Weights are always stored in kilograms. This setting only changes how they are shown and entered.
        </p>
        <div className="segmented" role="radiogroup" aria-label="Weight unit">
          {['kg', 'lbs'].map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={unit === option}
              className={`segment${unit === option ? ' is-active' : ''}`}
              onClick={() => changeUnit(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Reset data</h2>
        <p className="muted">
          These actions permanently replace your workouts, custom exercises and personal records. Your unit preference is kept.
        </p>
        <div className="reset-actions">
          <div>
            <ConfirmButton className="btn" confirmLabel="Click again to replace all data" disabled={busy} onConfirm={() => reset('sample')}>
              Reset to sample data
            </ConfirmButton>
            <p className="muted small">Exercise library plus about 9 weeks of example workouts.</p>
          </div>
          <div>
            <ConfirmButton confirmLabel="Click again to delete all workouts" disabled={busy} onConfirm={() => reset('empty')}>
              Clear all workouts
            </ConfirmButton>
            <p className="muted small">Keeps the built-in exercise library, removes everything else.</p>
          </div>
        </div>
      </section>
    </>
  );
}
