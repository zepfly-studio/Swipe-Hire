import crypto from 'node:crypto';
import path from 'node:path';
import { config } from '../config/index.js';
import { SERVED_TYPES } from '../middleware/upload.js';

// Uploaded resumes/videos are private. API responses hand out time-limited
// signed links; the /uploads route rejects anything without a valid signature.
// Expiry is rounded to fixed windows so the same file keeps the same URL for a
// while (browser cache works) and every link stays valid for 3–6 hours.
const WINDOW_SECONDS = 3 * 60 * 60;

const signature = (filePath, exp) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${filePath}:${exp}`).digest('base64url');

export function signUrl(filePath) {
  if (!filePath?.startsWith('/uploads/')) return filePath;
  const exp = (Math.floor(Date.now() / 1000 / WINDOW_SECONDS) + 2) * WINDOW_SECONDS;
  return `${filePath}?exp=${exp}&sig=${signature(filePath, exp)}`;
}

const FILE_FIELDS = ['resumeUrl', 'videoUrl', 'logoUrl', 'avatarUrl'];

// Signs every uploaded-file link on an object (profile, user, card).
export function withSignedFiles(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const k of FILE_FIELDS) if (out[k]) out[k] = signUrl(out[k]);
  return out;
}

export function verifySignedRequest(req, res, next) {
  const filePath = `/uploads${req.path}`;
  const exp = Number(req.query.exp);
  const sig = String(req.query.sig || '');
  const expected = Number.isFinite(exp) ? signature(filePath, exp) : '';
  const valid =
    exp > Date.now() / 1000 &&
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return res.status(403).json({ message: 'This link has expired, please refresh the page' });
  if (!SERVED_TYPES[path.extname(req.path).toLowerCase()]) return res.status(404).json({ message: 'Not found' });
  next();
}

// Extra safety headers so a file can never run as a web page on our domain.
// (No sandbox CSP on PDFs: Chrome refuses to show sandboxed PDFs in a new tab.)
export function uploadHeaders(res, filePath) {
  const type = SERVED_TYPES[path.extname(filePath).toLowerCase()];
  res.setHeader('Content-Type', type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (type !== 'application/pdf') res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
}
