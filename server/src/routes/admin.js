import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { config } from '../config/index.js';
import { HttpError } from '../utils/HttpError.js';
import { notifyCompany } from '../utils/notify.js';

const router = Router();

export const isAdminEmail = (email) => config.adminEmails.includes(String(email).toLowerCase());

router.use(auth, async (req, _res, next) => {
  // A verified email is required, so nobody can claim an admin address by signing up with it.
  const user = await User.findById(req.user.id).select('email emailVerified').lean();
  if (!user || !isAdminEmail(user.email) || user.emailVerified === false) throw new HttpError(403, 'Admins only');
  next();
});

router.get('/verifications', async (_req, res) => {
  const pending = await CompanyProfile.find({ 'verification.status': 'pending' })
    .populate('user', 'name email')
    .sort({ updatedAt: 1 })
    .lean();
  res.json({
    companies: pending.map((c) => ({
      id: String(c.user._id),
      companyName: c.companyName,
      website: c.website,
      location: c.location,
      gstin: c.gstin,
      contact: { name: c.user.name, email: c.user.email },
      requestedAt: c.updatedAt,
    })),
  });
});

router.post('/verifications/:companyId', async (req, res) => {
  const { companyId } = req.params;
  if (!mongoose.isValidObjectId(companyId)) throw new HttpError(400, 'Invalid company');
  const approve = req.body?.approve === true;
  const updated = await CompanyProfile.findOneAndUpdate(
    { user: companyId, 'verification.status': 'pending' },
    {
      'verification.status': approve ? 'verified' : 'rejected',
      'verification.method': 'gst',
      'verification.verifiedAt': approve ? new Date() : undefined,
    },
  );
  if (!updated) throw new HttpError(404, 'No pending request for this company');
  notifyCompany(companyId, {
    type: 'verified',
    title: approve ? 'Your company is verified ✓' : 'Verification was not approved',
    body: approve
      ? 'Candidates now see a verified badge next to your company name.'
      : 'We could not verify your GSTIN. Please check it, or verify with your work email instead.',
    link: '/company/verify',
    email: true,
  });
  res.json({ ok: true });
});

export default router;
