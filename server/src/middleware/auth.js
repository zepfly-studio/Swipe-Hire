import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';

// Browsers keep the login in an httpOnly cookie, which page scripts can't read,
// so an injected script can't steal it. Other API clients may send a Bearer token.
export const SESSION_COOKIE = 'sh_session';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, v: user.tokenVersion || 0 }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd || config.cookieSameSite === 'none', // browsers require Secure for SameSite=None
  sameSite: config.cookieSameSite,
  path: '/api',
});

// Logs the browser in. API clients that ask for it (X-Auth-Mode: token) also get the token itself.
export function startSession(req, res, user) {
  const token = signToken(user);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE });
  return req.get('x-auth-mode') === 'token' ? { token } : {};
}

export const endSession = (res) => res.clearCookie(SESSION_COOKIE, cookieOptions());

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// The company "account" all company data hangs off: the owner's user id.
export const companyIdOf = (user) => String(user.companyId || user._id);

export async function auth(req, _res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || readCookie(req, SESSION_COOKIE);
  if (!token) throw new HttpError(401, 'Please log in to continue');
  // Cookies are sent automatically, so a change made with one must come from our own
  // app: other sites can't add this header without passing the CORS check (CSRF guard).
  if (!bearer && !SAFE_METHODS.includes(req.method) && req.get('x-requested-with') !== 'XMLHttpRequest') {
    throw new HttpError(403, 'Request blocked, please refresh the page and try again');
  }
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session has expired, please log in again');
  }
  // Looked up every time so a removed team member is logged out immediately.
  const user = await User.findById(payload.sub).select('role companyId +tokenVersion').lean();
  if (!user) throw new HttpError(401, 'Your account no longer exists, please log in again');
  if ((payload.v || 0) !== (user.tokenVersion || 0)) throw new HttpError(401, 'Your session has expired, please log in again');
  req.user = {
    id: payload.sub,
    role: user.role,
    companyId: user.role === 'company' ? companyIdOf(user) : undefined,
    isOwner: user.role === 'company' && !user.companyId,
  };
  next();
}

export const requireRole = (role) => (req, _res, next) => {
  if (req.user.role !== role) throw new HttpError(403, 'You do not have access to this');
  next();
};

export const requireOwner = (req, _res, next) => {
  if (!req.user.isOwner) throw new HttpError(403, 'Only the account owner can do this');
  next();
};
