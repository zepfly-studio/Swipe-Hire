import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { auth, endSession, startSession } from '../middleware/auth.js';
import { imageUpload, removeUpload, assertFileSignature } from '../middleware/upload.js';
import { storeUpload } from '../utils/storage.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';
import { text } from '../utils/fields.js';
import { session } from './auth.js';
import { deleteAccount } from '../utils/deleteAccount.js';
import { adminRoleOf } from '../utils/adminAccess.js';

// The signed-in person's own account: name, phone, photo, password, and deleting it.
const router = Router();
router.use(auth);

const PHONE = /^\+?[\d\s-]{10,16}$/;

router.put('/', async (req, res) => {
  const update = {};
  if (req.body?.name !== undefined) {
    const name = text(req.body.name, 80);
    if (!name) throw new HttpError(400, 'Please enter your name', { field: 'name' });
    update.name = name;
  }
  if (req.body?.phone !== undefined) {
    const phone = text(req.body.phone, 20);
    if (phone && !PHONE.test(phone)) throw new HttpError(400, 'Please enter a valid phone number', { field: 'phone' });
    update.phone = phone || undefined;
  }
  const user = await User.findByIdAndUpdate(req.user.id, update, { returnDocument: 'after' });
  res.json(await session(user));
});

router.post('/avatar', imageUpload, async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose a photo');
  await assertFileSignature(req.file, 'image');
  const prev = await User.findById(req.user.id).select('avatarUrl').lean();
  const user = await User.findByIdAndUpdate(req.user.id, { avatarUrl: await storeUpload(req.file) }, { returnDocument: 'after' });
  if (prev?.avatarUrl) removeUpload(prev.avatarUrl);
  res.json(await session(user));
});

router.delete('/avatar', async (req, res) => {
  const prev = await User.findById(req.user.id).select('avatarUrl').lean();
  const user = await User.findByIdAndUpdate(req.user.id, { $unset: { avatarUrl: 1 } }, { returnDocument: 'after' });
  if (prev?.avatarUrl) removeUpload(prev.avatarUrl);
  res.json(await session(user));
});

router.put('/password', async (req, res) => {
  const { current, next } = req.body ?? {};
  if (typeof next !== 'string' || next.length < 6) throw new HttpError(400, 'New password must be at least 6 characters', { field: 'next' });
  const user = await User.findById(req.user.id).select('+password');
  if (!(await bcrypt.compare(String(current || ''), user.password))) {
    throw new HttpError(400, 'Your current password is not correct', { field: 'current' });
  }
  // Logs out every other device (someone who knew the old password); this one gets a fresh login.
  const updated = await User.findByIdAndUpdate(
    user._id,
    { password: await bcrypt.hash(next, 10), $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' },
  ).select('+tokenVersion');
  res.json({ ok: true, ...startSession(req, res, updated) });
});

// Deletes your own account for good, after checking the password. A company owner takes the
// whole company with them (team, pipeline, chats); a recruiter only removes their own login.
// Payments are kept as financial records. Admin accounts are removed by changing ADMIN_EMAILS.
router.delete('/', async (req, res) => {
  const user = await User.findById(req.user.id).select('+password email emailVerified adminRole');
  if (!(await bcrypt.compare(String(req.body?.password || ''), user.password))) {
    throw new HttpError(400, 'Your password is not correct', { field: 'password' });
  }
  if (adminRoleOf(user)) throw new HttpError(400, 'Admin accounts cannot be deleted from here');
  const out = await deleteAccount(user._id);
  endSession(res);
  res.json({ ok: true, ...out });
});

export default router;
