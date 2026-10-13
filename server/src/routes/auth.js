import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { auth, companyIdOf, endSession, startSession } from '../middleware/auth.js';
import { TeamInvite } from '../models/TeamInvite.js';
import { hashToken } from './team.js';
import { HttpError } from '../utils/HttpError.js';
import { signUrl, withSignedFiles } from '../utils/signedUrl.js';
import { isAdminEmail } from './admin.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  // Only failed attempts count, so many people behind one office IP aren't blocked.
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in a few minutes' },
});

// A plain cross-site form can't add custom headers, so this stops other sites logging
// a visitor into an account of theirs (login CSRF).
function fromApp(req, _res, next) {
  if (req.get('x-requested-with') !== 'XMLHttpRequest' && req.get('x-auth-mode') !== 'token') {
    throw new HttpError(403, 'Request blocked, please refresh the page and try again');
  }
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const profileModel = (role) => (role === 'candidate' ? CandidateProfile : CompanyProfile);
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  isAdmin: isAdminEmail(u.email),
  avatarUrl: signUrl(u.avatarUrl),
  phone: u.phone,
  ...(u.role === 'company' && { companyId: companyIdOf(u), isOwner: !u.companyId }),
});

export async function session(user) {
  // Team members share the company owner's profile.
  const owner = user.role === 'company' ? companyIdOf(user) : user._id;
  const profile = await profileModel(user.role).findOne({ user: owner }).lean();
  return { user: publicUser(user), profile: withSignedFiles(profile) };
}

// ---- Team invites (public: the invited person has no account yet) ----
async function openInvite(token) {
  const invite = await TeamInvite.findOne({ tokenHash: hashToken(token), acceptedAt: null, expires: { $gt: new Date() } });
  if (!invite) throw new HttpError(404, 'This invite link is invalid or has expired. Ask your team for a new one.');
  return invite;
}

router.get('/invite/:token', async (req, res) => {
  const invite = await openInvite(req.params.token);
  const company = await CompanyProfile.findOne({ user: invite.company }).lean();
  res.json({ email: invite.email, companyName: company?.companyName || 'your team' });
});

router.post('/accept-invite', fromApp, limiter, async (req, res) => {
  const { token, name, password } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Please enter your name');
  if (typeof password !== 'string' || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  const invite = await openInvite(token);
  if (await User.exists({ email: invite.email })) throw new HttpError(409, 'An account with this email already exists');
  // Claim the invite first so it can only be used once.
  const claimed = await TeamInvite.findOneAndUpdate({ _id: invite._id, acceptedAt: null }, { acceptedAt: new Date() });
  if (!claimed) throw new HttpError(409, 'This invite was already used');
  const user = await User.create({
    name: name.trim(),
    email: invite.email,
    password: await bcrypt.hash(password, 10),
    role: 'company',
    companyId: invite.company,
  });
  res.status(201).json({ ...startSession(req, res, user), ...(await session(user)) });
});

router.post('/register', fromApp, limiter, async (req, res) => {
  const { name, email, password, role } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Please enter your name');
  if (!EMAIL_RE.test(email || '')) throw new HttpError(400, 'Please enter a valid email address');
  if (typeof password !== 'string' || password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }
  if (!['candidate', 'company'].includes(role)) throw new HttpError(400, 'Please choose an account type');

  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    role,
  });
  await profileModel(role).create({ user: user._id });

  res.status(201).json({ ...startSession(req, res, user), ...(await session(user)) });
});

router.post('/login', fromApp, limiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+password +tokenVersion');
  if (!user || !(await bcrypt.compare(String(password || ''), user.password))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  res.json({ ...startSession(req, res, user), ...(await session(user)) });
});

// No auth needed: an expired login must still be able to clear its cookie.
router.post('/logout', (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

// Ends the login on every device (e.g. after using a shared computer).
router.post('/logout-all', auth, async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
  endSession(res);
  res.json({ ok: true });
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Account not found, please log in again');
  res.json(await session(user));
});

export default router;
