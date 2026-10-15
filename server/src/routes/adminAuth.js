import crypto from 'node:crypto';
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { clearAdminToken, issueAdminToken } from '../middleware/admin.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';
import { adminRoleOf } from '../utils/adminAccess.js';
import { adminTwoStep, showEmailCodeOn } from '../utils/settings.js';
import { sendMail } from '../utils/mailer.js';

// Second step of the admin login (/adminlogin): a 6-digit code emailed to the admin.
const router = Router();
const CODE_TTL = 10 * 60 * 1000;
const hash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

async function adminUser(req) {
  const user = await User.findById(req.user.id).select('name email emailVerified adminRole +tokenVersion +adminOtp');
  if (!adminRoleOf(user)) throw new HttpError(403, 'This account does not have admin access.');
  return user;
}

router.post('/send', auth, async (req, res) => {
  const user = await adminUser(req);
  if (!adminTwoStep()) {
    issueAdminToken(res, user);
    return res.json({ skip: true });
  }
  const code = String(crypto.randomInt(100000, 1000000));
  user.adminOtp = { hash: hash(code), expires: new Date(Date.now() + CODE_TTL), tries: 0 };
  await user.save();
  try {
    await sendMail({
      to: user.email,
      subject: `${code} is your Glide Recruit admin code`,
      text: `Hi ${user.name.split(' ')[0]},\n\nYour admin login code is ${code}. It expires in 10 minutes.\n\nIf you did not try to open the admin panel, change your password now.\n\n— Glide Recruit`,
    });
  } catch (err) {
    console.error('[admin] code not sent:', err.message);
    if (!showEmailCodeOn()) throw new HttpError(502, "We couldn't send the code right now. Please try again in a minute.");
  }
  res.json({ sentTo: user.email, devCode: showEmailCodeOn() ? code : undefined });
});

router.post('/verify', auth, async (req, res) => {
  const user = await adminUser(req);
  const otp = user.adminOtp;
  if (!otp?.hash || otp.expires < new Date()) throw new HttpError(400, 'This code has expired. Send a new code.', { field: 'code' });
  if ((otp.tries || 0) >= 5) throw new HttpError(429, 'Too many wrong attempts. Send a new code.', { field: 'code' });
  if (hash(String(req.body?.code ?? '').trim()) !== otp.hash) {
    await User.updateOne({ _id: user._id }, { $inc: { 'adminOtp.tries': 1 } });
    throw new HttpError(400, 'Wrong code, please check and try again', { field: 'code' });
  }
  await User.updateOne({ _id: user._id }, { $unset: { adminOtp: 1 } });
  const adminToken = issueAdminToken(res, user);
  // Apps that log in with a Bearer token keep the admin token themselves (sent as X-Admin-Token).
  const appClient = req.get('x-auth-mode') === 'token' || (req.get('authorization') || '').startsWith('Bearer ');
  res.json({ ok: true, ...(appClient && { adminToken }) });
});

router.post('/logout', (_req, res) => {
  clearAdminToken(res);
  res.json({ ok: true });
});

export default router;
