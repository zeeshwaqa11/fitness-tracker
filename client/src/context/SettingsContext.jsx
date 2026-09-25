import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { displayToKg, formatWeight, kgToDisplay } from '../utils/units.js';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [unit, setUnitState] = useState('kg');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/settings')
      .then((settings) => setUnitState(settings.weight_unit === 'lbs' ? 'lbs' : 'kg'))
      .catch(setError)
      .finally(() => setReady(true));
  }, []);

  const setUnit = useCallback(async (next) => {
    const settings = await api.put('/settings', { weight_unit: next });
    setUnitState(settings.weight_unit);
  }, []);

  const value = useMemo(
    () => ({
      unit,
      ready,
      error,
      setUnit,
      toDisplay: (kg) => kgToDisplay(kg, unit),
      toKg: (value) => displayToKg(value, unit),
      formatWeight: (kg) => formatWeight(kg, unit),
    }),
    [unit, ready, error, setUnit],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}
