import { pick, cleanList } from './pick.js';
import { signUrl, withSignedFiles } from './signedUrl.js';
import { matchCandidate, NEGOTIATE_MARGIN } from './match.js';
import { STATE_CITIES, stateKey } from '../../../shared/states.js';

// What a company may see about a candidate (no phone/email until shortlisted).
// Age and gender are collected but never shown to companies, to avoid biased hiring.
export const CARD_FIELDS = [
  'headline', 'location', 'qualification', 'degree', 'college', 'graduationYear',
  'skills', 'experienceYears', 'currentCompany', 'currentPost', 'currentSalary', 'expectedSalary',
  'expectedSalaryMax', 'salaryNegotiable',
  'noticePeriod', 'about', 'resumeUrl', 'videoUrl', 'workModes', 'jobTypes', 'preferredLocations',
];

export const NOTICE_OPTIONS = ['Immediate', '15 days', '30 days', '60 days', '90 days'];
export const escapeRegex = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numParam = (v) => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

const splitTerms = (value) => String(value || '')
  .split(/[\n,|]/)
  .map((term) => term.trim())
  .filter(Boolean)
  .slice(0, 10);

export const ALL_INDIA = 'All India';
export const isAllIndia = (v) => /^all\s*india$/i.test(String(v || '').trim());

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

// Whole-word patterns for each meaningful word of a title.
const titleRegexes = (title) =>
  (roleWords(title).length ? roleWords(title) : [title]).map((w) => new RegExp(`(^|[^a-z0-9])${escapeRegex(w)}($|[^a-z0-9])`, 'i'));

// One title -> every meaningful word must appear in the headline, current post or skills.
function titleWhere(title) {
  const words = roleWords(title);
  return {
    $and: (words.length ? words : [title]).map((w) => {
      // Whole words only: "java" must not match "JavaScript".
      const rx = new RegExp(`(^|[^a-z0-9])${escapeRegex(w)}($|[^a-z0-9])`, 'i');
      return { $or: [{ headline: rx }, { currentPost: rx }, { skills: rx }] };
    }),
  };
}

// A role matches its own words or any title from the same family.
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

function roleWhere(role) {
  const own = roleWords(role).join(' ');
  const key = roleWords(ROLE_ALIASES[own] || own).join(' ');
  const titles = new Set([role, ROLE_ALIASES[own] || role]);
  for (const family of ROLE_FAMILIES) {
    // Only the first title of a group opens it: "Software Engineer" covers Frontend and Backend,
    // but "Frontend Developer" must not pull in Backend developers through that group.
    if (roleWords(family[0]).join(' ') === key) family.forEach((t) => titles.add(t));
  }
  return { $or: [...titles].map(titleWhere) };
}

// Cleans filter input (query string or saved search) into a consistent shape.
export function normalizeFilters(q = {}) {
  const rawLocation = String(q.location || '').trim();
  // "All India" is a real choice (anywhere in the country), so it still counts as a filter.
  const cleanedLocation = isAllIndia(rawLocation) ? ALL_INDIA : rawLocation.slice(0, 60);

  return {
    role: splitTerms(q.role).join(', ').slice(0, 80),
    location: cleanedLocation,
    minExp: numParam(q.minExp),
    maxExp: numParam(q.maxExp),
    minSalary: numParam(q.minSalary),
    maxSalary: numParam(q.maxSalary),
    workMode: ['onsite', 'remote', 'hybrid'].includes(q.workMode) ? q.workMode : undefined,
    notice: (Array.isArray(q.notice) ? q.notice : String(q.notice || '').split(',')).filter((n) => NOTICE_OPTIONS.includes(n)),
    skills: cleanList(Array.isArray(q.skills) ? q.skills : String(q.skills || '').split(','), 10),
  };
}

export function hasFilters(f = {}) {
  return Boolean(
    f.role || f.location || f.minExp !== null || f.maxExp !== null || f.minSalary !== null ||
      f.maxSalary !== null || f.workMode || f.notice?.length || f.skills?.length,
  );
}

// Location: "All India" = everywhere; a state ("Rajasthan") also covers its cities
// (Jaipur, Sikar, Kota…); a city matches where they live or the cities they're open to.
const areaRegex = (location) => {
  const state = stateKey(location);
  return state
    ? new RegExp(`(^|[^a-z])(${[state, ...STATE_CITIES[state]].map(escapeRegex).join('|')})($|[^a-z])`, 'i')
    : new RegExp(escapeRegex(location), 'i');
};
function locationWhere(location) {
  const rx = areaRegex(location);
  return { $or: [{ location: rx }, { preferredLocations: rx }] };
}

// Swipe feed: role, location and "already earns more than the budget" decide who is shown.
// Experience, expected salary, notice, skills and work mode decide the order (see filterScore).
export function feedFilters(q) {
  const f = normalizeFilters(q);
  const and = [];
  if (f.location && f.location !== ALL_INDIA) and.push(locationWhere(f.location));
  const roles = splitTerms(f.role);
  if (roles.length) and.push({ $or: roles.map(roleWhere) });
  // Someone already earning more than the budget won't take the job, so they aren't shown.
  if (f.maxSalary !== null) and.push({ $or: [{ currentSalary: null }, { currentSalary: { $lte: f.maxSalary } }] });
  return and.length ? { $and: and } : {};
}

// How well a candidate fits the filters, 0-100; the feed shows the best first.
// Only the filters the company set count. Each one gives 0-1:
// - role: their own title matches the searched words 1, a related title 0.7
// - experience: inside the range 1; more than the max next (0.8, less per extra year);
//   less than the min last
// - skills: share of the asked skills they have
// - notice: Immediate first, then 15, 30, 60, 90 days
// - salary (expected): inside the budget 1; asking less next; asking more last
// - work mode: the one asked 1, no preference 0.8, other 0.2
const WEIGHTS = { role: 15, experience: 25, skills: 30, notice: 15, salary: 20, workMode: 10 };
const NOTICE_VALUE = { Immediate: 1, '15 days': 0.85, '30 days': 0.65, '60 days': 0.4, '90 days': 0.15 };
// Filter by filter, does this candidate fit? Shown on the swipe card so the company sees at a
// glance what doesn't match (e.g. "Lives in Nagpur", "Asks ₹11.6 LPA, budget ₹3–5").
const lpa = (v) => `₹${v} LPA`;
const range = (lo, hi, unit) => (lo != null && hi != null ? `${lo}–${hi}${unit}` : lo != null ? `${lo}+${unit}` : `up to ${hi}${unit}`);
export function filterFit(p, q) {
  const f = normalizeFilters(q);
  const fit = [];
  if (f.location && f.location !== ALL_INDIA) {
    const rx = areaRegex(f.location);
    const lives = rx.test(p.location || '');
    const open = (p.preferredLocations || []).filter((c) => rx.test(c));
    fit.push({ key: 'location', ok: lives, text: lives ? `Lives in ${p.location}` : `Lives in ${p.location || 'another city'}, not ${f.location}${open.length ? ` (open to ${open.join(', ')})` : ''}` });
  }
  if (f.minExp !== null || f.maxExp !== null) {
    const y = p.experienceYears ?? 0;
    const ok = (f.minExp === null || y >= f.minExp) && (f.maxExp === null || y <= f.maxExp);
    fit.push({ key: 'experience', ok, text: `${y === 0 ? 'Fresher' : `${y} yrs experience`}${ok ? '' : `, you want ${range(f.minExp, f.maxExp, ' yrs')}`}` });
  }
  if (f.minSalary !== null || f.maxSalary !== null) {
    const s = p.expectedSalary;
    const asks = p.expectedSalaryMax ? `₹${s}–${p.expectedSalaryMax} LPA` : lpa(s);
    const inBudget = s == null || ((f.minSalary === null || s >= f.minSalary) && (f.maxSalary === null || s <= f.maxSalary));
    const earnsMore = f.maxSalary !== null && p.currentSalary != null && p.currentSalary > f.maxSalary;
    const ok = inBudget && !earnsMore;
    const budget = `budget ₹${range(f.minSalary, f.maxSalary, ' LPA')}`;
    fit.push({
      key: 'salary',
      ok,
      text: ok ? `Asks ${asks}` : earnsMore && inBudget ? `Already earns ${lpa(p.currentSalary)}, ${budget}` : `Asks ${asks}${p.salaryNegotiable ? ' (negotiable)' : ''}, ${budget}`,
    });
  }
  if (f.notice.length) {
    const longest = Math.max(...f.notice.map((n) => NOTICE_OPTIONS.indexOf(n)));
    const at = NOTICE_OPTIONS.indexOf(p.noticePeriod);
    const ok = at === -1 || at <= longest;
    fit.push({ key: 'notice', ok, text: p.noticePeriod ? `${p.noticePeriod === 'Immediate' ? 'Joins immediately' : `${p.noticePeriod} notice`}${ok ? '' : `, you want ${NOTICE_OPTIONS[longest].toLowerCase()}`}` : 'Notice period not given' });
  }
  if (f.workMode) {
    const modes = p.workModes || [];
    const ok = !modes.length || modes.includes(f.workMode);
    const name = (m) => ({ onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' })[m];
    fit.push({ key: 'workMode', ok, text: ok ? `${modes.length ? name(f.workMode) : 'Any work mode'}` : `Wants ${modes.map(name).join(' / ')}, not ${name(f.workMode)}` });
  }
  if (f.skills.length) {
    const have = new Set((p.skills || []).map((x) => x.toLowerCase()));
    const n = f.skills.filter((x) => have.has(x.toLowerCase())).length;
    fit.push({ key: 'skills', ok: n > 0, text: `Has ${n} of ${f.skills.length} skills you want` });
  }
  return fit;
}

export function filterScore(p, q) {
  const f = normalizeFilters(q);
  const parts = [];
  const roles = splitTerms(f.role);
  if (roles.length) {
    const own = roles.some((r) => titleRegexes(r).every((rx) => rx.test(p.headline || '') || rx.test(p.currentPost || '')));
    parts.push(['role', own ? 1 : 0.7]);
  }
  if (f.minExp !== null || f.maxExp !== null) {
    const y = p.experienceYears ?? 0;
    const lo = f.minExp ?? 0;
    const hi = f.maxExp ?? Infinity;
    parts.push(['experience', y >= lo && y <= hi ? 1 : y > hi ? Math.max(0.35, 0.85 - 0.08 * (y - hi)) : Math.max(0, 0.3 - 0.1 * (lo - y))]);
  }
  if (f.skills.length) {
    const have = new Set((p.skills || []).map((s) => s.toLowerCase()));
    parts.push(['skills', f.skills.filter((s) => have.has(s.toLowerCase())).length / f.skills.length]);
  }
  if (f.notice.length) parts.push(['notice', NOTICE_VALUE[p.noticePeriod] ?? 0.5]);
  if (f.minSalary !== null || f.maxSalary !== null) {
    const s = p.expectedSalary;
    const lo = f.minSalary ?? 0;
    const hi = f.maxSalary ?? Infinity;
    let v = 0.5;
    if (s != null) v = s >= lo && s <= hi ? 1 : s < lo ? Math.max(0.5, 0.85 - 0.05 * (lo - s)) : Math.max(0, 0.45 - 0.05 * (s - hi) + (p.salaryNegotiable ? 0.05 : 0));
    parts.push(['salary', v]);
  }
  if (f.workMode) {
    const modes = p.workModes || [];
    parts.push(['workMode', !modes.length ? 0.8 : modes.includes(f.workMode) ? 1 : 0.2]);
  }
  if (!parts.length) return null;
  const total = parts.reduce((a, [k]) => a + WEIGHTS[k], 0);
  return Math.round((100 * parts.reduce((a, [k, v]) => a + WEIGHTS[k] * v, 0)) / total);
}

// Every filter as a hard condition: used for saved-search alerts ("a new candidate matches
// all of these"). The swipe feed only uses role and location as hard conditions.
export function strictFilters(q) {
  const f = normalizeFilters(q);
  const where = {};
  const and = [];
  if (f.location && f.location !== ALL_INDIA) and.push(locationWhere(f.location));
  if (f.role) {
    const roles = splitTerms(f.role).filter(Boolean);
    if (roles.length) {
      and.push({ $or: roles.map(roleWhere) });
    }
  }
  if (f.minExp !== null || f.maxExp !== null) {
    where.experienceYears = {};
    if (f.minExp !== null) where.experienceYears.$gte = f.minExp;
    if (f.maxExp !== null) where.experienceYears.$lte = f.maxExp;
  }
  // "Max salary": the candidate's range must start at or below it (a 4–6 LPA candidate
  // matches "max 5"); someone open to negotiate may start up to 20% above it. People
  // already earning more than the max are left out (they won't take a pay cut).
  if (f.maxSalary !== null) {
    and.push({ $or: [{ currentSalary: null }, { currentSalary: { $lte: f.maxSalary } }] });
    and.push({
      $or: [
        { expectedSalary: { $lte: f.maxSalary } },
        { salaryNegotiable: true, expectedSalary: { $lte: f.maxSalary * NEGOTIATE_MARGIN } },
      ],
    });
  }
  if (f.minSalary !== null) {
    and.push({ $or: [{ expectedSalaryMax: { $gte: f.minSalary } }, { expectedSalaryMax: null, expectedSalary: { $gte: f.minSalary } }] });
  }
  // Notice period is a maximum: "15 days" also takes people who can join immediately.
  // Candidates who didn't say are kept too.
  if (f.notice.length) {
    const longest = Math.max(...f.notice.map((n) => NOTICE_OPTIONS.indexOf(n)));
    and.push({ $or: [{ noticePeriod: { $in: NOTICE_OPTIONS.slice(0, longest + 1) } }, { noticePeriod: { $in: [null, ''] } }] });
  }
  if (f.skills.length) where.skills = { $in: f.skills.map((sk) => new RegExp(`^${escapeRegex(sk)}$`, 'i')) };
  // Candidates who never picked a work mode are open to any.
  if (f.workMode) and.push({ $or: [{ workModes: f.workMode }, { workModes: { $exists: false } }, { workModes: { $size: 0 } }] });
  if (and.length) where.$and = and;
  return where;
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
