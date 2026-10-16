import mongoose from 'mongoose';
import { Job } from '../models/Job.js';
import { HttpError } from './HttpError.js';
import { cleanList } from './pick.js';
import { num, salary, text, requireFields, stripUndefined } from './fields.js';
import { requireJobApproval } from './settings.js';
import { ALL_INDIA, normalizeFilters } from './candidates.js';

export const WORK_MODES = ['onsite', 'remote', 'hybrid'];
export const JOB_TYPES = ['full-time', 'part-time', 'internship', 'contract'];

// The job a request is about: the one asked for, else the company's oldest open job.
export async function resolveJob(companyId, jobId) {
  if (jobId) {
    if (!mongoose.isValidObjectId(jobId)) throw new HttpError(400, 'Invalid job');
    const job = await Job.findOne({ _id: jobId, company: companyId }).lean();
    if (!job) throw new HttpError(404, 'Job not found');
    return job;
  }
  // Companies no longer post jobs, so with nothing yet use a general "Candidate search".
  return (
    (await Job.findOne({ company: companyId, status: 'open' }).sort({ createdAt: 1 }).lean()) ||
    (await Job.findOne({ company: companyId }).sort({ createdAt: 1 }).lean()) ||
    resolveFilterJob(companyId, {})
  );
}

// Each distinct set of swipe filters is kept as a hidden "search" job, so shortlists, match
// scores and the pipeline keep working without the company posting jobs.
export async function resolveFilterJob(companyId, input, retry = true) {
  const filters = normalizeFilters(input);
  const searchKey = JSON.stringify(filters);
  const title = filters.role || filters.skills.slice(0, 3).join(', ') || 'Candidate search';
  try {
    return await Job.findOneAndUpdate(
      { company: companyId, internalSearch: true, searchKey },
      {
        $setOnInsert: {
          company: companyId,
          internalSearch: true,
          searchKey,
          title: title.slice(0, 80),
          requiredSkills: filters.skills,
          minExperience: filters.minExp,
          maxExperience: filters.maxExp,
          salaryMin: filters.minSalary,
          salaryMax: filters.maxSalary,
          jobLocation: filters.location === ALL_INDIA ? '' : filters.location,
          workMode: filters.workModes[0] || 'onsite',
          status: 'open',
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).lean();
  } catch (err) {
    // Two requests created the same search job at once; the other one won, so use it.
    if (err.code === 11000 && retry) return resolveFilterJob(companyId, input, false);
    throw err;
  }
}

// Validates job input. Accepts the old onboarding names (hiringFor) too.
export function jobFields(b = {}) {
  const data = stripUndefined({
    title: text(b.title ?? b.hiringFor, 80),
    requiredSkills: b.requiredSkills === undefined ? undefined : cleanList(b.requiredSkills),
    minExperience: num(b.minExperience, 'minimum experience', { max: 50, field: 'minExperience' }),
    maxExperience: num(b.maxExperience, 'maximum experience', { max: 50, field: 'maxExperience' }),
    salaryMin: salary(b.salaryMin, 'minimum salary', 'salaryMin'),
    salaryMax: salary(b.salaryMax, 'maximum salary', 'salaryMax'),
    jobLocation: text(b.jobLocation, 80),
    workMode: WORK_MODES.includes(b.workMode) ? b.workMode : undefined,
    jobType: JOB_TYPES.includes(b.jobType) ? b.jobType : undefined,
    openings: b.openings === undefined || b.openings === '' ? undefined : num(b.openings, 'number of openings', { min: 1, max: 1000, field: 'openings' }),
    description: text(b.description, 3000),
  });
  requireFields(data, {
    title: 'Role you are hiring for',
    requiredSkills: 'At least one required skill',
    salaryMax: 'Maximum salary',
  });
  if (data.minExperience != null && data.maxExperience != null && data.minExperience > data.maxExperience) {
    throw new HttpError(400, 'Minimum experience cannot be more than maximum experience', { field: 'minExperience' });
  }
  if (data.salaryMin != null && data.salaryMin > data.salaryMax) {
    throw new HttpError(400, 'Minimum salary cannot be more than maximum salary', { field: 'salaryMin' });
  }
  return data;
}

export const publicJob = (j) => ({
  id: String(j._id),
  title: j.title,
  requiredSkills: j.requiredSkills ?? [],
  minExperience: j.minExperience,
  maxExperience: j.maxExperience,
  salaryMin: j.salaryMin,
  salaryMax: j.salaryMax,
  jobLocation: j.jobLocation,
  workMode: j.workMode,
  jobType: j.jobType,
  openings: j.openings,
  description: j.description,
  status: j.status,
  // false while the job waits for admin approval.
  approved: j.approved !== false,
  createdAt: j.createdAt,
});

// With "approve new companies' first job" switched on, a company's job waits for an admin
// until the company has at least one approved job.
export async function needsApproval(companyId) {
  if (!requireJobApproval()) return false;
  return !(await Job.exists({ company: companyId, approved: { $ne: false } }));
}
