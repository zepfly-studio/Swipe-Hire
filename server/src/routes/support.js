import { Router } from 'express';
import mongoose from 'mongoose';
import { auth, requireVerified } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Report, REPORT_REASONS } from '../models/Report.js';
import { Ticket } from '../models/Ticket.js';
import { HttpError } from '../utils/HttpError.js';
import { text } from '../utils/fields.js';

// Reports (flag another user) and support tickets (ask the Glide Recruit team for help).
const router = Router();
router.use(auth, requireVerified);

const DAY = 24 * 60 * 60 * 1000;

router.post('/reports', async (req, res) => {
  const { targetId, reason } = req.body ?? {};
  if (!mongoose.isValidObjectId(targetId)) throw new HttpError(400, 'Invalid user');
  if (!REPORT_REASONS.includes(reason)) throw new HttpError(400, 'Please choose a reason', { field: 'reason' });
  const target = await User.findById(targetId).select('role companyId').lean();
  if (!target) throw new HttpError(404, 'User not found');
  // Companies are reported as a whole (their owner account).
  const targetUser = target.role === 'company' && target.companyId ? target.companyId : target._id;
  const reporter = req.user.role === 'company' ? req.user.companyId : req.user.id;
  if (String(targetUser) === String(reporter)) throw new HttpError(400, 'You cannot report yourself');
  if ((await Report.countDocuments({ reporter: req.user.id, createdAt: { $gte: new Date(Date.now() - DAY) } })) >= 10) {
    throw new HttpError(429, 'You have sent a lot of reports today. Please try again tomorrow.');
  }
  if (await Report.exists({ reporter: req.user.id, target: targetUser, status: 'open' })) {
    return res.status(200).json({ ok: true, duplicate: true });
  }
  await Report.create({ reporter: req.user.id, target: targetUser, reason, details: text(req.body.details, 1000) });
  res.status(201).json({ ok: true });
});

// ---- support tickets ----
const publicTicket = (t) => ({
  id: String(t._id),
  subject: t.subject,
  category: t.category,
  status: t.status,
  messages: t.messages.map((m) => ({ from: m.from, text: m.text, at: m.at })),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

router.get('/tickets', async (req, res) => {
  const tickets = await Ticket.find({ user: req.user.id }).sort({ updatedAt: -1 }).limit(50).lean();
  res.json({ tickets: tickets.map(publicTicket) });
});

router.post('/tickets', async (req, res) => {
  const subject = text(req.body?.subject, 120);
  const message = text(req.body?.message, 3000);
  if (!subject) throw new HttpError(400, 'Please add a subject', { field: 'subject' });
  if (!message) throw new HttpError(400, 'Please describe how we can help', { field: 'message' });
  if ((await Ticket.countDocuments({ user: req.user.id, status: { $ne: 'closed' } })) >= 5) {
    throw new HttpError(400, 'You already have 5 open requests. Please wait for a reply.');
  }
  const category = ['account', 'payment', 'bug', 'other'].includes(req.body?.category) ? req.body.category : 'other';
  const t = await Ticket.create({ user: req.user.id, subject, category, messages: [{ from: 'user', author: req.user.id, text: message }] });
  res.status(201).json({ ticket: publicTicket(t) });
});

router.post('/tickets/:id/reply', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid request');
  const message = text(req.body?.text, 3000);
  if (!message) throw new HttpError(400, 'Message cannot be empty', { field: 'text' });
  const t = await Ticket.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $push: { messages: { from: 'user', author: req.user.id, text: message } }, $set: { status: 'open' } },
    { new: true },
  );
  if (!t) throw new HttpError(404, 'Request not found');
  res.json({ ticket: publicTicket(t) });
});

export default router;
