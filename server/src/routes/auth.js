import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { auth, companyIdOf, endSession, startSession, SUSPENDED_MESSAGE } from '../middleware/auth.js';
import { TeamInvite } from '../models/TeamInvite.js';
import { hashToken } from './team.js';
import { HttpError } from '../utils/HttpError.js';
import { signUrl, withSignedFiles } from '../utils/signedUrl.js';
import { isAdminEmail } from './admin.js';
import { sendMail, mailEnabled } from '../utils/mailer.js';
import { config } from '../config/index.js';

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
  emailVerified: u.emailVerified !== false,
  isAdmin: isAdminEmail(u.email) && u.emailVerified !== false,
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
    // The invite link was emailed to this address, which proves they own it.
    emailVerified: true,
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
  if (user.suspended) throw new HttpError(403, SUSPENDED_MESSAGE);
  res.json({ ...startSession(req, res, user), ...(await session(user)) });
});

// ---- Email verification: a 6-digit code sent to the account's email ----
const OTP_TTL = 15 * 60 * 1000;
const OTP_COOLDOWN = 60 * 1000;
const OTP_WINDOW = 24 * 60 * 60 * 1000;
const OTP_MAX_SENDS = 8; // per day
const OTP_MAX_FAILS = 15; // per day
const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');
// The code is also shown on screen in local development without an email service, and
// while SHOW_EMAIL_CODE=true (testing before the site has a domain, when the email service
// can't reach everyone). That second case lets anyone sign up with any address, so turn it
// off before launch.
const showCodeOnScreen = () => (!mailEnabled && !config.isProd) || process.env.SHOW_EMAIL_CODE === 'true';

// Sends a code, or reuses the one sent less than a minute ago (e.g. the page was refreshed).
router.post('/email/send', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('+emailOtp');
  if (user.emailVerified !== false) return res.json({ verified: true });
  const prev = user.emailOtp;
  const now = Date.now();
  if (prev?.sentAt && now - prev.sentAt < OTP_COOLDOWN && prev.expires > now) {
    return res.json({ sentTo: user.email, retryIn: Math.ceil((OTP_COOLDOWN - (now - prev.sentAt)) / 1000), devCode: prev.dev || undefined });
  }
  const sameDay = prev?.windowStart && now - prev.windowStart < OTP_WINDOW;
  const usage = sameDay ? { sends: prev.sends || 0, fails: prev.fails || 0, windowStart: prev.windowStart } : { sends: 0, fails: 0, windowStart: new Date() };
  if (usage.sends >= OTP_MAX_SENDS || usage.fails >= OTP_MAX_FAILS) {
    throw new HttpError(429, 'Too many codes requested today. Please try again tomorrow.');
  }
  const code = String(crypto.randomInt(100000, 1000000));
  user.emailOtp = {
    hash: hashCode(code),
    expires: new Date(now + OTP_TTL),
    sentAt: new Date(now),
    tries: 0,
    ...usage,
    sends: usage.sends + 1,
    dev: showCodeOnScreen() ? code : undefined,
  };
  await user.save();
  try {
    await sendMail({
      to: user.email,
      subject: `${code} is your Glide Recruit code`,
      text: `Hi ${user.name.split(' ')[0]},\n\nYour Glide Recruit verification code is ${code}. It expires in 15 minutes.\n\nIf you didn't create a Glide Recruit account, you can ignore this email.\n\n— Team Glide Recruit`,
    });
  } catch (err) {
    console.error('[mail] verification code not sent:', err.message);
    // Testing mode: the code is on screen anyway, so a failed email isn't a dead end.
    if (showCodeOnScreen()) return res.json({ sentTo: user.email, retryIn: OTP_COOLDOWN / 1000, devCode: code });
    // Let the next tap send again right away instead of reusing a code that never arrived.
    await User.updateOne({ _id: user._id }, { $unset: { 'emailOtp.sentAt': 1 } });
    throw new HttpError(502, "We couldn't send the email right now. Please try again in a minute.");
  }
  res.json({ sentTo: user.email, retryIn: OTP_COOLDOWN / 1000, devCode: showCodeOnScreen() ? code : undefined });
});

router.post('/email/verify', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('+emailOtp');
  if (user.emailVerified !== false) return res.json(await session(user));
  const otp = user.emailOtp;
  if (!otp?.hash || otp.expires < new Date()) throw new HttpError(400, 'This code has expired. Tap "Send a new code".', { field: 'code' });
  if ((otp.fails || 0) >= OTP_MAX_FAILS) throw new HttpError(429, 'Too many wrong attempts today. Please try again tomorrow.');
  if ((otp.tries || 0) >= 5) throw new HttpError(429, 'Too many wrong attempts. Tap "Send a new code".', { field: 'code' });
  if (hashCode(String(req.body?.code ?? '').trim()) !== otp.hash) {
    await User.updateOne({ _id: user._id }, { $inc: { 'emailOtp.tries': 1, 'emailOtp.fails': 1 } });
    throw new HttpError(400, 'Wrong code, please check and try again', { field: 'code' });
  }
  user.emailVerified = true;
  user.emailOtp = undefined;
  await user.save();
  res.json(await session(user));
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
