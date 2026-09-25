import { isValidDate } from '../utils/dates.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const forbidden = (message) => new HttpError(403, message);
export const notFound = (what) => new HttpError(404, `${what} not found`);
export const conflict = (message) => new HttpError(409, message);

export function requireId(value, field) {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(n) || n <= 0) throw badRequest(`${field} must be a positive integer`);
  return n;
}

export function optionalId(value, field) {
  if (value === undefined || value === null || value === '') return null;
  return requireId(value, field);
}

export function requireString(value, field, { max = 100 } = {}) {
  if (typeof value !== 'string' || value.trim() === '') throw badRequest(`${field} is required`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return trimmed;
}

export function optionalString(value, field, { max = 500 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return trimmed || null;
}

export function requireEnum(value, field, allowed) {
  if (!allowed.includes(value)) throw badRequest(`${field} must be one of: ${allowed.join(', ')}`);
  return value;
}

export function optionalEnum(value, field, allowed) {
  if (value === undefined || value === null || value === '') return null;
  return requireEnum(value, field, allowed);
}

export function requireDate(value, field) {
  if (!isValidDate(value)) throw badRequest(`${field} must be a valid date in YYYY-MM-DD format`);
  return value;
}

export function optionalDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  return requireDate(value, field);
}

export function optionalPositiveInt(value, field, { max = 100000 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(n) || n <= 0 || n > max) throw badRequest(`${field} must be a whole number between 1 and ${max}`);
  return n;
}

export function requireReps(value, field) {
  const n = optionalPositiveInt(value, field, { max: 1000 });
  if (n === null) throw badRequest(`${field} is required`);
  return n;
}

export function requireWeightKg(value, field) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw badRequest(`${field} must be a number`);
  if (n < 0 || n > 1000) throw badRequest(`${field} must be between 0 and 1000 kg`);
  return Math.round(n * 10000) / 10000;
}
