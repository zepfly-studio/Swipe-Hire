import { pick, cleanList } from './pick.js';
import { signUrl, withSignedFiles } from './signedUrl.js';
import { matchCandidate, NEGOTIATE_MARGIN } from './match.js';
import { STATE_CITIES, stateKey } from '../../../shared/states.js';
import { ROLES, SKILLS } from '../../../shared/taxonomy.js';

// What a company may see about a candidate (no phone/email until shortlisted).
// Age and gender are collected but never shown to companies, to avoid biased hiring.
export const CARD_FIELDS = [
  'headline', 'location', 'qualification', 'degree', 'college', 'graduationYear',
  'skills', 'experienceYears', 'currentCompany', 'currentPost', 'currentSalary', 'expectedSalary',
  'expectedSalaryMax', 'salaryNegotiable',
  'noticePeriod', 'about', 'resumeUrl', 'videoUrl', 'workModes', 'jobTypes', 'preferredLocations',
];

export const NOTICE_OPTIONS = ['Immediate', '15 days', '30 days', '60 days', '90 days'];
export const WORK_MODES = ['onsite', 'hybrid', 'remote'];
export const ALL_INDIA = 'All India';
export const isAllIndia = (v) => /^all\s*india$/i.test(String(v || '').trim());
export const escapeRegex = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitTerms = (value) =>
  String(value || '')
    .split(/[\n,|]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 10);
const listParam = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
const numParam = (v) => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : NaN);
// Salary in LPA; a value of 1000 or more was typed in rupees (600000 -> 6 LPA).
const salaryParam = (v) => {
  const n = numParam(v);
  return n !== null && n >= 1000 ? Math.round((n / 100000) * 100) / 100 : n;
};

// ---------------------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------------------

// Words that don't tell roles apart ("Senior React Developer" should find "React Developer").
const ROLE_NOISE = new Set(['a', 'an', 'and', 'the', 'of', 'for', 'in', 'at', 'to', 'senior', 'sr', 'junior', 'jr', 'trainee', 'fresher', 'associate']);
const roleWords = (role) => role.toLowerCase().split(/[\s/&()-]+/).filter((w) => w && !ROLE_NOISE.has(w));

// Titles people use for the same kind of job. Searching the first title of a group also
// finds the rest, so "Web Developer" finds Frontend and Full Stack developers too.
const ROLE_FAMILIES = [
  ['web developer', 'website developer', 'frontend developer', 'front end developer', 'backend developer', 'back end developer', 'full stack developer', 'fullstack developer', 'react developer', 'mern stack developer', 'javascript developer', 'ui developer', 'wordpress developer', 'php developer'],
  ['frontend developer', 'front end developer', 'web developer', 'react developer', 'ui developer', 'angular developer', 'javascript developer'],
  ['full stack developer', 'fullstack developer', 'mern stack developer', 'mean stack developer', 'web developer'],
  ['backend developer', 'back end developer', 'node.js developer', 'java developer', 'python developer', 'php developer', 'golang developer'],
  ['software engineer', 'software developer', 'programmer', 'full stack developer', 'backend developer', 'frontend developer'],
  ['mobile app developer', 'android developer', 'ios developer', 'flutter developer', 'react native developer'],
  ['ui/ux designer', 'ui designer', 'ux designer', 'product designer', 'web designer'],
  ['graphic designer', 'visual designer', 'web designer'],
  ['digital marketing executive', 'digital marketer', 'seo executive', 'social media executive', 'performance marketer'],
  ['sales executive', 'business development executive', 'sales officer', 'field sales executive', 'inside sales executive'],
  ['hr executive', 'hr recruiter', 'recruiter', 'talent acquisition executive', 'hr generalist'],
  ['accountant', 'accounts executive', 'accounts assistant', 'junior accountant'],
  ['customer support executive', 'customer service executive', 'customer care executive', 'support associate'],
  ['data analyst', 'business analyst', 'mis executive', 'reporting analyst'],
  ['qa engineer', 'software tester', 'test engineer', 'automation tester', 'manual tester'],
  ['e-commerce manager', 'e-commerce executive', 'e-commerce operations executive', 'marketplace manager', 'amazon account manager', 'online store manager'],
  ['catalog executive', 'catalogue manager', 'listing executive', 'product listing executive', 'e-commerce executive'],
  ['teacher', 'school teacher', 'primary teacher', 'prt teacher', 'tgt teacher', 'pgt teacher', 'tutor', 'online tutor'],
  ['store manager', 'retail store manager', 'assistant store manager', 'floor manager', 'branch manager'],
  ['logistics executive', 'supply chain executive', 'dispatch executive', 'shipping executive', 'warehouse executive', 'inventory executive'],
  ['telecaller', 'tele sales executive', 'call center executive', 'bpo executive', 'inside sales executive'],
  ['content writer', 'copywriter', 'web content writer', 'technical writer'],
  ['video editor', 'motion graphics designer', 'animator', 'video producer'],
];

// Other ways people write the same title.
const ROLE_ALIASES = {
  'website developer': 'web developer',
  'web site developer': 'web developer',
  'website designer developer': 'web developer',
  'web application developer': 'web developer',
  'web programmer': 'web developer',
  'front end developer': 'frontend developer',
  'frontend engineer': 'frontend developer',
  'back end developer': 'backend developer',
  'backend engineer': 'backend developer',
  'fullstack developer': 'full stack developer',
  'full stack engineer': 'full stack developer',
  'mern developer': 'full stack developer',
  'mern stack developer': 'full stack developer',
  'software developer': 'software engineer',
  'mobile developer': 'mobile app developer',
  'app developer': 'mobile app developer',
  'ui ux designer': 'ui/ux designer',
  'ux ui designer': 'ui/ux designer',
  'hr recruiter': 'hr executive',
  'tele caller': 'telecaller',
  'tele sales executive': 'telecaller',
  'accounts executive': 'accountant',
  'customer care executive': 'customer support executive',
  'customer service executive': 'customer support executive',
  'ecommerce manager': 'e-commerce manager',
};

// Short forms people type for whole words.
const ROLE_SHORT = { dev: 'developer', devs: 'developer', engg: 'engineer', eng: 'engineer', mgr: 'manager', exec: 'executive', asst: 'assistant', js: 'javascript', reactjs: 'react', nodejs: 'node.js' };

// Every word that appears in a known role, skill or role group, with how often it appears in
// roles (the most common wins when a short prefix like "man" could mean several words).
const VOCAB = new Map();
const addWords = (text, weight) => roleWords(text).forEach((w) => VOCAB.set(w, (VOCAB.get(w) || 0) + weight));
ROLES.forEach((r) => addWords(r, 1));
ROLE_FAMILIES.flat().forEach((r) => addWords(r, 1));
Object.keys(ROLE_ALIASES).forEach((r) => addWords(r, 1));
SKILLS.forEach((s) => addWords(s, 0.01));

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

// One typed word -> the role word it most likely means: a known word stays as it is; a short
// form or the start of a word is completed ("dev" -> developer); a small typo is corrected
// ("developr" -> developer). Anything else is kept, so unusual titles still work.
export function fixRoleWord(word) {
  const w = word.toLowerCase();
  if (ROLE_SHORT[w]) return ROLE_SHORT[w];
  if (VOCAB.has(w) || w.length < 3) return w;
  let best = null;
  for (const [v, n] of VOCAB) if (v.startsWith(w) && (!best || n > VOCAB.get(best))) best = v;
  if (best) return best;
  if (w.length < 5) return w;
  const limit = w.length >= 8 ? 2 : 1;
  let close = null;
  let dist = Infinity;
  for (const [v, n] of VOCAB) {
    if (Math.abs(v.length - w.length) > limit) continue;
    const d = editDistance(w, v);
    if (d < dist || (d === dist && n > VOCAB.get(close))) [close, dist] = [v, d];
  }
  return dist <= limit ? close : w;
}
// "web dev" -> "web developer", "Frontend Develper" -> "frontend developer".
export const fixRole = (role) => roleWords(role).map(fixRoleWord).join(' ');

// Whole-word patterns for each meaningful word of a title ("java" must not match "JavaScript").
const wordRegex = (w) => new RegExp(`(^|[^a-z0-9])${escapeRegex(w)}($|[^a-z0-9])`, 'i');
const titleRegexes = (title) => (roleWords(title).length ? roleWords(title) : [title]).map(wordRegex);

// One title -> every meaningful word must appear in the headline, current post or skills.
const titleWhere = (title) => ({
  $and: titleRegexes(title).map((rx) => ({ $or: [{ headline: rx }, { currentPost: rx }, { skills: rx }] })),
});

// Every title a searched role covers: itself, its usual spelling and its related titles.
// Only the first title of a group opens it: "Software Engineer" covers Frontend and Backend,
// but "Frontend Developer" must not pull in Backend developers through that group.
export function roleTitles(role) {
  const fixed = fixRole(role);
  const key = roleWords(ROLE_ALIASES[fixed] || fixed).join(' ');
  const titles = new Set([fixed || role, ROLE_ALIASES[fixed] || fixed || role]);
  for (const family of ROLE_FAMILIES) {
    if (roleWords(family[0]).join(' ') === key) family.forEach((t) => titles.add(t));
  }
  return [...titles];
}
const roleWhere = (role) => ({ $or: roleTitles(role).map(titleWhere) });

// ---------------------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------------------

// Cleans filter input (query string, request body or saved search) into one shape.
// Bad numbers become NaN so validateFilters can report them; nothing here throws.
export function normalizeFilters(q = {}) {
  const rawLocation = String(q.location || '').trim();
  // Old saved searches have a single `workMode`; new ones a `workModes` list.
  const modes = [...listParam(q.workModes), ...listParam(q.workMode)].filter((m) => WORK_MODES.includes(m));
  return {
    role: splitTerms(q.role).join(', ').slice(0, 80),
    // "All India" is a real choice (anywhere in the country), so it still counts as a filter.
    location: isAllIndia(rawLocation) ? ALL_INDIA : rawLocation.slice(0, 60),
    minExp: numParam(q.minExp),
    maxExp: numParam(q.maxExp),
    minSalary: salaryParam(q.minSalary),
    maxSalary: salaryParam(q.maxSalary),
    workModes: [...new Set(modes)],
    notice: [...new Set(listParam(q.notice).filter((n) => NOTICE_OPTIONS.includes(n)))],
    skills: cleanList(listParam(q.skills), 10),
  };
}

// A clear message for filters that can't be right, or null when they are fine.
export function validateFilters(f) {
  const bad = (v) => v !== null && (!Number.isFinite(v) || v < 0);
  if (bad(f.minExp) || bad(f.maxExp)) return 'Experience must be a number of years, 0 or more';
  if (bad(f.minSalary) || bad(f.maxSalary)) return 'Salary must be a number in LPA, 0 or more';
  if ((f.minExp ?? 0) > 60 || (f.maxExp ?? 0) > 60) return 'Experience can be at most 60 years';
  if ((f.minSalary ?? 0) > 1000 || (f.maxSalary ?? 0) > 1000) return 'Salary can be at most 1000 LPA';
  if (f.minExp !== null && f.maxExp !== null && f.minExp > f.maxExp) return 'Min experience is more than max experience';
  if (f.minSalary !== null && f.maxSalary !== null && f.minSalary > f.maxSalary) return 'Min salary is more than max salary';
  return null;
}

export function hasFilters(f = {}) {
  return Boolean(
    f.role || f.location || f.minExp != null || f.maxExp != null || f.minSalary != null ||
      f.maxSalary != null || f.workModes?.length || f.notice?.length || f.skills?.length,
  );
}

// Location: "All India" = everywhere; a state ("Rajasthan") also covers its cities
// (Jaipur, Sikar, Kota…); a city matches where they live or the cities they're open to.
// When the company takes Remote workers, people open to remote work count from anywhere.
const areaRegex = (location) => {
  const state = stateKey(location);
  return state
    ? new RegExp(`(^|[^a-z])(${[state, ...STATE_CITIES[state]].map(escapeRegex).join('|')})($|[^a-z])`, 'i')
    : new RegExp(escapeRegex(location), 'i');
};
function locationWhere(f) {
  const rx = areaRegex(f.location);
  const or = [{ location: rx }, { preferredLocations: rx }];
  if (f.workModes.includes('remote')) or.push({ workModes: 'remote' });
  return { $or: or };
}

// Swipe feed: role, location and "already earns more than the budget" decide who is shown.
// Experience, expected salary, notice, skills and work mode only decide the order (filterScore).
export function feedFilters(q) {
  const f = normalizeFilters(q);
  const and = [];
  if (f.location && f.location !== ALL_INDIA) and.push(locationWhere(f));
  const roles = splitTerms(f.role);
  if (roles.length) and.push({ $or: roles.map(roleWhere) });
  // Someone already earning more than the budget won't take the job, so they aren't shown.
  if (Number.isFinite(f.maxSalary)) and.push({ $or: [{ currentSalary: null }, { currentSalary: { $lte: f.maxSalary } }] });
  return and.length ? { $and: and } : {};
}

// When nobody with the searched role is left: people in the same area (and budget) who share
// the wanted skills, or else the experience, or else the salary range. Null = no fallback.
export function fallbackFilters(q) {
  const f = normalizeFilters(q);
  const where = feedFilters({ ...q, role: '' });
  const and = where.$and ? [...where.$and] : [];
  const range = (lo, hi) => ({ ...(lo !== null && { $gte: lo }), ...(hi !== null && { $lte: hi }) });
  if (f.skills.length) and.push({ skills: { $in: f.skills.map((sk) => new RegExp(`^${escapeRegex(sk)}$`, 'i')) } });
  else if (f.minExp !== null || f.maxExp !== null) and.push({ experienceYears: range(f.minExp, f.maxExp) });
  else if (f.minSalary !== null || f.maxSalary !== null) and.push({ expectedSalary: range(f.minSalary, f.maxSalary) });
  else return null;
  return { $and: and };
}

// How well a candidate fits the filters, 0-100; the feed shows the best first.
// Only the filters the company set count, each 0-1, weighted:
// - skills (35): share of the wanted skills they have
// - experience (20): inside the range 1; more than the max next, less than the min last
// - salary (20): expected range overlaps the budget 1; asking less next; asking more last
// - notice (10): Immediate first, then 15, 30, 60, 90 days
// - work mode (10): one of the wanted modes 1, no preference 0.8, other 0.2
// - role (5): their own title matches 1, a related title 0.7
// Anything the candidate left empty counts as "unknown" (0.5): never a reason to hide them.
const WEIGHTS = { skills: 35, experience: 20, salary: 20, notice: 10, workMode: 10, role: 5 };
const NOTICE_VALUE = { Immediate: 1, '15 days': 0.85, '30 days': 0.65, '60 days': 0.4, '90 days': 0.15 };
const UNKNOWN = 0.5;
const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export function filterScore(p = {}, q) {
  const f = normalizeFilters(q);
  const parts = [];
  const roles = splitTerms(f.role);
  if (roles.length) {
    const own = roles.some((r) => titleRegexes(fixRole(r) || r).every((rx) => rx.test(p.headline || '') || rx.test(p.currentPost || '')));
    parts.push(['role', own ? 1 : 0.7]);
  }
  if (f.skills.length) {
    const have = new Set((p.skills || []).map((s) => String(s).toLowerCase()));
    parts.push(['skills', f.skills.filter((s) => have.has(s.toLowerCase())).length / f.skills.length]);
  }
  if (f.minExp !== null || f.maxExp !== null) {
    const y = num(p.experienceYears);
    const lo = f.minExp ?? 0;
    const hi = f.maxExp ?? Infinity;
    parts.push(['experience', y === null ? UNKNOWN : y >= lo && y <= hi ? 1 : y > hi ? Math.max(0.35, 0.85 - 0.08 * (y - hi)) : Math.max(0, 0.3 - 0.1 * (lo - y))]);
  }
  if (f.minSalary !== null || f.maxSalary !== null) {
    const from = num(p.expectedSalary);
    const to = num(p.expectedSalaryMax) ?? from;
    const lo = f.minSalary ?? 0;
    const hi = f.maxSalary ?? Infinity;
    let v = UNKNOWN;
    if (from !== null) {
      if (from <= hi && to >= lo) v = 1; // their range overlaps the budget
      else if (to < lo) v = Math.max(0.5, 0.85 - 0.05 * (lo - to)); // asking less
      else v = Math.max(0, 0.45 - 0.05 * (from - hi) + (p.salaryNegotiable ? 0.05 : 0)); // asking more
    }
    parts.push(['salary', v]);
  }
  if (f.notice.length) parts.push(['notice', NOTICE_VALUE[p.noticePeriod] ?? UNKNOWN]);
  if (f.workModes.length) {
    const modes = p.workModes || [];
    parts.push(['workMode', !modes.length ? 0.8 : modes.some((m) => f.workModes.includes(m)) ? 1 : 0.2]);
  }
  if (!parts.length) return null;
  const total = parts.reduce((a, [k]) => a + WEIGHTS[k], 0);
  return Math.round((100 * parts.reduce((a, [k, v]) => a + WEIGHTS[k] * v, 0)) / total);
}

// Every filter as a hard condition: used for saved-search alerts ("a new candidate matches
// all of these"). The swipe feed only uses role and location as hard conditions.
export function strictFilters(q) {
  const f = normalizeFilters(q);
  const and = [];
  if (f.location && f.location !== ALL_INDIA) and.push(locationWhere(f));
  const roles = splitTerms(f.role);
  if (roles.length) and.push({ $or: roles.map(roleWhere) });
  if (f.minExp !== null || f.maxExp !== null) {
    and.push({ experienceYears: { ...(f.minExp !== null && { $gte: f.minExp }), ...(f.maxExp !== null && { $lte: f.maxExp }) } });
  }
  // "Max salary": the candidate's range must start at or below it; someone open to negotiate
  // may start up to 20% above it. People already earning more than the max are left out.
  if (f.maxSalary !== null) {
    and.push({ $or: [{ currentSalary: null }, { currentSalary: { $lte: f.maxSalary } }] });
    and.push({ $or: [{ expectedSalary: { $lte: f.maxSalary } }, { salaryNegotiable: true, expectedSalary: { $lte: f.maxSalary * NEGOTIATE_MARGIN } }] });
  }
  if (f.minSalary !== null) {
    and.push({ $or: [{ expectedSalaryMax: { $gte: f.minSalary } }, { expectedSalaryMax: null, expectedSalary: { $gte: f.minSalary } }] });
  }
  // Notice period is a maximum: "15 days" also takes people who can join immediately.
  if (f.notice.length) {
    const longest = Math.max(...f.notice.map((n) => NOTICE_OPTIONS.indexOf(n)));
    and.push({ $or: [{ noticePeriod: { $in: NOTICE_OPTIONS.slice(0, longest + 1) } }, { noticePeriod: { $in: [null, ''] } }] });
  }
  if (f.skills.length) and.push({ skills: { $in: f.skills.map((sk) => new RegExp(`^${escapeRegex(sk)}$`, 'i')) } });
  // Candidates who never picked a work mode are open to any.
  if (f.workModes.length) and.push({ $or: [{ workModes: { $in: f.workModes } }, { workModes: { $exists: false } }, { workModes: { $size: 0 } }] });
  return and.length ? { $and: and } : {};
}

// Candidate as shown to a company, scored against one of its jobs.
export function toCard(profile, job, extra = {}) {
  return {
    id: String(profile.user._id),
    name: profile.user.name,
    avatarUrl: signUrl(profile.user.avatarUrl),
    ...withSignedFiles(pick(profile, CARD_FIELDS)),
    ...(job ? matchCandidate(profile, job) : {}),
    ...extra,
  };
}
