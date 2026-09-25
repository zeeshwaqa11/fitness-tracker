import { NavLink, Outlet } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { ErrorMessage } from './Status.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/log', label: 'Log Workout' },
  { to: '/history', label: 'History' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/progress', label: 'Progress' },
  { to: '/records', label: 'Records' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const { ready, error } = useSettings();

  return (
    <div className="shell">
      <header className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            F
          </span>
          <span>Fitness Tracker</span>
        </div>
        <nav className="nav" aria-label="Main">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="nav-link">
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="content">
        {error && <ErrorMessage error={error} />}
        {ready ? <Outlet /> : <p className="muted">Loading…</p>}
      </main>
    </div>
  );
}
