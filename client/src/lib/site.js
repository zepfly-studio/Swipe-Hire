import { useEffect, useState } from 'react';
import { api } from './api';
import { ROLES, SKILLS } from './suggestions';
import { CITIES, LOCATIONS } from './options';

// Admin-editable public settings (GET /api/site): maintenance notice, FAQ / About text and
// extra suggestion words. Loaded once at start; components subscribe with useSite().
let site = { maintenance: { on: false, message: '' }, content: { faq: null, aboutIntro: '' }, taxonomy: { skills: [], cities: [], roles: [] } };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l(site));

// Extra words go into the same lists the suggestion boxes already use.
function addUnique(list, extra = []) {
  const have = new Set(list.map((x) => x.toLowerCase()));
  for (const x of extra) if (!have.has(x.toLowerCase())) list.push(x);
}

export async function loadSite() {
  try {
    const { data } = await api.get('/site');
    site = data;
    addUnique(SKILLS, data.taxonomy?.skills);
    addUnique(ROLES, data.taxonomy?.roles);
    addUnique(CITIES, data.taxonomy?.cities);
    addUnique(LOCATIONS, data.taxonomy?.cities);
    emit();
  } catch {
    // the site works with the built-in defaults
  }
}

export function useSite() {
  const [s, setS] = useState(site);
  useEffect(() => {
    listeners.add(setS);
    setS(site);
    return () => listeners.delete(setS);
  }, []);
  return s;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;
    // Maintenance switched on while the page was open.
    if (err.response?.status === 503 && data?.code === 'MAINTENANCE') {
      site = { ...site, maintenance: { on: true, message: data.message } };
      emit();
    }
    // Admin pages need the emailed code first.
    if (err.response?.status === 401 && data?.code === 'ADMIN_2FA' && window.location.pathname.startsWith('/admin')) {
      window.location.assign('/adminlogin');
    }
    return Promise.reject(err);
  },
);
