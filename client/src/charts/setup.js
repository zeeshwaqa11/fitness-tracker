import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

Chart.defaults.font.family = 'inherit';
Chart.defaults.color = '#5b6473';
Chart.defaults.borderColor = '#e6e9ef';

export const MUSCLE_COLORS = {
  Chest: '#e8590c',
  Back: '#1c7ed6',
  Legs: '#2f9e44',
  Shoulders: '#f59f00',
  Arms: '#ae3ec9',
  Core: '#0c8599',
  Cardio: '#e03131',
};

export const SERIES_COLORS = {
  est_1rm: '#0f766e',
  max_weight: '#1c7ed6',
  volume: '#e8590c',
};
