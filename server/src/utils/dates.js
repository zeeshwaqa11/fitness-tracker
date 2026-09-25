const pad = (n) => String(n).padStart(2, '0');

const toUTC = (value) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const fromUTC = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUTC(toUTC(value)) === value;
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(value, days) {
  const date = toUTC(value);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUTC(date);
}

export function addMonths(value, months) {
  const date = toUTC(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return fromUTC(date);
}

export function startOfWeek(value) {
  const daysSinceMonday = (toUTC(value).getUTCDay() + 6) % 7;
  return addDays(value, -daysSinceMonday);
}

export function startOfMonth(value) {
  return `${value.slice(0, 7)}-01`;
}
