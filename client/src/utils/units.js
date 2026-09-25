export const LBS_PER_KG = 2.2046226218;

const round = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function kgToDisplay(kg, unit) {
  return round(unit === 'lbs' ? kg * LBS_PER_KG : kg, 2);
}

export function displayToKg(value, unit) {
  return round(unit === 'lbs' ? value / LBS_PER_KG : value, 4);
}

export function formatNumber(value, maximumFractionDigits = 2) {
  return value.toLocaleString('en-US', { maximumFractionDigits });
}

export function formatWeight(kg, unit) {
  return `${formatNumber(kgToDisplay(kg, unit))} ${unit}`;
}
