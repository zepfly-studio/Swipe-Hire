import { pick, cleanList } from './pick.js';
import { signUrl, withSignedFiles } from './signedUrl.js';
import { matchCandidate } from './match.js';

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

// Titles people use for the same kind of job. Searching one also finds the others, so
// "Web Developer" finds Frontend and Full Stack developers too.
const ROLE_FAMILIES = [
  ['web developer', 'frontend developer', 'front end developer', 'full stack developer', 'fullstack developer', 'react developer', 'mern stack developer', 'javascript developer', 'ui developer', 'wordpress developer', 'php developer'],
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
];

// One title -> every meaningful word must appear in the headline, current post or skills.
function titleWhere(title) {
  const words = roleWords(title);
  return {
    $and: (words.length ? words : [title]).map((w) => {
      const rx = new RegExp(escapeRegex(w), 'i');
      return { $or: [{ headline: rx }, { currentPost: rx }, { skills: rx }] };
    }),
  };
}

// A role matches its own words or any title from the same family.
function roleWhere(role) {
  const key = roleWords(role).join(' ');
  const titles = new Set([role]);
  for (const family of ROLE_FAMILIES) {
    if (family.some((t) => roleWords(t).join(' ') === key)) family.forEach((t) => titles.add(t));
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

// Filters -> extra Mongo conditions on CandidateProfile.
export function feedFilters(q) {
  const f = normalizeFilters(q);
  const where = {};
  const and = [];
  if (f.location && f.location !== ALL_INDIA) {
    const rx = new RegExp(escapeRegex(f.location), 'i');
    and.push({ $or: [{ location: rx }, { preferredLocations: rx }] });
  }
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
  // matches "max 5"), or the candidate is open to negotiate.
  if (f.maxSalary !== null) {
    and.push({ $or: [{ expectedSalary: { $lte: f.maxSalary } }, { salaryNegotiable: true }] });
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
