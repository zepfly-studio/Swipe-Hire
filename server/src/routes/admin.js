import { Router } from 'express';
import mongoose from 'mongoose';
import { adminOnly, perm } from '../middleware/admin.js';
import { User } from '../models/User.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Job } from '../models/Job.js';
import { Swipe } from '../models/Swipe.js';
import { Message } from '../models/Message.js';
import { Interview } from '../models/Interview.js';
import { Task } from '../models/Task.js';
import { Payment } from '../models/Payment.js';
import { Wishlist } from '../models/Wishlist.js';
import { config } from '../config/index.js';
import { HttpError } from '../utils/HttpError.js';
import { notifyCompany } from '../utils/notify.js';
import { withSignedFiles } from '../utils/signedUrl.js';
import { deleteAccount } from '../utils/deleteAccount.js';
import { adminRoleOf, isAdminEmail, logAdmin } from '../utils/adminAccess.js';
import { Report } from '../models/Report.js';
import { Ticket } from '../models/Ticket.js';
import moreRoutes from './adminMore.js';

const router = Router();

export { isAdminEmail };

// Every admin route needs an admin login (see middleware/admin.js); each route adds its permission.
router.use(adminOnly);

// Admin logins are not customers; keep them out of lists and counts.
const notAdmins = async () => {
  const staff = await User.find({ adminRole: { $exists: true } }).distinct('email');
  const emails = [...config.adminEmails, ...staff];
  return emails.length ? { email: { $nin: emails } } : {};
};

const PAGE_SIZE = 25;
const page = (q) => Math.max(1, Math.min(1000, Number.parseInt(q.page, 10) || 1));
const objectId = (id, what) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, `Invalid ${what}`);
  return new mongoose.Types.ObjectId(id);
};
// Escaped, case-insensitive "contains" search.
const contains = (q) => new RegExp(String(q).trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ---------- overview ----------
router.get('/stats', perm('view'), async (_req, res) => {
  const people = await notAdmins();
  const [
    candidates, companies, recruiters, liveCandidates, hiddenCandidates, completedCompanies, verifiedCompanies, pendingVerifications,
    suspended, unverifiedEmails, newUsers7d, jobsByStatus, swipes, shortlists, hires, messages, interviews, tasks, payments, signups,
  ] = await Promise.all([
    User.countDocuments({ ...people, role: 'candidate' }),
    User.countDocuments({ ...people, role: 'company', companyId: { $exists: false } }),
    User.countDocuments({ ...people, role: 'company', companyId: { $exists: true } }),
    CandidateProfile.countDocuments({ step: 3, openToWork: { $ne: false }, suspended: { $ne: true } }),
    CandidateProfile.countDocuments({ step: 3, openToWork: false }),
    CompanyProfile.countDocuments({ completed: true }),
    CompanyProfile.countDocuments({ 'verification.status': 'verified' }),
    CompanyProfile.countDocuments({ 'verification.status': 'pending' }),
    User.countDocuments({ ...people, suspended: true }),
    User.countDocuments({ ...people, emailVerified: false }),
    User.countDocuments({ ...people, createdAt: { $gte: daysAgo(7) } }),
    Job.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Swipe.countDocuments({}),
    Swipe.countDocuments({ action: 'right' }),
    Swipe.countDocuments({ action: 'right', stage: 'hired' }),
    Message.countDocuments({}),
    Interview.countDocuments({}),
    Task.countDocuments({}),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: '$mode', n: { $sum: 1 }, amount: { $sum: '$amount' }, swipes: { $sum: '$swipes' } } }]),
    User.aggregate([
      { $match: { ...people, createdAt: { $gte: daysAgo(13) } } },
      { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, role: '$role' }, n: { $sum: 1 } } },
    ]),
  ]);
  const jobs = Object.fromEntries(['open', 'paused', 'closed'].map((s) => [s, jobsByStatus.find((j) => j._id === s)?.n || 0]));
  const pay = (mode) => payments.find((p) => p._id === mode) || { n: 0, amount: 0, swipes: 0 };
  // Last 14 days (IST), oldest first, so the chart always has every day.
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const signupsByDay = days.map((day) => ({
    day,
    candidates: signups.find((s) => s._id.day === day && s._id.role === 'candidate')?.n || 0,
    companies: signups.find((s) => s._id.day === day && s._id.role === 'company')?.n || 0,
  }));
  const [openReports, openTickets, pendingReview, pendingJobs] = await Promise.all([
    Report.countDocuments({ status: 'open' }),
    Ticket.countDocuments({ status: 'open' }),
    CandidateProfile.countDocuments({ step: 3, 'review.status': { $exists: false } }),
    Job.countDocuments({ approved: false }),
  ]);
  const recent = await User.find(people).sort({ createdAt: -1 }).limit(8).select('name email role companyId createdAt suspended').lean();
  res.json({
    users: { candidates, companies, recruiters, suspended, unverifiedEmails, newLast7Days: newUsers7d },
    candidates: { live: liveCandidates, hidden: hiddenCandidates, incomplete: Math.max(0, candidates - liveCandidates - hiddenCandidates) },
    companies: { completed: completedCompanies, verified: verifiedCompanies, pendingVerification: pendingVerifications },
    jobs,
    activity: { swipes, shortlists, hires, messages, interviews, tasks },
    // Amounts are stored in rupees (see routes/payment.js).
    revenue: { paid: pay('razorpay'), demo: pay('demo') },
    signupsByDay,
    queues: { reports: openReports, tickets: openTickets, review: pendingReview, jobs: pendingJobs, verifications: pendingVerifications },
    recent: recent.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.companyId ? 'recruiter' : u.role, createdAt: u.createdAt, suspended: !!u.suspended })),
  });
});

// ---------- users ----------
// role: candidate | company (owners) | recruiter. status: all | live | incomplete | hidden | suspended | unverified | verified-company | pending-verification
router.get('/users', perm('view'), async (req, res) => {
  const role = ['candidate', 'company', 'recruiter'].includes(req.query.role) ? req.query.role : 'candidate';
  const status = String(req.query.status || 'all');
  const q = String(req.query.q || '').trim();
  const p = page(req.query);

  const where = role === 'candidate' ? { role: 'candidate' } : role === 'company' ? { role: 'company', companyId: { $exists: false } } : { role: 'company', companyId: { $exists: true } };
  Object.assign(where, await notAdmins());
  if (status === 'suspended') where.suspended = true;
  if (status === 'unverified') where.emailVerified = false;

  // Profile-based filters and search on profile fields: resolve to user ids first.
  let profileIds = null;
  if (role === 'candidate' && ['live', 'incomplete', 'hidden'].includes(status)) {
    const f = status === 'live' ? { step: 3, openToWork: { $ne: false }, suspended: { $ne: true } } : status === 'hidden' ? { step: 3, openToWork: false } : { step: { $lt: 3 } };
    profileIds = await CandidateProfile.find(f).distinct('user');
  }
  if (role === 'company' && ['verified-company', 'pending-verification', 'incomplete'].includes(status)) {
    const f = status === 'verified-company' ? { 'verification.status': 'verified' } : status === 'pending-verification' ? { 'verification.status': 'pending' } : { completed: { $ne: true } };
    profileIds = await CompanyProfile.find(f).distinct('user');
  }
  if (profileIds) where._id = { $in: profileIds };

  if (q) {
    const rx = contains(q);
    const fromProfiles =
      role === 'candidate'
        ? await CandidateProfile.find({ $or: [{ headline: rx }, { location: rx }, { skills: rx }, { phone: rx }] }).distinct('user')
        : await CompanyProfile.find({ $or: [{ companyName: rx }, { location: rx }, { industry: rx }] }).distinct('user');
    const or = [{ name: rx }, { email: rx }, { _id: { $in: fromProfiles } }];
    // Recruiters can be found by their company's name too.
    if (role === 'recruiter') or.push({ companyId: { $in: fromProfiles } });
    where.$and = [{ $or: or }];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(where),
    User.find(where).sort({ createdAt: -1 }).skip((p - 1) * PAGE_SIZE).limit(PAGE_SIZE).select('name email role companyId emailVerified suspended avatarUrl createdAt').lean(),
  ]);
  const ids = users.map((u) => u._id);
  const companyIds = role === 'recruiter' ? users.map((u) => u.companyId) : ids;
  const [cands, comps, jobCounts, shortlistCounts] = await Promise.all([
    role === 'candidate' ? CandidateProfile.find({ user: { $in: ids } }).select('user headline location experienceYears step openToWork expectedSalary activeAt').lean() : [],
    role !== 'candidate' ? CompanyProfile.find({ user: { $in: companyIds } }).select('user companyName location industry completed verification swipesLeft swipesPurchased').lean() : [],
    role === 'company' ? Job.aggregate([{ $match: { company: { $in: ids }, status: 'open' } }, { $group: { _id: '$company', n: { $sum: 1 } } }]) : [],
    role === 'candidate'
      ? Swipe.aggregate([{ $match: { candidate: { $in: ids }, action: 'right' } }, { $group: { _id: '$candidate', n: { $sum: 1 } } }])
      : role === 'company'
        ? Swipe.aggregate([{ $match: { company: { $in: ids }, action: 'right' } }, { $group: { _id: '$company', n: { $sum: 1 } } }])
        : [],
  ]);
  const byUser = (list, key = 'user') => Object.fromEntries(list.map((x) => [String(x[key]), x]));
  const cMap = byUser(cands);
  const coMap = byUser(comps);
  const jobsMap = byUser(jobCounts, '_id');
  const slMap = byUser(shortlistCounts, '_id');

  res.json({
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    users: users.map((u) => {
      const id = String(u._id);
      const base = { id, name: u.name, email: u.email, emailVerified: u.emailVerified !== false, suspended: !!u.suspended, createdAt: u.createdAt, avatarUrl: withSignedFiles(u).avatarUrl };
      if (role === 'candidate') {
        const c = cMap[id] || {};
        return { ...base, headline: c.headline, location: c.location, experienceYears: c.experienceYears, expectedSalary: c.expectedSalary, step: c.step ?? 0, openToWork: c.openToWork !== false, activeAt: c.activeAt, shortlists: slMap[id]?.n || 0 };
      }
      const co = coMap[String(role === 'recruiter' ? u.companyId : u._id)] || {};
      return {
        ...base,
        companyId: String(role === 'recruiter' ? u.companyId : u._id),
        companyName: co.companyName,
        location: co.location,
        industry: co.industry,
        completed: !!co.completed,
        verification: co.verification?.status || 'none',
        swipesLeft: co.swipesLeft,
        swipesPurchased: co.swipesPurchased,
        openJobs: jobsMap[id]?.n || 0,
        shortlists: slMap[id]?.n || 0,
      };
    }),
  });
});

// Everything about one account.
router.get('/users/:id', perm('view'), async (req, res) => {
  const id = objectId(req.params.id, 'user');
  const user = await User.findById(id).select('name email role companyId emailVerified suspended adminRole avatarUrl phone createdAt updatedAt').lean();
  if (!user) throw new HttpError(404, 'User not found');
  const out = {
    user: { ...withSignedFiles(user), id: String(user._id), role: user.companyId ? 'recruiter' : user.role, isAdmin: Boolean(adminRoleOf(user)), emailVerified: user.emailVerified !== false, suspended: !!user.suspended },
  };

  if (user.role === 'candidate') {
    const [profile, swipes, wishlisted, messages, interviews, tasks] = await Promise.all([
      CandidateProfile.findOne({ user: id }).lean(),
      Swipe.find({ candidate: id }).populate('job', 'title').sort({ createdAt: -1 }).limit(100).lean(),
      Wishlist.countDocuments({ candidate: id }),
      Message.countDocuments({ candidate: id }),
      Interview.countDocuments({ candidate: id }),
      Task.countDocuments({ candidate: id }),
    ]);
    const companies = await CompanyProfile.find({ user: { $in: swipes.map((s) => s.company) } }).select('user companyName').lean();
    const name = Object.fromEntries(companies.map((c) => [String(c.user), c.companyName]));
    out.profile = withSignedFiles(profile);
    out.counts = { views: swipes.length, shortlists: swipes.filter((s) => s.action === 'right').length, wishlisted, messages, interviews, tasks };
    out.shortlistedBy = swipes
      .filter((s) => s.action === 'right')
      .map((s) => ({ companyId: String(s.company), companyName: name[String(s.company)] || 'Deleted company', job: s.job?.title, stage: s.stage, at: s.createdAt }));
    return res.json(out);
  }

  const ownerId = user.companyId || id;
  const [company, owner, team, jobs, swipes, messages, interviews, tasks, payments] = await Promise.all([
    CompanyProfile.findOne({ user: ownerId }).lean(),
    User.findById(ownerId).select('name email').lean(),
    User.find({ companyId: ownerId }).select('name email suspended createdAt').lean(),
    Job.find({ company: ownerId }).sort({ createdAt: -1 }).lean(),
    Swipe.aggregate([{ $match: { company: new mongoose.Types.ObjectId(ownerId) } }, { $group: { _id: { action: '$action', stage: '$stage' }, n: { $sum: 1 } } }]),
    Message.countDocuments({ company: ownerId }),
    Interview.countDocuments({ company: ownerId }),
    Task.countDocuments({ company: ownerId }),
    Payment.find({ company: ownerId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  const sum = (f) => swipes.filter(f).reduce((a, s) => a + s.n, 0);
  out.company = withSignedFiles(company);
  out.owner = owner && { id: String(owner._id), name: owner.name, email: owner.email };
  out.team = team.map((t) => ({ id: String(t._id), name: t.name, email: t.email, suspended: !!t.suspended, createdAt: t.createdAt }));
  out.jobs = jobs.map((j) => ({ id: String(j._id), title: j.title, status: j.status, jobLocation: j.jobLocation, salaryMin: j.salaryMin, salaryMax: j.salaryMax, createdAt: j.createdAt }));
  out.counts = {
    swipes: sum(() => true),
    passes: sum((s) => s._id.action === 'left'),
    shortlists: sum((s) => s._id.action === 'right'),
    hired: sum((s) => s._id.stage === 'hired'),
    messages,
    interviews,
    tasks,
  };
  out.payments = payments.map((p) => ({ id: String(p._id), orderId: p.orderId, mode: p.mode, status: p.status, amount: p.amount, swipes: p.swipes, createdAt: p.createdAt }));
  res.json(out);
});

// Suspend / reinstate, or mark the email as verified.
export async function setSuspended(req, id, suspended) {
  const user = await User.findById(id).select('email role companyId emailVerified adminRole').lean();
  if (!user) throw new HttpError(404, 'User not found');
  if (adminRoleOf(user)) throw new HttpError(400, 'Admin accounts cannot be suspended');
  const ids = user.role === 'company' && !user.companyId ? [id, ...(await User.find({ companyId: id }).distinct('_id'))] : [id];
  await User.updateMany({ _id: { $in: ids } }, { $set: { suspended }, ...(suspended && { $inc: { tokenVersion: 1 } }) });
  if (user.role === 'candidate') await CandidateProfile.updateOne({ user: id }, { suspended });
  await logAdmin(req, suspended ? 'user.suspend' : 'user.reinstate', { targetType: 'user', targetId: id, summary: user.email });
  return ids.length;
}

router.patch('/users/:id', async (req, res) => {
  const id = objectId(req.params.id, 'user');
  const user = await User.findById(id).select('email role companyId suspended').lean();
  if (!user) throw new HttpError(404, 'User not found');
  const { suspended, emailVerified } = req.body ?? {};
  if (typeof suspended === 'boolean') {
    perm('users.manage')(req, res, () => {});
    return res.json({ ok: true, affected: await setSuspended(req, id, suspended) });
  }
  const set = {};
  if (typeof emailVerified === 'boolean') {
    perm('users.edit')(req, res, () => {});
    set.emailVerified = emailVerified;
  }
  if (!Object.keys(set).length) throw new HttpError(400, 'Nothing to change');
  await User.updateOne({ _id: id }, { $set: set });
  await logAdmin(req, 'user.email-verified', { targetType: 'user', targetId: id, summary: user.email });
  res.json({ ok: true, affected: 1 });
});

export async function adminDelete(req, id) {
  if (String(id) === req.user.id) throw new HttpError(400, 'You cannot delete your own account here');
  const user = await User.findById(id).select('email emailVerified adminRole').lean();
  if (!user) throw new HttpError(404, 'User not found');
  if (adminRoleOf(user)) throw new HttpError(400, 'Admin accounts cannot be deleted');
  const out = await deleteAccount(id);
  await logAdmin(req, 'user.delete', { targetType: 'user', targetId: id, summary: `${user.email} (${out.role})` });
  return out;
}

router.delete('/users/:id', perm('users.delete'), async (req, res) => {
  res.json({ ok: true, ...(await adminDelete(req, objectId(req.params.id, 'user'))) });
});

// Company controls: add or remove swipe credits, set the verification badge.
router.patch('/companies/:id', async (req, res) => {
  const id = objectId(req.params.id, 'company');
  if (req.body?.swipesDelta !== undefined) perm('credits')(req, res, () => {});
  if (req.body?.verification !== undefined) perm('verify')(req, res, () => {});
  const company = await CompanyProfile.findOne({ user: id }).select('swipesLeft verification companyName').lean();
  if (!company) throw new HttpError(404, 'Company not found');
  const { swipesDelta, verification } = req.body ?? {};
  const update = {};
  if (swipesDelta !== undefined) {
    const d = Number(swipesDelta);
    if (!Number.isInteger(d) || d === 0 || Math.abs(d) > 100000) throw new HttpError(400, 'Enter a whole number of swipes to add or remove');
    update.swipesLeft = Math.max(0, (company.swipesLeft || 0) + d);
  }
  if (verification !== undefined) {
    if (!['verified', 'none', 'rejected'].includes(verification)) throw new HttpError(400, 'Invalid verification status');
    update.verification = verification === 'verified' ? { status: 'verified', method: company.verification?.method || 'gst', verifiedAt: new Date() } : { status: verification };
  }
  if (!Object.keys(update).length) throw new HttpError(400, 'Nothing to change');
  const updated = await CompanyProfile.findOneAndUpdate({ user: id }, { $set: update }, { new: true }).lean();
  if (update.swipesLeft !== undefined) {
    await logAdmin(req, 'credits.change', { targetType: 'company', targetId: id, summary: `${company.companyName}: ${swipesDelta > 0 ? '+' : ''}${swipesDelta} swipes (now ${updated.swipesLeft})` });
  }
  if (verification !== undefined) await logAdmin(req, 'company.verification', { targetType: 'company', targetId: id, summary: `${company.companyName}: ${verification}` });
  if (verification === 'verified' && company.verification?.status !== 'verified') {
    notifyCompany(id, {
      type: 'verified',
      title: 'Your company is verified ✓',
      body: 'Candidates now see a verified badge next to your company name.',
      link: '/company/verify',
      email: true,
    });
  }
  res.json({ ok: true, swipesLeft: updated.swipesLeft, verification: updated.verification?.status || 'none' });
});

// ---------- jobs (every company) ----------
router.get('/jobs', perm('view'), async (req, res) => {
  const p = page(req.query);
  const where = {};
  if (['open', 'paused', 'closed'].includes(req.query.status)) where.status = req.query.status;
  if (req.query.status === 'pending') where.approved = false;
  if (req.query.status === 'flagged') where['flagged.at'] = { $exists: true };
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = contains(q);
    const companies = await CompanyProfile.find({ companyName: rx }).distinct('user');
    where.$or = [{ title: rx }, { jobLocation: rx }, { requiredSkills: rx }, { company: { $in: companies } }];
  }
  const [total, jobs] = await Promise.all([Job.countDocuments(where), Job.find(where).sort({ createdAt: -1 }).skip((p - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean()]);
  const ids = jobs.map((j) => j._id);
  const [companies, stats] = await Promise.all([
    CompanyProfile.find({ user: { $in: jobs.map((j) => j.company) } }).select('user companyName verification').lean(),
    Swipe.aggregate([{ $match: { job: { $in: ids } } }, { $group: { _id: '$job', seen: { $sum: 1 }, shortlisted: { $sum: { $cond: [{ $eq: ['$action', 'right'] }, 1, 0] } }, hired: { $sum: { $cond: [{ $eq: ['$stage', 'hired'] }, 1, 0] } } } }]),
  ]);
  const co = Object.fromEntries(companies.map((c) => [String(c.user), c]));
  const st = Object.fromEntries(stats.map((s) => [String(s._id), s]));
  res.json({
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    jobs: jobs.map((j) => ({
      id: String(j._id),
      title: j.title,
      status: j.status,
      company: { id: String(j.company), name: co[String(j.company)]?.companyName || 'Deleted company', verified: co[String(j.company)]?.verification?.status === 'verified' },
      jobLocation: j.jobLocation,
      workMode: j.workMode,
      jobType: j.jobType,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      minExperience: j.minExperience,
      maxExperience: j.maxExperience,
      openings: j.openings,
      requiredSkills: j.requiredSkills,
      description: j.description,
      approved: j.approved !== false,
      flagged: j.flagged?.at ? { reason: j.flagged.reason, at: j.flagged.at } : null,
      createdAt: j.createdAt,
      stats: { seen: st[String(j._id)]?.seen || 0, shortlisted: st[String(j._id)]?.shortlisted || 0, hired: st[String(j._id)]?.hired || 0 },
    })),
  });
});

// Change status, approve a waiting job, or flag / unflag it.
router.patch('/jobs/:id', perm('jobs'), async (req, res) => {
  const id = objectId(req.params.id, 'job');
  const { status, approved, flagged, flagReason } = req.body ?? {};
  const set = {};
  const unset = {};
  if (status !== undefined) {
    if (!['open', 'paused', 'closed'].includes(status)) throw new HttpError(400, 'Invalid status');
    set.status = status;
  }
  if (approved === true) unset.approved = 1;
  if (approved === false) set.approved = false;
  if (flagged === true) set.flagged = { reason: String(flagReason || 'Flagged by admin').slice(0, 200), at: new Date() };
  if (flagged === false) unset.flagged = 1;
  if (!Object.keys(set).length && !Object.keys(unset).length) throw new HttpError(400, 'Nothing to change');
  const before = await Job.findById(id).lean();
  if (!before) throw new HttpError(404, 'Job not found');
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  const job = await Job.findByIdAndUpdate(id, update, { new: true }).lean();
  if (approved === true && before.approved === false) {
    notifyCompany(job.company, { type: 'verified', title: `Your job "${job.title}" is approved`, body: 'You can start swiping candidates for it now.', link: '/company/swipe', email: true });
  }
  const what = [status && `status ${status}`, approved === true && 'approved', approved === false && 'unapproved', flagged === true && 'flagged', flagged === false && 'unflagged']
    .filter(Boolean)
    .join(', ');
  await logAdmin(req, 'job.update', { targetType: 'job', targetId: id, summary: `${job.title}: ${what}` });
  res.json({ ok: true, status: job.status, approved: job.approved !== false, flagged: job.flagged?.at ? job.flagged : null });
});

router.delete('/jobs/:id', perm('jobs'), async (req, res) => {
  const id = objectId(req.params.id, 'job');
  const job = await Job.findById(id).lean();
  if (!job) throw new HttpError(404, 'Job not found');
  // Shortlists made for this job stay in the company's pipeline; only the job itself goes.
  await Job.deleteOne({ _id: id });
  await logAdmin(req, 'job.delete', { targetType: 'job', targetId: id, summary: job.title });
  res.json({ ok: true });
});

// ---------- payments ----------
router.get('/payments', perm('payments'), async (req, res) => {
  const p = page(req.query);
  const where = {};
  if (['paid', 'created', 'refunded'].includes(req.query.status)) where.status = req.query.status;
  if (['razorpay', 'demo', 'manual'].includes(req.query.mode)) where.mode = req.query.mode;
  const [total, payments] = await Promise.all([Payment.countDocuments(where), Payment.find(where).sort({ createdAt: -1 }).skip((p - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean()]);
  const companies = await CompanyProfile.find({ user: { $in: payments.map((x) => x.company) } }).select('user companyName').lean();
  const name = Object.fromEntries(companies.map((c) => [String(c.user), c.companyName]));
  res.json({
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    payments: payments.map((x) => ({
      id: String(x._id),
      orderId: x.orderId,
      paymentId: x.paymentId,
      company: { id: String(x.company), name: name[String(x.company)] || 'Deleted company' },
      plan: x.planId,
      mode: x.mode,
      status: x.status,
      amount: x.amount,
      swipes: x.swipes,
      couponCode: x.couponCode,
      listPrice: x.listPrice,
      note: x.note,
      refundedAt: x.refundedAt,
      createdAt: x.createdAt,
    })),
  });
});

// ---------- company verification requests (GSTIN) ----------
router.get('/verifications', perm('view'), async (_req, res) => {
  const pending = await CompanyProfile.find({ 'verification.status': 'pending' })
    .populate('user', 'name email')
    .sort({ updatedAt: 1 })
    .lean();
  res.json({
    companies: pending.map((c) => ({
      id: String(c.user._id),
      companyName: c.companyName,
      website: c.website,
      location: c.location,
      gstin: c.gstin,
      contact: { name: c.user.name, email: c.user.email },
      requestedAt: c.updatedAt,
    })),
  });
});

router.post('/verifications/:companyId', perm('verify'), async (req, res) => {
  const { companyId } = req.params;
  if (!mongoose.isValidObjectId(companyId)) throw new HttpError(400, 'Invalid company');
  const approve = req.body?.approve === true;
  const updated = await CompanyProfile.findOneAndUpdate(
    { user: companyId, 'verification.status': 'pending' },
    {
      'verification.status': approve ? 'verified' : 'rejected',
      'verification.method': 'gst',
      'verification.verifiedAt': approve ? new Date() : undefined,
    },
  );
  if (!updated) throw new HttpError(404, 'No pending request for this company');
  await logAdmin(req, approve ? 'verification.approve' : 'verification.reject', { targetType: 'company', targetId: companyId, summary: `${updated.companyName} (${updated.gstin})` });
  notifyCompany(companyId, {
    type: 'verified',
    title: approve ? 'Your company is verified ✓' : 'Verification was not approved',
    body: approve
      ? 'Candidates now see a verified badge next to your company name.'
      : 'We could not verify your GSTIN. Please check it, or verify with your work email instead.',
    link: '/company/verify',
    email: true,
  });
  res.json({ ok: true });
});

export default router;

// Bulk actions on selected accounts: suspend | reinstate | verify-email | delete.
router.post('/users/bulk', async (req, res) => {
  const action = req.body?.action;
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((x) => mongoose.isValidObjectId(x)).slice(0, 200);
  if (!ids.length) throw new HttpError(400, 'Select at least one account');
  const need = { suspend: 'users.manage', reinstate: 'users.manage', 'verify-email': 'users.edit', delete: 'users.delete' }[action];
  if (!need) throw new HttpError(400, 'Invalid action');
  perm(need)(req, res, () => {});
  let done = 0;
  const failed = [];
  for (const id of ids) {
    try {
      if (action === 'suspend' || action === 'reinstate') await setSuspended(req, new mongoose.Types.ObjectId(id), action === 'suspend');
      else if (action === 'delete') await adminDelete(req, new mongoose.Types.ObjectId(id));
      else await User.updateOne({ _id: id }, { emailVerified: true });
      done += 1;
    } catch (err) {
      failed.push({ id, message: err.message });
    }
  }
  if (action === 'verify-email') await logAdmin(req, 'user.email-verified', { targetType: 'users', summary: `${done} accounts` });
  res.json({ ok: true, done, failed });
});

router.use(moreRoutes);
