import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { auth, requireOwner, requireRole, requireVerified } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { TeamInvite } from '../models/TeamInvite.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { HttpError } from '../utils/HttpError.js';
import { sendMail, mailEnabled } from '../utils/mailer.js';
import { config } from '../config/index.js';

const router = Router();
router.use(auth, requireVerified, requireRole('company'));

const MAX_TEAM = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  const [members, invites] = await Promise.all([
    User.find({ $or: [{ _id: cid }, { companyId: cid }] }).select('name email companyId createdAt').sort({ createdAt: 1 }).lean(),
    TeamInvite.find({ company: cid, acceptedAt: null, expires: { $gt: new Date() } }).sort({ createdAt: -1 }).lean(),
  ]);
  res.json({
    isOwner: req.user.isOwner,
    members: members.map((m) => ({
      id: String(m._id),
      name: m.name,
      email: m.email,
      role: m.companyId ? 'recruiter' : 'owner',
      you: String(m._id) === req.user.id,
      joinedAt: m.createdAt,
    })),
    invites: invites.map((i) => ({ id: String(i._id), email: i.email, expires: i.expires })),
  });
});

router.post('/invite', requireOwner, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address', { field: 'email' });
  const cid = req.user.companyId;
  if (await User.exists({ email })) throw new HttpError(409, 'This email already has a Swipe Hire account', { field: 'email' });
  const [members, pending] = await Promise.all([
    User.countDocuments({ $or: [{ _id: cid }, { companyId: cid }] }),
    TeamInvite.countDocuments({ company: cid, acceptedAt: null, expires: { $gt: new Date() } }),
  ]);
  if (members + pending >= MAX_TEAM) throw new HttpError(400, `Your team can have up to ${MAX_TEAM} people.`);

  // A new invite to the same email replaces the old one.
  await TeamInvite.deleteMany({ company: cid, email, acceptedAt: null });
  const token = crypto.randomBytes(24).toString('base64url');
  await TeamInvite.create({
    company: cid,
    email,
    tokenHash: hashToken(token),
    invitedBy: req.user.id,
    expires: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });

  const [company, inviter] = await Promise.all([
    CompanyProfile.findOne({ user: cid }).lean(),
    User.findById(req.user.id).select('name').lean(),
  ]);
  const link = `${config.clientUrls[0]}/join?token=${token}`;
  await sendMail({
    to: email,
    subject: `${inviter.name} invited you to ${company?.companyName || 'their team'} on Swipe Hire`,
    text: `${inviter.name} added you as a recruiter for ${company?.companyName || 'their company'}.\n\nAccept the invite (valid for 7 days):\n${link}`,
  });
  res.status(201).json({ ok: true, devLink: !mailEnabled && !config.isProd ? link : undefined });
});

router.delete('/invites/:id', requireOwner, async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) {
    await TeamInvite.deleteOne({ _id: req.params.id, company: req.user.companyId, acceptedAt: null });
  }
  res.json({ ok: true });
});

// Removing a recruiter deletes their login; their past messages and swipes stay with the company.
router.delete('/members/:id', requireOwner, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid member');
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot remove yourself');
  const removed = await User.deleteOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!removed.deletedCount) throw new HttpError(404, 'Member not found');
  res.json({ ok: true });
});

export default router;
