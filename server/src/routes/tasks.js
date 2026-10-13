import { Router } from 'express';
import mongoose from 'mongoose';
import { auth, requireRole, requireVerified } from '../middleware/auth.js';
import { Task } from '../models/Task.js';
import { Swipe } from '../models/Swipe.js';
import { Job } from '../models/Job.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { HttpError } from '../utils/HttpError.js';
import { shortlistedPair } from '../utils/pairs.js';
import { notify, notifyCompany } from '../utils/notify.js';
import { resolveJob } from '../utils/jobs.js';
import { text } from '../utils/fields.js';
import { signUrl } from '../utils/signedUrl.js';

// Tasks (assignments) a company sends shortlisted candidates before the interview.
const router = Router();
router.use(auth, requireVerified);

const HOUR = 60 * 60 * 1000;
const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

// Only full https links, so a submission can't carry javascript: or other schemes.
function link(value, label, field, { github = false } = {}) {
  const v = text(value, 300);
  if (!v) return undefined;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw new HttpError(400, `Please enter a valid ${label}`, { field });
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new HttpError(400, `Please enter a valid ${label}`, { field });
  if (github && !/(^|\.)github\.com$/i.test(url.hostname)) throw new HttpError(400, 'The repo link must be a github.com link', { field });
  return url.href;
}

async function load(req, id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid task');
  const isCompany = req.user.role === 'company';
  const task = await Task.findOne({ _id: id, ...(isCompany ? { company: req.user.companyId } : { candidate: req.user.id }) });
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}

const companyName = async (id) => (await CompanyProfile.findOne({ user: id }).lean())?.companyName || 'A company';
const candidateName = async (id) => (await CandidateProfile.findOne({ user: id }).populate('user', 'name').lean())?.user?.name || 'The candidate';

const publicTask = (t, people, jobs) => {
  const otherId = String(people.isCompany ? t.candidate : t.company);
  return {
    id: t._id,
    with: { id: otherId, ...people.map.get(otherId) },
    jobTitle: t.job ? jobs.get(String(t.job)) : undefined,
    title: t.title,
    description: t.description,
    briefUrl: t.briefUrl,
    dueAt: t.dueAt,
    // "overdue" isn't stored: it's an assigned task whose deadline has passed.
    status: t.status === 'assigned' && t.dueAt < new Date() ? 'overdue' : t.status,
    submission: t.submission?.at ? t.submission : undefined,
    createdAt: t.createdAt,
  };
};

// Company: all its tasks, or one candidate's (?candidateId). Candidate: tasks sent to them.
router.get('/', async (req, res) => {
  const isCompany = req.user.role === 'company';
  const where = isCompany ? { company: req.user.companyId } : { candidate: req.user.id, status: { $ne: 'cancelled' } };
  if (isCompany && req.query.candidateId) {
    if (!mongoose.isValidObjectId(req.query.candidateId)) throw new HttpError(400, 'Invalid candidate');
    where.candidate = req.query.candidateId;
  }
  const tasks = await Task.find(where).sort({ createdAt: -1 }).limit(200).lean();

  const otherIds = tasks.map((t) => (isCompany ? t.candidate : t.company));
  const [jobs, map] = await Promise.all([
    Job.find({ _id: { $in: tasks.map((t) => t.job).filter(Boolean) } }).select('title').lean(),
    (async () => {
      const m = new Map();
      if (isCompany) {
        const profiles = await CandidateProfile.find({ user: { $in: otherIds } }).populate('user', 'name avatarUrl').lean();
        profiles.filter((p) => p.user).forEach((p) => m.set(String(p.user._id), { name: p.user.name, subtitle: p.headline, avatarUrl: signUrl(p.user.avatarUrl) }));
      } else {
        const profiles = await CompanyProfile.find({ user: { $in: otherIds } }).lean();
        profiles.forEach((p) =>
          m.set(String(p.user), { name: p.companyName, verified: p.verification?.status === 'verified', avatarUrl: signUrl(p.logoUrl) }),
        );
      }
      return m;
    })(),
  ]);
  const jobTitles = new Map(jobs.map((j) => [String(j._id), j.title]));
  res.json({ tasks: tasks.map((t) => publicTask(t, { isCompany, map }, jobTitles)) });
});

router.post('/', requireRole('company'), async (req, res) => {
  const b = req.body ?? {};
  const { pair, otherId } = await shortlistedPair(req.user, b.candidateId);
  const jobFilter = b.jobId ? { job: (await resolveJob(req.user.companyId, b.jobId))._id } : {};
  const swipe = await Swipe.findOne({ ...pair, action: 'right', ...jobFilter }).sort({ createdAt: -1 });
  if (!swipe) throw new HttpError(403, 'This candidate is not shortlisted for that job');

  const title = text(b.title, 120);
  const description = text(b.description, 5000);
  if (!title) throw new HttpError(400, 'Please give the task a title', { field: 'title' });
  if (!description) throw new HttpError(400, 'Please describe what the candidate should build', { field: 'description' });
  const dueAt = new Date(b.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new HttpError(400, 'Please choose a deadline', { field: 'dueAt' });
  if (dueAt.getTime() < Date.now() + HOUR) throw new HttpError(400, 'The deadline must be at least 1 hour from now', { field: 'dueAt' });
  if (dueAt.getTime() > Date.now() + 30 * 24 * HOUR) throw new HttpError(400, 'The deadline can be at most 30 days away', { field: 'dueAt' });

  const task = await Task.create({
    ...pair,
    job: swipe.job,
    createdBy: req.user.id,
    title,
    description,
    briefUrl: link(b.briefUrl, 'reference link', 'briefUrl'),
    dueAt,
  });
  if (['shortlisted', 'contacted'].includes(swipe.stage)) await Swipe.updateOne({ _id: swipe._id }, { stage: 'task' });

  notify(otherId, {
    type: 'task',
    title: `${await companyName(req.user.companyId)} sent you a task`,
    body: `"${title}" · submit before ${fmt(dueAt)} IST with your live link and GitHub repo.`,
    link: '/tasks',
    from: req.user.id,
    email: true,
  });
  res.status(201).json({ id: task._id });
});

// Candidate submits (or updates) their work until the deadline.
router.post('/:id/submit', requireRole('candidate'), async (req, res) => {
  const task = await load(req, req.params.id);
  if (task.status === 'cancelled') throw new HttpError(409, 'This task was cancelled by the company');
  if (task.dueAt < new Date()) throw new HttpError(409, 'The deadline for this task has passed');
  const liveUrl = link(req.body?.liveUrl, 'live link', 'liveUrl');
  const repoUrl = link(req.body?.repoUrl, 'GitHub repo link', 'repoUrl', { github: true });
  if (!liveUrl && !repoUrl) throw new HttpError(400, 'Add your live link or GitHub repo link', { field: 'liveUrl' });
  const firstTime = task.status !== 'submitted';
  task.submission = { liveUrl, repoUrl, note: text(req.body?.note, 1000), at: new Date() };
  task.status = 'submitted';
  await task.save();

  notifyCompany(task.company, {
    type: 'task',
    title: `${await candidateName(req.user.id)} ${firstTime ? 'submitted' : 'updated'} "${task.title}"`,
    body: [liveUrl && `Live: ${liveUrl}`, repoUrl && `Repo: ${repoUrl}`].filter(Boolean).join(' · '),
    link: '/tasks',
    from: req.user.id,
    email: true,
  });
  res.json({ ok: true });
});

// Company moves the deadline (e.g. the candidate asked for more time).
router.patch('/:id', requireRole('company'), async (req, res) => {
  const task = await load(req, req.params.id);
  if (task.status === 'cancelled') throw new HttpError(409, 'This task was cancelled');
  const dueAt = new Date(req.body?.dueAt);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() < Date.now() + HOUR) {
    throw new HttpError(400, 'The new deadline must be at least 1 hour from now', { field: 'dueAt' });
  }
  if (dueAt.getTime() > Date.now() + 30 * 24 * HOUR) throw new HttpError(400, 'The deadline can be at most 30 days away', { field: 'dueAt' });
  task.dueAt = dueAt;
  await task.save();
  notify(task.candidate, {
    type: 'task',
    title: `New deadline for "${task.title}"`,
    body: `${await companyName(task.company)} changed the deadline to ${fmt(dueAt)} IST.`,
    link: '/tasks',
    from: req.user.id,
    email: true,
  });
  res.json({ ok: true });
});

router.post('/:id/cancel', requireRole('company'), async (req, res) => {
  const task = await load(req, req.params.id);
  if (task.status === 'cancelled') return res.json({ ok: true });
  task.status = 'cancelled';
  await task.save();
  notify(task.candidate, {
    type: 'task',
    title: `"${task.title}" was cancelled`,
    body: `${await companyName(task.company)} cancelled this task. You don't need to submit it.`,
    link: '/tasks',
    from: req.user.id,
  });
  res.json({ ok: true });
});

export default router;
