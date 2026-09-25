import { useMemo, useState } from 'react';
import { MUSCLE_GROUPS } from '../utils/format.js';

export default function ExercisePicker({ exercises, excludeIds = [], onPick, onClose }) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exercises.filter(
      (exercise) =>
        !excludeIds.includes(exercise.id) &&
        (!group || exercise.muscle_group === group) &&
        (!needle || exercise.name.toLowerCase().includes(needle)),
    );
  }, [exercises, excludeIds, search, group]);

  return (
    <div className="card picker">
      <div className="picker-controls">
        <input
          type="search"
          placeholder="Search exercises"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search exercises"
          autoFocus
        />
        <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Filter by muscle group">
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="muted">No matching exercises.</p>
      ) : (
        <ul className="picker-list">
          {visible.map((exercise) => (
            <li key={exercise.id}>
              <button type="button" className="picker-item" onClick={() => onPick(exercise)}>
                <span>{exercise.name}</span>
                <span className="muted">
                  {exercise.muscle_group} · {exercise.equipment}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
