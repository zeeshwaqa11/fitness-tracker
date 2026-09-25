import { Bar, Doughnut, Line } from 'react-chartjs-2';
import '../charts/setup.js';
import { MUSCLE_COLORS } from '../charts/setup.js';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

export function TrendLineChart({ labels, tooltipTitles, values, label, color, unit }) {
  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        borderColor: color,
        backgroundColor: `${color}22`,
        pointBackgroundColor: color,
        pointRadius: values.length > 40 ? 2 : 4,
        pointHoverRadius: 6,
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const options = {
    ...baseOptions,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => tooltipTitles[items[0].dataIndex],
          label: (item) => `${label}: ${item.formattedValue} ${unit}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
      y: { title: { display: true, text: unit } },
    },
  };

  return (
    <div className="chart-box">
      <Line data={data} options={options} />
    </div>
  );
}

export function WeeklyBarChart({ labels, values }) {
  const data = {
    labels,
    datasets: [{ label: 'Workouts', data: values, backgroundColor: '#0f766e', borderRadius: 4, maxBarThickness: 36 }],
  };

  const options = {
    ...baseOptions,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { title: (items) => `Week of ${items[0].label}` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
    },
  };

  return (
    <div className="chart-box">
      <Bar data={data} options={options} />
    </div>
  );
}

export function MuscleDoughnut({ groups }) {
  const data = {
    labels: groups.map((g) => g.muscle_group),
    datasets: [
      {
        data: groups.map((g) => g.sets),
        backgroundColor: groups.map((g) => MUSCLE_COLORS[g.muscle_group] ?? '#868e96'),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    ...baseOptions,
    cutout: '58%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true } },
      tooltip: { callbacks: { label: (item) => `${item.label}: ${item.formattedValue} sets` } },
    },
  };

  return (
    <div className="chart-box">
      <Doughnut data={data} options={options} />
    </div>
  );
}
