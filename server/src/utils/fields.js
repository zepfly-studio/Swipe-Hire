import { HttpError } from './HttpError.js';

// Parses an optional numeric form value. Empty -> null so it clears the field.
// `field` is sent back with the error so the form can highlight the right input.
export function num(value, label, { min = 0, max = Infinity, field } = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new HttpError(400, `Please enter a valid ${label}`, { field });
  }
  return n;
}

// Salaries are stored in LPA (lakh per annum). People often type the full
// yearly amount instead (e.g. 450000), so convert anything that big.
export function salary(value, label, field) {
  const n = num(value, label, { field });
  if (n === null) return null;
  const lpa = n >= 1000 ? n / 100000 : n;
  if (lpa > 1000) throw new HttpError(400, `Please enter a valid ${label}`, { field });
  return Math.round(lpa * 100) / 100;
}

export function text(value, max = 200) {
  if (value === undefined || value === null) return undefined;
  return String(value).trim().slice(0, max);
}

export function requireFields(data, labels) {
  for (const [key, label] of Object.entries(labels)) {
    const v = data[key];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
      throw new HttpError(400, `${label} is required`, { field: key });
    }
  }
}

export function stripUndefined(obj) {
  for (const k of Object.keys(obj)) if (obj[k] === undefined) delete obj[k];
  return obj;
}
