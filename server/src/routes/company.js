import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { auth, requireRole, requireVerified } from '../middleware/auth.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Job } from '../models/Job.js';
import { Swipe } from '../models/Swipe.js';
import { Wishlist } from '../models/Wishlist.js';
import { Message } from '../models/Message.js';
import { Interview } from '../models/Interview.js';
import { Task } from '../models/Task.js';
import { Notification } from '../models/Notification.js';
import { SavedSearch } from '../models/SavedSearch.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';
import { withSignedFiles } from '../utils/signedUrl.js';
import { num, text, requireFields, stripUndefined } from '../utils/fields.js';
import { imageUpload, removeUpload, assertFileSignature } from '../middleware/upload.js';
import { storeUpload } from '../utils/storage.js';
import { feedFilters, normalizeFilters, toCard } from '../utils/candidates.js';
import { salaryFits, salaryFitWhere } from '../utils/match.js';
import { feedRank } from '../utils/activity.js';
import { jobFields, publicJob, resolveJob } from '../utils/jobs.js';
import { notify } from '../utils/notify.js';
import { sendMail, mailEnabled } from '../utils/mailer.js';
import { config } from '../config/index.js';

const router = Router();
router.use(auth, requireVerified, requireRole('company'));

async function getCompany(req) {
  const company = await CompanyProfile.findOne({ user: req.user.companyId }).lean();
  if (!company) throw new HttpError(404, 'Company profile not found');
  return company;
}

function assertId(id, what = 'candidate') {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, `Invalid ${what}`);
}

// "acme.com" -> "https://acme.com"; anything that isn't a web address is rejected.
function cleanUrl(value, field) {
  const v = text(value, 200);
  if (!v) return v;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes('.')) throw new Error();
    return u.toString().replace(/\/$/, '');
  } catch {
    throw new HttpError(400, 'Please enter a valid web address', { field });
  }
}

// Company logo (any team member can change it).
router.post('/logo', imageUpload, async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose an image');
  await assertFileSignature(req.file, 'image');
  const prev = await getCompany(req);
  const profile = await CompanyProfile.findOneAndUpdate(
    { user: req.user.companyId },
    { logoUrl: await storeUpload(req.file) },
    { returnDocument: 'after' },
  ).lean();
  if (prev.logoUrl) removeUpload(prev.logoUrl);
  res.json({ profile: withSignedFiles(profile) });
});

router.delete('/logo', async (req, res) => {
  const prev = await getCompany(req);
  const profile = await CompanyProfile.findOneAndUpdate({ user: req.user.companyId }, { $unset: { logoUrl: 1 } }, { returnDocument: 'after' }).lean();
  if (prev.logoUrl) removeUpload(prev.logoUrl);
  res.json({ profile: withSignedFiles(profile) });
});

// Company details. During onboarding the same request also carries the first job.
router.put('/profile', async (req, res) => {
  const b = req.body ?? {};
  const data = stripUndefined({
    companyName: text(b.companyName, 100),
    industry: text(b.industry, 60),
    website: cleanUrl(b.website, 'website'),
    companySize: text(b.companySize, 30),
    location: text(b.location, 80),
    about: text(b.about, 1500),
    address: text(b.address, 200),
    phone: text(b.phone, 20),
    contactEmail: text(b.contactEmail, 120)?.toLowerCase(),
    linkedin: cleanUrl(b.linkedin, 'linkedin'),
    foundedYear: num(b.foundedYear, 'founded year', { min: 1800, max: new Date().getFullYear(), field: 'foundedYear' }),
  });
  requireFields(data, { companyName: 'Company name', location: 'Company location' });
  if (data.phone && !/^\+?[\d\s-]{8,16}$/.test(data.phone)) throw new HttpError(400, 'Please enter a valid phone number', { field: 'phone' });
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    throw new HttpError(400, 'Please enter a valid email address', { field: 'contactEmail' });
  }

  const cid = req.user.companyId;
  // First time: the onboarding form also describes the first job. Later jobs are
  // managed on the Jobs page, so edits here only change company details.
  if (!(await Job.exists({ company: cid }))) {
    const job = jobFields(b);
    job.jobLocation = job.jobLocation || data.location;
    await Job.create({ ...job, company: cid, createdBy: req.user.id });
    // Kept on the profile for older screens; jobs are the source of truth now.
    data.hiringFor = job.title;
    data.requiredSkills = job.requiredSkills;
  }

  const current = await CompanyProfile.findOne({ user: cid }).lean();
  const renamed =
    current?.verification?.status && current.verification.status !== 'none' &&
    (data.companyName !== current.companyName || (data.website || '') !== (current.website || ''));
  if (renamed) {
    data.verification = { status: 'none' };
  }

  const profile = await CompanyProfile.findOneAndUpdate(
    { user: cid },
    { $set: { ...data, completed: true } },
    { returnDocument: 'after' },
  ).lean();
  res.json({ profile: withSignedFiles(profile) });
});

router.get('/feed', async (req, res) => {
  const company = await getCompany(req);
  if (!company.completed) throw new HttpError(403, 'Please complete your hiring requirements first');
  const job = await resolveJob(req.user.companyId, req.query.jobId);
  if (job.status !== 'open') throw new HttpError(409, 'This job is paused or closed. Reopen it to see candidates.');

  const exclude = String(req.query.exclude || '')
    .split(',')
    .filter((id) => mongoose.isValidObjectId(id));
  // Never hand out more cards than the company can actually swipe.
  const limit = Math.max(0, Math.min(Number(req.query.limit) || 10, 30, company.swipesLeft - exclude.length));
  if (limit === 0) return res.json({ candidates: [], swipesLeft: company.swipesLeft, job: publicJob(job) });

  const [swiped, wishlisted] = await Promise.all([
    Swipe.find({ company: req.user.companyId, job: job._id }).distinct('candidate'),
    Wishlist.find({ company: req.user.companyId }).distinct('candidate'),
  ]);
  const wish = new Set(wishlisted.map(String));

  // Candidates the job can't afford (and who won't negotiate) can't be shortlisted, so
  // they aren't shown at all: no swipe credits are spent on them.
  const profiles = await CandidateProfile.find({
    step: 3,
    openToWork: { $ne: false }, suspended: { $ne: true },
    user: { $nin: [...swiped, ...exclude] },
    $and: [feedFilters(req.query), salaryFitWhere(job)],
  })
    .populate('user', 'name avatarUrl')
    .sort({ activeAt: -1 })
    .limit(500)
    .lean();

  // Active candidates first (stale ones, who haven't confirmed "still looking", sink to the
  // bottom), then best match, with a small boost for people who joined this week.
  const now = Date.now();
  const candidates = profiles
    .filter((p) => p.user)
    .map((p) => {
      const card = toCard(p, job, { wishlisted: wish.has(String(p.user._id)) });
      return { card, rank: feedRank(p, card.matchScore, now) };
    })
    .sort((a, b) => a.rank.stale - b.rank.stale || b.rank.score - a.rank.score)
    .slice(0, limit)
    .map((x) => x.card);

  res.json({ candidates, swipesLeft: company.swipesLeft, job: publicJob(job) });
});

router.post('/swipe', async (req, res) => {
  const { candidateId, action, jobId } = req.body ?? {};
  assertId(candidateId);
  if (!['left', 'right'].includes(action)) throw new HttpError(400, 'Invalid swipe');
  const cid = req.user.companyId;

  const candidate = await CandidateProfile.findOne({ user: candidateId, step: 3, openToWork: { $ne: false }, suspended: { $ne: true } }).populate('user', 'name email').lean();
  if (!candidate?.user) throw new HttpError(404, 'Candidate not found');
  const job = await resolveJob(cid, jobId);
  if (action === 'right' && !salaryFits(candidate, job)) {
    throw new HttpError(
      409,
      `${candidate.user.name.split(' ')[0]} expects at least ₹${candidate.expectedSalary} LPA, above this job's budget of ₹${job.salaryMax} LPA, and is not open to negotiate.`,
      { code: 'SALARY_MISMATCH' },
    );
  }

  const company = await CompanyProfile.findOneAndUpdate(
    { user: cid, completed: true, swipesLeft: { $gt: 0 } },
    { $inc: { swipesLeft: -1 } },
    { returnDocument: 'after' },
  ).lean();
  if (!company) {
    if (!(await getCompany(req)).completed) throw new HttpError(403, 'Please complete your hiring requirements first');
    throw new HttpError(402, 'You have used all your swipes. Buy a plan to keep swiping.', { code: 'NO_SWIPES' });
  }

  try {
    await Swipe.create({ company: cid, candidate: candidateId, job: job._id, action, swipedBy: req.user.id });
  } catch (err) {
    await CompanyProfile.updateOne({ user: cid }, { $inc: { swipesLeft: 1 } });
    if (err.code === 11000) throw new HttpError(409, 'You have already swiped this candidate for this job');
    throw err;
  }

  if (action === 'right') {
    notify(candidateId, {
      type: 'shortlisted',
      // Anonymous on purpose: the candidate sees the company once it contacts them.
      title: 'A company shortlisted you!',
      body: `For a ${job.title} role. You'll see who it is as soon as they message you or send a task or interview invite.`,
      link: '/candidate',
      from: req.user.id,
      email: true,
    });
  }

  res.json({
    swipesLeft: company.swipesLeft,
    contact: action === 'right' ? { email: candidate.user.email, phone: candidate.phone } : undefined,
  });
});

// Takes back your most recent swipe (within 10 minutes). A pass is refunded; a shortlist
// isn't, because its contact details were already shown (else undo would make them free).
router.post('/swipe/undo', async (req, res) => {
  const cid = req.user.companyId;
  const last = await Swipe.findOne({
    company: cid,
    swipedBy: req.user.id,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  }).sort({ createdAt: -1 });
  if (!last) throw new HttpError(404, 'There is no recent swipe to undo');

  if (last.action === 'right') {
    const pair = { company: cid, candidate: last.candidate };
    const contacted =
      last.stage !== 'shortlisted' ||
      (await Message.exists({ ...pair, createdAt: { $gte: last.createdAt } })) ||
      (await Interview.exists({ ...pair, createdAt: { $gte: last.createdAt } })) ||
      (await Task.exists({ ...pair, createdAt: { $gte: last.createdAt } }));
    if (contacted) throw new HttpError(409, 'You have already contacted this candidate, so this swipe cannot be undone');
  }

  const removed = await Swipe.deleteOne({ _id: last._id });
  if (!removed.deletedCount) throw new HttpError(409, 'This swipe was already undone');
  const company = await CompanyProfile.findOneAndUpdate({ user: cid }, { $inc: { swipesLeft: last.action === 'left' ? 1 : 0 } }, { returnDocument: 'after' }).lean();
  if (last.action === 'right') {
    await Notification.deleteMany({ user: last.candidate, type: 'shortlisted', from: req.user.id, createdAt: { $gte: last.createdAt } });
  }

  const [profile, job, wished] = await Promise.all([
    CandidateProfile.findOne({ user: last.candidate }).populate('user', 'name avatarUrl').lean(),
    Job.findById(last.job).lean(),
    Wishlist.exists({ company: cid, candidate: last.candidate }),
  ]);
  res.json({
    swipesLeft: company.swipesLeft,
    action: last.action,
    jobId: String(last.job),
    card: profile?.user ? toCard(profile, job, { wishlisted: Boolean(wished) }) : null,
  });
});

// Body { wishlisted: true|false } sets the state, so repeated or stale requests are harmless.
router.put('/wishlist/:candidateId', async (req, res) => {
  const { candidateId } = req.params;
  assertId(candidateId);
  if (typeof req.body?.wishlisted !== 'boolean') throw new HttpError(400, 'Invalid request');
  const cid = req.user.companyId;

  if (!req.body.wishlisted) {
    await Wishlist.deleteOne({ company: cid, candidate: candidateId });
    return res.json({ wishlisted: false });
  }
  if (!(await CandidateProfile.exists({ user: candidateId, step: 3, openToWork: { $ne: false }, suspended: { $ne: true } }))) throw new HttpError(404, 'Candidate not found');
  try {
    await Wishlist.updateOne({ company: cid, candidate: candidateId }, { $setOnInsert: { company: cid, candidate: candidateId } }, { upsert: true });
  } catch (err) {
    if (err.code !== 11000) throw err; // two clicks at once: already saved
  }
  res.json({ wishlisted: true });
});

async function loadProfiles(ids) {
  const profiles = await CandidateProfile.find({ user: { $in: ids }, step: 3 }).populate('user', 'name email avatarUrl').lean();
  return new Map(profiles.filter((p) => p.user).map((p) => [String(p.user._id), p]));
}

router.get('/wishlist', async (req, res) => {
  const cid = req.user.companyId;
  const entries = await Wishlist.find({ company: cid }).sort({ createdAt: -1 }).lean();
  const ids = entries.map((e) => e.candidate);
  const [profiles, rightSwiped, job] = await Promise.all([
    loadProfiles(ids),
    Swipe.find({ company: cid, candidate: { $in: ids }, action: 'right' }).distinct('candidate'),
    resolveJob(cid).catch(() => null),
  ]);
  const shortlisted = new Set(rightSwiped.map(String));
  const candidates = ids
    .map((id) => profiles.get(String(id)))
    .filter(Boolean)
    .map((p) => {
      const isShortlisted = shortlisted.has(String(p.user._id));
      return toCard(p, job, {
        wishlisted: true,
        swipe: isShortlisted ? 'right' : null,
        // Already shortlisted -> the company has paid for the contact details.
        contact: isShortlisted ? { email: p.user.email, phone: p.phone } : undefined,
      });
    });
  res.json({ candidates });
});

// Pipeline: one entry per (candidate, job) the company shortlisted.
router.get('/shortlisted', async (req, res) => {
  const cid = req.user.companyId;
  const where = { company: cid, action: 'right' };
  if (req.query.jobId) where.job = (await resolveJob(cid, req.query.jobId))._id;
  const swipes = await Swipe.find(where).sort({ createdAt: -1 }).lean();
  const [profiles, jobs, wish] = await Promise.all([
    loadProfiles(swipes.map((s) => s.candidate)),
    Job.find({ company: cid }).lean(),
    Wishlist.find({ company: cid }).distinct('candidate'),
  ]);
  const jobBy = new Map(jobs.map((j) => [String(j._id), j]));
  const wished = new Set(wish.map(String));

  const candidates = swipes
    .map((s) => {
      const p = profiles.get(String(s.candidate));
      if (!p) return null;
      const job = jobBy.get(String(s.job));
      return toCard(p, job, {
        swipeId: String(s._id),
        job: job ? { id: String(job._id), title: job.title } : null,
        wishlisted: wished.has(String(s.candidate)),
        swipe: 'right',
        stage: s.stage,
        notes: s.notes ?? '',
        shortlistedAt: s.createdAt,
        contact: { email: p.user.email, phone: p.phone },
      });
    })
    .filter(Boolean);
  res.json({ candidates });
});

const STAGES = ['shortlisted', 'contacted', 'task', 'interview', 'hired', 'rejected'];

// Move a shortlisted candidate through the pipeline of one job and keep private notes.
router.patch('/pipeline/:swipeId', async (req, res) => {
  assertId(req.params.swipeId, 'pipeline entry');
  const update = {};
  if (req.body?.stage !== undefined) {
    if (!STAGES.includes(req.body.stage)) throw new HttpError(400, 'Invalid stage');
    update.stage = req.body.stage;
  }
  if (req.body?.notes !== undefined) update.notes = text(req.body.notes, 2000);
  const before = await Swipe.findOneAndUpdate({ _id: req.params.swipeId, company: req.user.companyId, action: 'right' }, update);
  if (!before) throw new HttpError(404, 'This candidate is not in your pipeline');

  if (update.stage === 'hired' && before.stage !== 'hired') {
    const [company, job] = await Promise.all([getCompany(req), Job.findById(before.job).lean()]);
    notify(before.candidate, {
      type: 'hired',
      title: `Congratulations! ${company.companyName} selected you 🎉`,
      body: `You have been selected for ${job?.title || 'the role'}. They will share the next steps with you.`,
      link: `/messages?with=${req.user.companyId}`,
      from: req.user.id,
      email: true,
    });
  }
  res.json({ ok: true, ...update });
});

// Removes a candidate from the shortlist for that job. The swipe becomes a pass, so they
// don't come back into this job's feed; the credit is not refunded (their contact was
// already shown). If no other job still has them shortlisted, open interviews and tasks
// with them are cancelled and chat closes (chat needs a shortlist).
router.delete('/pipeline/:swipeId', async (req, res) => {
  assertId(req.params.swipeId, 'pipeline entry');
  const cid = req.user.companyId;
  const swipe = await Swipe.findOneAndUpdate(
    { _id: req.params.swipeId, company: cid, action: 'right' },
    { $set: { action: 'left', stage: 'shortlisted', notes: '' } },
  );
  if (!swipe) throw new HttpError(404, 'This candidate is not in your pipeline');

  const pair = { company: cid, candidate: swipe.candidate };
  const stillShortlisted = await Swipe.exists({ ...pair, action: 'right' });
  let cancelled = { interviews: 0, tasks: 0 };
  if (!stillShortlisted) {
    const [iv, tk] = await Promise.all([
      Interview.updateMany({ ...pair, status: { $in: ['proposed', 'confirmed'] } }, { status: 'cancelled', cancelledBy: req.user.id }),
      Task.updateMany({ ...pair, status: 'assigned' }, { status: 'cancelled' }),
      Notification.deleteMany({ user: swipe.candidate, type: 'shortlisted', from: swipe.swipedBy }),
    ]);
    cancelled = { interviews: iv.modifiedCount, tasks: tk.modifiedCount };
  }
  res.json({ ok: true, stillShortlisted: Boolean(stillShortlisted), cancelled });
});

// ---- Saved searches (swipe-screen filters + new-candidate alerts) ----
router.get('/searches', async (req, res) => {
  const searches = await SavedSearch.find({ company: req.user.companyId }).sort({ createdAt: -1 }).lean();
  res.json({ searches: searches.map((s) => ({ id: String(s._id), name: s.name, filters: s.filters, alerts: s.alerts })) });
});

router.post('/searches', async (req, res) => {
  const name = text(req.body?.name, 60);
  if (!name) throw new HttpError(400, 'Give this search a name', { field: 'name' });
  const filters = normalizeFilters(req.body?.filters);
  const empty = !filters.location && filters.minExp === null && filters.maxExp === null && filters.maxSalary === null && !filters.notice.length && !filters.skills.length;
  if (empty) throw new HttpError(400, 'Set at least one filter before saving the search');
  if ((await SavedSearch.countDocuments({ company: req.user.companyId })) >= 20) {
    throw new HttpError(400, 'You can save up to 20 searches. Delete one first.');
  }
  // Candidates who already match are not "new" — don't alert for them.
  const existing = await CandidateProfile.find({ step: 3, suspended: { $ne: true }, ...feedFilters(filters) }).distinct('user');
  const s = await SavedSearch.create({
    company: req.user.companyId,
    createdBy: req.user.id,
    name,
    filters,
    alerts: req.body?.alerts !== false,
    notifiedCandidates: existing.slice(-5000),
  });
  res.status(201).json({ search: { id: String(s._id), name: s.name, filters: s.filters, alerts: s.alerts } });
});

router.patch('/searches/:id', async (req, res) => {
  assertId(req.params.id, 'search');
  const update = {};
  if (typeof req.body?.alerts === 'boolean') update.alerts = req.body.alerts;
  if (req.body?.name !== undefined) update.name = text(req.body.name, 60) || undefined;
  const s = await SavedSearch.findOneAndUpdate({ _id: req.params.id, company: req.user.companyId }, update, { returnDocument: 'after' }).lean();
  if (!s) throw new HttpError(404, 'Saved search not found');
  res.json({ search: { id: String(s._id), name: s.name, filters: s.filters, alerts: s.alerts } });
});

router.delete('/searches/:id', async (req, res) => {
  assertId(req.params.id, 'search');
  await SavedSearch.deleteOne({ _id: req.params.id, company: req.user.companyId });
  res.json({ ok: true });
});

// ---- Verified badge: work-email OTP (instant) or GSTIN (checked by an admin) ----
const FREE_EMAIL = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|rediffmail|icloud|me|aol|proton|protonmail|zoho|gmx|yandex)\./i;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const domainOf = (url) => {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

router.get('/verification', async (req, res) => {
  const company = await getCompany(req);
  const user = await User.findById(req.user.id).select('email').lean();
  res.json({
    verification: company.verification ?? { status: 'none' },
    gstin: company.gstin,
    website: company.website,
    email: user.email,
  });
});

router.post('/verification/gst', async (req, res) => {
  const gstin = String(req.body?.gstin || '').trim().toUpperCase();
  if (!GSTIN.test(gstin)) throw new HttpError(400, 'Please enter a valid 15-character GSTIN', { field: 'gstin' });
  const company = await getCompany(req);
  if (company.verification?.status === 'verified') throw new HttpError(409, 'Your company is already verified');
  await CompanyProfile.updateOne({ user: req.user.companyId }, { gstin, 'verification.status': 'pending', 'verification.method': 'gst' });
  res.json({ verification: { status: 'pending', method: 'gst' } });
});

const OTP_WINDOW = 24 * 60 * 60 * 1000;

router.post('/verification/email/send', async (req, res) => {
  const [company, user, withOtp] = await Promise.all([
    getCompany(req),
    User.findById(req.user.id).lean(),
    CompanyProfile.findOne({ user: req.user.companyId }).select('+emailOtp').lean(),
  ]);
  if (company.verification?.status === 'verified') throw new HttpError(409, 'Your company is already verified');
  const prev = withOtp?.emailOtp;
  const sameDay = prev?.windowStart && Date.now() - new Date(prev.windowStart) < OTP_WINDOW;
  const usage = sameDay ? { sends: prev.sends || 0, fails: prev.fails || 0, windowStart: prev.windowStart } : { sends: 0, fails: 0, windowStart: new Date() };
  if (usage.sends >= 5 || usage.fails >= 15) throw new HttpError(429, 'Too many codes requested today. Please try again tomorrow, or use GST verification.');
  if (FREE_EMAIL.test(user.email)) {
    throw new HttpError(400, 'Your login email is a personal email. Use GST verification, or sign up with your work email.');
  }
  const emailDomain = user.email.split('@')[1];
  const site = domainOf(company.website || '');
  if (!site) throw new HttpError(400, 'Add your company website in your company profile first, so we can match your email to it.');
  if (!(emailDomain === site || emailDomain.endsWith(`.${site}`) || site.endsWith(`.${emailDomain}`))) {
    throw new HttpError(400, `Your email (@${emailDomain}) does not match your website (${site}).`);
  }
  const code = String(crypto.randomInt(100000, 1000000));
  await CompanyProfile.updateOne(
    { user: req.user.companyId },
    { emailOtp: { hash: crypto.createHash('sha256').update(code).digest('hex'), expires: new Date(Date.now() + 10 * 60 * 1000), tries: 0, ...usage, sends: usage.sends + 1 } },
  );
  await sendMail({
    to: user.email,
    subject: 'Your Glide Recruit verification code',
    text: `Your code is ${code}. It expires in 10 minutes.\n\nIf you did not ask for this, you can ignore this email.`,
  });
  // Local development without SMTP: hand the code back so the flow can be tested.
  res.json({ sentTo: user.email, devCode: !mailEnabled && !config.isProd ? code : undefined });
});

router.post('/verification/email/confirm', async (req, res) => {
  const company = await CompanyProfile.findOne({ user: req.user.companyId }).select('+emailOtp').lean();
  const otp = company?.emailOtp;
  if (!otp?.hash || otp.expires < new Date()) throw new HttpError(400, 'Code expired, please request a new one');
  if (otp.tries >= 5) throw new HttpError(429, 'Too many wrong attempts, please request a new code');
  const hash = crypto.createHash('sha256').update(String(req.body?.code || '').trim()).digest('hex');
  if (hash !== otp.hash) {
    await CompanyProfile.updateOne({ user: req.user.companyId }, { $inc: { 'emailOtp.tries': 1, 'emailOtp.fails': 1 } });
    throw new HttpError(400, 'Wrong code, please check and try again', { field: 'code' });
  }
  const verification = { status: 'verified', method: 'email', verifiedAt: new Date() };
  await CompanyProfile.updateOne({ user: req.user.companyId }, { verification, $unset: { emailOtp: 1 } });
  res.json({ verification });
});

export default router;
