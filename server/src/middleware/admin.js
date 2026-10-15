import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';
import { adminRoleOf, can } from '../utils/adminAccess.js';
import { adminTwoStep } from '../utils/settings.js';
import { auth, cookieOptions, readCookie } from './auth.js';

// Admin login = the normal session + (when two-step is on) a short-lived admin token,
// earned by entering a code emailed to the admin. Kept in its own cookie for /api/admin.
export const ADMIN_COOKIE = 'sh_admin';
const ADMIN_TTL = 12 * 60 * 60; // seconds
const adminCookieOptions = () => ({ ...cookieOptions(), path: '/api/admin' });

export function issueAdminToken(res, user) {
  const token = jwt.sign({ sub: String(user._id), purpose: 'admin', v: user.tokenVersion || 0 }, config.jwtSecret, { expiresIn: ADMIN_TTL });
  res.cookie(ADMIN_COOKIE, token, { ...adminCookieOptions(), maxAge: ADMIN_TTL * 1000 });
  return token;
}
export const clearAdminToken = (res) => res.clearCookie(ADMIN_COOKIE, adminCookieOptions());

function hasAdminToken(req, user) {
  const token = req.get('x-admin-token') || readCookie(req, ADMIN_COOKIE);
  if (!token) return false;
  try {
    const p = jwt.verify(token, config.jwtSecret);
    return p.purpose === 'admin' && p.sub === String(user._id) && (p.v || 0) === (user.tokenVersion || 0);
  } catch {
    return false;
  }
}

// Signed-in admin (any role). Sets req.admin = { role, email }.
export async function adminOnly(req, res, next) {
  await auth(req, res, () => {});
  const user = await User.findById(req.user.id).select('email emailVerified adminRole +tokenVersion').lean();
  const role = adminRoleOf(user);
  if (!role) throw new HttpError(403, 'Admins only');
  if (adminTwoStep() && !hasAdminToken(req, user)) {
    throw new HttpError(401, 'Please enter the code we emailed you to open the admin panel', { code: 'ADMIN_2FA' });
  }
  req.admin = { role, email: user.email };
  next();
}

export const perm = (p) => (req, _res, next) => {
  if (!can(req.admin?.role, p)) throw new HttpError(403, 'Your admin role does not allow this');
  next();
};
