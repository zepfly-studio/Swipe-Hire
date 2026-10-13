import axios from 'axios';

// The login lives in an httpOnly cookie set by the API; page scripts never see it.
// X-Requested-With tells the API a request really comes from this app (CSRF guard).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// Older versions kept the login, form drafts and a theme choice in localStorage; remove them.
try {
  Object.keys(localStorage)
    .filter((k) => k === 'swipehire_token' || k === 'swipehire_theme' || k.startsWith('swipehire_draft_'))
    .forEach((k) => localStorage.removeItem(k));
} catch {
  // storage unavailable
}

export const errorMessage = (err) => err?.response?.data?.message || 'Something went wrong, please try again';

// Uploaded files are served by the API server under /uploads.
export const fileUrl = (path) => {
  if (!path) return '';
  if (/^https?:/.test(path)) return path;
  return `${import.meta.env.VITE_FILES_URL || ''}${path}`;
};

// Salaries are entered in LPA, but a full yearly amount (450000) is accepted too.
export const toLpa = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return n >= 1000 ? Math.round((n / 100000) * 100) / 100 : n;
};

export const salaryHint = (value) => {
  const lpa = toLpa(value);
  return Number(value) >= 1000 && Number.isFinite(lpa) ? `= ₹${lpa} LPA (₹${Number(value).toLocaleString('en-IN')} per year)` : 'In lakh per year, e.g. 4.5';
};

export const cx =(...classes) => classes.filter(Boolean).join(' ');
