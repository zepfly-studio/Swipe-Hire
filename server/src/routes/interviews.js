import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { auth, requireRole } from '../middleware/auth.js';
import { Interview } from '../models/Interview.js';
import { Swipe } from '../models/Swipe.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { HttpError } from '../utils/HttpError.js';
import { shortlistedPair } from '../utils/pairs.js';
import { notify, notifyCompany } from '../utils/notify.js';
import { Job } from '../models/Job.js';
import { resolveJob } from '../utils/jobs.js';
import { text } from '../utils/fields.js';
import { signUrl } from '../utils/signedUrl.js';

const router = Router();
router.use(auth);

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

// Free video room, no account needed. Hard-to-guess name so strangers can't join.
const jitsiLink = () => `https://meet.jit.si/SwipeHire-${crypto.randomBytes(6).toString('hex')}`;

async function load(req, id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid interview');
  const field = req.user.role === 'company' ? 'company' : 'candidate';
  const interview = await Interview.findOne({ _id: id, [field]: req.user.role === 'company' ? req.user.companyId : req.user.id });
  if (!interview) throw new HttpError(404, 'Interview not found');
  return interview;
}

async function companyName(userId) {
  return (await CompanyProfile.findOne({ user: userId }).lean())?.companyName || 'A company';
}

router.get('/', async (req, res) => {
  const isCompany = req.user.role === 'company';
  const interviews = await Interview.find({ [isCompany ? 'company' : 'candidate']: isCompany ? req.user.companyId : req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const otherIds = interviews.map((i) => (isCompany ? i.candidate : i.company));
  const jobs = await Job.find({ _id: { $in: interviews.map((i) => i.job).filter(Boolean) } }).select('title').lean();
  const jobTitle = new Map(jobs.map((j) => [String(j._id), j.title]));
  const names = new Map();
  if (isCompany) {
    const profiles = await CandidateProfile.find({ user: { $in: otherIds } }).populate('user', 'name avatarUrl').lean();
    profiles.filter((p) => p.user).forEach((p) => names.set(String(p.user._id), { name: p.user.name, subtitle: p.headline, avatarUrl: signUrl(p.user.avatarUrl) }));
  } else {
    const profiles = await CompanyProfile.find({ user: { $in: otherIds } }).lean();
    profiles.forEach((p) =>
      names.set(String(p.user), { name: p.companyName, subtitle: p.hiringFor, verified: p.verification?.status === 'verified', avatarUrl: signUrl(p.logoUrl) }),
    );
  }
  res.json({
    interviews: interviews.map((i) => {
      const otherId = String(isCompany ? i.candidate : i.company);
      return {
        id: i._id,
        with: { id: otherId, ...names.get(otherId) },
        jobTitle: i.job ? jobTitle.get(String(i.job)) : undefined,
        slots: i.slots,
        chosenSlot: i.chosenSlot,
        durationMins: i.durationMins,
        mode: i.mode,
        meetingLink: i.status === 'confirmed' ? i.meetingLink : undefined,
        location: i.location,
        note: i.note,
        status: i.status,
        createdAt: i.createdAt,
      };
    }),
  });
});

router.post('/', requireRole('company'), async (req, res) => {
  const b = req.body ?? {};
  const { pair, otherId } = await shortlistedPair(req.user, b.candidateId);
  // Interview for a specific job (from the pipeline) or their most recent shortlist.
  const jobFilter = b.jobId ? { job: (await resolveJob(req.user.companyId, b.jobId))._id } : {};
  const swipe = await Swipe.findOne({ ...pair, action: 'right', ...jobFilter }).sort({ createdAt: -1 });
  if (!swipe) throw new HttpError(403, 'This candidate is not shortlisted for that job');

  const now = Date.now();
  const slots = (Array.isArray(b.slots) ? b.slots : [])
    .map((s) => new Date(s))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!slots.length || slots.length > 3) throw new HttpError(400, 'Please offer 1 to 3 time slots');
  if (slots.some((d) => d.getTime() < now + 15 * 60 * 1000)) throw new HttpError(400, 'Time slots must be at least 15 minutes from now');
  const mode = ['video', 'phone', 'in-person'].includes(b.mode) ? b.mode : 'video';
  const location = text(b.location, 200);
  if (mode === 'in-person' && !location) throw new HttpError(400, 'Please add the interview address');
  const link = text(b.meetingLink, 300);
  if (link && !/^https:\/\//.test(link)) throw new HttpError(400, 'Meeting link must start with https://');

  const open = await Interview.exists({ ...pair, status: { $in: ['proposed', 'confirmed'] }, chosenSlot: { $not: { $lt: new Date() } } });
  if (open) throw new HttpError(409, 'An interview with this candidate is already scheduled');

  const interview = await Interview.create({
    ...pair,
    job: swipe.job,
    slots: slots.sort((a, c) => a - c),
    durationMins: [15, 30, 45, 60].includes(Number(b.durationMins)) ? Number(b.durationMins) : 30,
    mode,
    location: mode === 'in-person' ? location : undefined,
    meetingLink: mode === 'video' ? link || jitsiLink() : undefined,
    note: text(b.note, 500),
  });
  if (!['hired', 'rejected'].includes(swipe.stage)) await Swipe.updateOne({ _id: swipe._id }, { stage: 'interview' });

  notify(otherId, {
    type: 'interview',
    title: `${await companyName(req.user.companyId)} invited you to an interview`,
    body: `Pick a time that works for you: ${interview.slots.map(fmt).join(' · ')} (IST)`,
    link: '/interviews',
    from: req.user.id,
    email: true,
  });
  res.status(201).json({ id: interview._id });
});

router.post('/:id/accept', requireRole('candidate'), async (req, res) => {
  const interview = await load(req, req.params.id);
  if (interview.status !== 'proposed') throw new HttpError(409, 'This interview is no longer open');
  const pick = new Date(req.body?.slot);
  const slot = interview.slots.find((s) => s.getTime() === pick.getTime());
  if (!slot) throw new HttpError(400, 'Please choose one of the offered times');
  if (slot.getTime() < Date.now()) throw new HttpError(400, 'That time has already passed, please ask for a new time in chat');

  interview.status = 'confirmed';
  interview.chosenSlot = slot;
  await interview.save();

  const candidate = await CandidateProfile.findOne({ user: req.user.id }).populate('user', 'name').lean();
  notifyCompany(interview.company, {
    type: 'interview',
    title: `${candidate?.user?.name || 'A candidate'} confirmed the interview`,
    body: `${fmt(slot)} IST · ${interview.mode === 'in-person' ? interview.location : interview.mode}`,
    link: '/interviews',
    from: req.user.id,
    email: true,
  });
  res.json({ ok: true });
});

router.post('/:id/cancel', async (req, res) => {
  const interview = await load(req, req.params.id);
  if (interview.status === 'cancelled') return res.json({ ok: true });
  interview.status = 'cancelled';
  interview.cancelledBy = req.user.id;
  await interview.save();

  const isCompany = req.user.role === 'company';
  const by = isCompany
    ? await companyName(req.user.companyId)
    : (await CandidateProfile.findOne({ user: req.user.id }).populate('user', 'name').lean())?.user?.name || 'The candidate';
  const payload = {
    type: 'interview',
    title: `${by} cancelled the interview`,
    body: text(req.body?.reason, 300) || 'You can agree on a new time in chat.',
    link: `/messages?with=${isCompany ? req.user.companyId : req.user.id}`,
    from: req.user.id,
    email: true,
  };
  if (isCompany) notify(interview.candidate, payload);
  else notifyCompany(interview.company, payload);
  res.json({ ok: true });
});

export default router;
