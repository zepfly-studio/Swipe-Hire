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

// Cleans filter input (query string or saved search) into a consistent shape.
export function normalizeFilters(q = {}) {
  return {
    location: String(q.location || '').trim().slice(0, 60),
    minExp: numParam(q.minExp),
    maxExp: numParam(q.maxExp),
    maxSalary: numParam(q.maxSalary),
    notice: (Array.isArray(q.notice) ? q.notice : String(q.notice || '').split(',')).filter((n) => NOTICE_OPTIONS.includes(n)),
    skills: cleanList(Array.isArray(q.skills) ? q.skills : String(q.skills || '').split(','), 10),
  };
}

// Filters -> extra Mongo conditions on CandidateProfile.
export function feedFilters(q) {
  const f = normalizeFilters(q);
  const where = {};
  if (f.location) {
    const rx = new RegExp(escapeRegex(f.location), 'i');
    where.$or = [{ location: rx }, { preferredLocations: rx }];
  }
  if (f.minExp !== null || f.maxExp !== null) {
    where.experienceYears = {};
    if (f.minExp !== null) where.experienceYears.$gte = f.minExp;
    if (f.maxExp !== null) where.experienceYears.$lte = f.maxExp;
  }
  if (f.maxSalary !== null) where.expectedSalary = { $lte: f.maxSalary };
  if (f.notice.length) where.noticePeriod = { $in: f.notice };
  if (f.skills.length) where.skills = { $in: f.skills.map((sk) => new RegExp(`^${escapeRegex(sk)}$`, 'i')) };
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
