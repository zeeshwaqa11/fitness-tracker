import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { EmptyState } from './components/Status.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ExerciseProgress from './pages/ExerciseProgress.jsx';
import Exercises from './pages/Exercises.jsx';
import History from './pages/History.jsx';
import LogWorkout from './pages/LogWorkout.jsx';
import Records from './pages/Records.jsx';
import Settings from './pages/Settings.jsx';
import WorkoutDetail from './pages/WorkoutDetail.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="log" element={<LogWorkout />} />
        <Route path="log/:id" element={<LogWorkout />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<WorkoutDetail />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="progress" element={<ExerciseProgress />} />
        <Route path="progress/:id" element={<ExerciseProgress />} />
        <Route path="records" element={<Records />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<EmptyState title="Page not found">That page does not exist.</EmptyState>} />
      </Route>
    </Routes>
  );
}
