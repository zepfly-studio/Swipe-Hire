import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { perm } from '../middleware/admin.js';
import { removeUpload } from '../middleware/upload.js';
import { User } from '../models/User.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Job } from '../models/Job.js';
import { Swipe } from '../models/Swipe.js';
import { Message } from '../models/Message.js';
import { Payment } from '../models/Payment.js';
import { Notification } from '../models/Notification.js';
import { Report } from '../models/Report.js';
import { Ticket } from '../models/Ticket.js';
import { AdminLog } from '../models/AdminLog.js';
import { config, razorpayEnabled } from '../config/index.js';
import { HttpError } from '../utils/HttpError.js';
import { mailEnabled, sendMail } from '../utils/mailer.js';
import { notify, notifyCompany } from '../utils/notify.js';
import { withSignedFiles } from '../utils/signedUrl.js';
import { text } from '../utils/fields.js';
import { adminRoleOf, isAdminEmail, logAdmin } from '../utils/adminAccess.js';
import {
  adminTwoStep, demoPaymentsOn, getFreeSwipes, getPlans, getSetting, maintenance, requireJobApproval, setSetting, showEmailCodeOn,
  siteContent, taxonomyExtra, integrations,
} from '../utils/settings.js';

// More admin tools. Mounted inside routes/admin.js, after its admin-login check.
const router = Router();

const PAGE_SIZE = 25;
const page = (q) => Math.max(1, Math.min(1000, Number.parseInt(q.page, 10) || 1));
const oid = (id, what) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, `Invalid ${what}`);
  return new mongoose.Types.ObjectId(String(id));
};
const paged = (total, p) => ({ total, page: p, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
const names = async (ids) => {
  const users = await User.find({ _id: { $in: ids } }).select('name email role companyId').lean();
  const companies = await CompanyProfile.find({ user: { $in: ids } }).select('user companyName').lean();
  const co = Object.fromEntries(companies.map((c) => [String(c.user), c.companyName]));
  return Object.fromEntries(users.map((u) => [String(u._id), { id: String(u._id), name: co[String(u._id)] || u.name, person: u.name, email: u.email, role: u.companyId ? 'recruiter' : u.role }]));
};
const ownerOf = (u) => String(u.companyId || u._id);

// ======================= accounts =======================
router.patch('/users/:id/profile', perm('users.edit'), async (req, res) => {
  const id = oid(req.params.id, 'user');
  const user = await User.findById(id).select('name email role companyId').lean();
  if (!user) throw new HttpError(404, 'User not found');
  const b = req.body ?? {};
  const changed = [];
  if (b.name !== undefined) {
    const name = text(b.name, 80);
    if (!name) throw new HttpError(400, 'Name cannot be empty', { field: 'name' });
    await User.updateOne({ _id: id }, { name });
    changed.push('name');
  }
  if (user.role === 'candidate' && b.candidate) {
    const c = b.candidate;
    const set = {};
    for (const [k, max] of [['headline', 80], ['location', 80], ['phone', 20], ['currentCompany', 80], ['currentPost', 80], ['about', 600]]) {
      if (c[k] !== undefined) set[k] = text(c[k], max);
    }
    if (Object.keys(set).length) {
      await CandidateProfile.updateOne({ user: id }, { $set: set });
      changed.push(...Object.keys(set));
    }
  }
  if (user.role === 'company' && b.company) {
    const c = b.company;
    const set = {};
    for (const [k, max] of [['companyName', 100], ['location', 80], ['industry', 60], ['website', 200], ['phone', 20], ['contactEmail', 120], ['about', 1500], ['address', 200]]) {
      if (c[k] !== undefined) set[k] = text(c[k], max);
    }
    if (set.companyName === '') throw new HttpError(400, 'Company name cannot be empty', { field: 'companyName' });
    if (Object.keys(set).length) {
      await CompanyProfile.updateOne({ user: ownerOf(user) }, { $set: set });
      changed.push(...Object.keys(set));
    }
  }
  if (!changed.length) throw new HttpError(400, 'Nothing to change');
  await logAdmin(req, 'user.edit', { targetType: 'user', targetId: id, summary: `${user.email}: ${changed.join(', ')}` });
  res.json({ ok: true, changed });
});

// Sets a new random password, logs the user out everywhere and emails it to them.
router.post('/users/:id/temp-password', perm('users.edit'), async (req, res) => {
  const id = oid(req.params.id, 'user');
  const user = await User.findById(id).select('name email emailVerified adminRole').lean();
  if (!user) throw new HttpError(404, 'User not found');
  if (adminRoleOf(user)) throw new HttpError(400, 'Admin passwords cannot be reset here');
  const password = crypto.randomBytes(9).toString('base64url').slice(0, 12);
  await User.updateOne({ _id: id }, { $set: { password: await bcrypt.hash(password, 10) }, $inc: { tokenVersion: 1 } });
  let emailed = false;
  try {
    await sendMail({
      to: user.email,
      subject: 'Your new Glide Recruit password',
      text: `Hi ${user.name.split(' ')[0]},\n\nOur support team has reset your password. Your new password is:\n\n${password}\n\nLog in and change it in Account settings.\n\n— Team Glide Recruit`,
    });
    emailed = mailEnabled;
  } catch (err) {
    console.error('[admin] temp password email failed:', err.message);
  }
  await logAdmin(req, 'user.temp-password', { targetType: 'user', targetId: id, summary: user.email });
  res.json({ ok: true, password, emailed });
});

// ======================= chats =======================
router.get('/users/:id/chats', perm('chats'), async (req, res) => {
  const id = oid(req.params.id, 'user');
  const user = await User.findById(id).select('role companyId').lean();
  if (!user) throw new HttpError(404, 'User not found');
  const isCand = user.role === 'candidate';
  const match = isCand ? { candidate: id } : { company: new mongoose.Types.ObjectId(ownerOf(user)) };
  const groups = await Message.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $group: { _id: { company: '$company', candidate: '$candidate' }, count: { $sum: 1 }, last: { $first: '$text' }, at: { $first: '$createdAt' } } },
    { $sort: { at: -1 } },
    { $limit: 100 },
  ]);
  const who = await names(groups.flatMap((g) => [g._id.company, g._id.candidate]));
  res.json({
    chats: groups.map((g) => ({
      company: who[String(g._id.company)] || { id: String(g._id.company), name: 'Deleted company' },
      candidate: who[String(g._id.candidate)] || { id: String(g._id.candidate), name: 'Deleted candidate' },
      count: g.count,
      last: g.last,
      at: g.at,
    })),
  });
});

router.get('/chats', perm('chats'), async (req, res) => {
  const company = oid(req.query.company, 'company');
  const candidate = oid(req.query.candidate, 'candidate');
  const messages = await Message.find({ company, candidate }).sort({ createdAt: 1 }).limit(500).lean();
  const who = await names([...new Set(messages.map((m) => String(m.sender)))]);
  res.json({
    messages: messages.map((m) => ({ id: String(m._id), text: m.text, at: m.createdAt, fromCandidate: String(m.sender) === String(candidate), sender: who[String(m.sender)]?.person || 'Deleted user' })),
  });
});

router.delete('/messages/:id', perm('chats'), async (req, res) => {
  const m = await Message.findByIdAndDelete(oid(req.params.id, 'message')).lean();
  if (!m) throw new HttpError(404, 'Message not found');
  await logAdmin(req, 'message.delete', { targetType: 'message', targetId: m._id, summary: m.text.slice(0, 120) });
  res.json({ ok: true });
});

// ======================= resume & video review =======================
router.get('/review', perm('review'), async (req, res) => {
  const p = page(req.query);
  // live = everything currently shown to companies (uploads are live at once); removed = taken down by an admin.
  const removed = req.query.status === 'removed';
  const where = removed ? { 'review.status': 'rejected' } : { step: 3, 'review.status': { $ne: 'rejected' } };
  const [total, list] = await Promise.all([
    CandidateProfile.countDocuments(where),
    CandidateProfile.find(where).sort(removed ? { 'review.at': -1 } : { mediaAt: -1, updatedAt: -1 }).skip((p - 1) * PAGE_SIZE).limit(PAGE_SIZE).populate('user', 'name email').lean(),
  ]);
  res.json({
    ...paged(total, p),
    candidates: list
      .filter((c) => c.user)
      .map((c) => {
        const s = withSignedFiles(c);
        return { id: String(c.user._id), name: c.user.name, email: c.user.email, headline: c.headline, location: c.location, resumeUrl: s.resumeUrl, videoUrl: s.videoUrl, review: c.review || null, uploadedAt: c.mediaAt || c.updatedAt };
      }),
  });
});

router.post('/review/approve-many', perm('review'), async (req, res) => {
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((x) => mongoose.isValidObjectId(x)).slice(0, 100);
  if (!ids.length) throw new HttpError(400, 'Select at least one candidate');
  const r = await CandidateProfile.updateMany({ user: { $in: ids }, step: 3 }, { $set: { review: { status: 'approved', at: new Date() } } });
  await logAdmin(req, 'review.approve-many', { targetType: 'candidate', summary: `${r.modifiedCount} candidates approved` });
  res.json({ ok: true, approved: r.modifiedCount });
});

// approve | reject-video | reject-resume. A rejection removes the file and asks the candidate to upload a new one.
router.post('/review/:userId', perm('review'), async (req, res) => {
  const id = oid(req.params.userId, 'candidate');
  const action = req.body?.action;
  const note = text(req.body?.note, 300) || '';
  const profile = await CandidateProfile.findOne({ user: id }).populate('user', 'email').lean();
  if (!profile) throw new HttpError(404, 'Candidate not found');
  if (action === 'approve') {
    await CandidateProfile.updateOne({ user: id }, { $set: { review: { status: 'approved', at: new Date() } } });
  } else if (action === 'reject-video' || action === 'reject-resume') {
    const isVideo = action === 'reject-video';
    removeUpload(isVideo ? profile.videoUrl : profile.resumeUrl);
    await CandidateProfile.updateOne(
      { user: id },
      { $unset: { [isVideo ? 'videoUrl' : 'resumeUrl']: 1 }, $set: { step: isVideo ? 2 : 1, review: { status: 'rejected', note, at: new Date() } } },
    );
    notify(id, {
      type: 'verified',
      title: isVideo ? 'Please record a new intro video' : 'Please upload your resume again',
      body: `${isVideo ? 'Your intro video' : 'Your resume'} was removed by our team${note ? `: ${note}` : '.'} Your profile is hidden until you add a new one.`,
      link: '/candidate/onboarding?edit',
      email: true,
    });
  } else {
    throw new HttpError(400, 'Invalid action');
  }
  await logAdmin(req, `review.${action}`, { targetType: 'candidate', targetId: id, summary: `${profile.user?.email}${note ? `: ${note}` : ''}` });
  res.json({ ok: true });
});

// ======================= reports =======================
router.get('/reports', perm('reports'), async (req, res) => {
  const p = page(req.query);
  const where = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? { status: req.query.status } : {};
  const [total, list] = await Promise.all([Report.countDocuments(where), Report.find(where).sort({ createdAt: -1 }).skip((p - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean()]);
  const who = await names(list.flatMap((r) => [r.reporter, r.target, r.handledBy].filter(Boolean)));
  const counts = await Report.aggregate([{ $match: { target: { $in: list.map((r) => r.target) } } }, { $group: { _id: '$target', n: { $sum: 1 } } }]);
  const totalFor = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({
    ...paged(total, p),
    reports: list.map((r) => ({
      id: String(r._id),
      reporter: who[String(r.reporter)] || { name: 'Deleted user' },
      target: who[String(r.target)] || { id: String(r.target), name: 'Deleted user' },
      targetReports: totalFor[String(r.target)] || 1,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolution: r.resolution,
      handledBy: r.handledBy && who[String(r.handledBy)]?.person,
      handledAt: r.handledAt,
      createdAt: r.createdAt,
    })),
  });
});

router.patch('/reports/:id', perm('reports'), async (req, res) => {
  const status = req.body?.status;
  if (!['open', 'resolved', 'dismissed'].includes(status)) throw new HttpError(400, 'Invalid status');
  const r = await Report.findByIdAndUpdate(
    oid(req.params.id, 'report'),
    { status, resolution: text(req.body?.resolution, 500), handledBy: req.user.id, handledAt: new Date() },
    { new: true },
  ).lean();
  if (!r) throw new HttpError(404, 'Report not found');
  await logAdmin(req, `report.${status}`, { targetType: 'report', targetId: r._id, summary: `${r.reason}${r.resolution ? `: ${r.resolution}` : ''}` });
  res.json({ ok: true });
});

// ======================= support tickets =======================
const ticketOut = (t, who = {}) => ({
  id: String(t._id),
  subject: t.subject,
  category: t.category,
  status: t.status,
  user: who[String(t.user)] || { id: String(t.user), name: 'Deleted user' },
  messages: t.messages.map((m) => ({ from: m.from, text: m.text, at: m.at, author: m.from === 'admin' ? who[String(m.author)]?.person || 'Support' : undefined })),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

router.get('/tickets', perm('tickets'), async (req, res) => {
  const p = page(req.query);
  const where = ['open', 'answered', 'closed'].includes(req.query.status) ? { status: req.query.status } : {};
  const [total, list] = await Promise.all([Ticket.countDocuments(where), Ticket.find(where).sort({ updatedAt: -1 }).skip((p - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean()]);
  const who = await names(list.map((t) => t.user));
  res.json({ ...paged(total, p), tickets: list.map((t) => ({ ...ticketOut(t, who), messages: undefined, count: t.messages.length, last: t.messages.at(-1)?.text })) });
});

router.get('/tickets/:id', perm('tickets'), async (req, res) => {
  const t = await Ticket.findById(oid(req.params.id, 'ticket')).lean();
  if (!t) throw new HttpError(404, 'Ticket not found');
  res.json({ ticket: ticketOut(t, await names([t.user, ...t.messages.map((m) => m.author).filter(Boolean)])) });
});

router.post('/tickets/:id/reply', perm('tickets'), async (req, res) => {
  const msg = text(req.body?.text, 3000);
  if (!msg) throw new HttpError(400, 'Write a reply first', { field: 'text' });
  const status = req.body?.close ? 'closed' : 'answered';
  const t = await Ticket.findByIdAndUpdate(
    oid(req.params.id, 'ticket'),
    { $push: { messages: { from: 'admin', author: req.user.id, text: msg } }, $set: { status } },
    { new: true },
  ).lean();
  if (!t) throw new HttpError(404, 'Ticket not found');
  notify(t.user, { type: 'support', title: `Reply to "${t.subject}"`, body: msg.slice(0, 200), link: '/support', email: true });
  await logAdmin(req, 'ticket.reply', { targetType: 'ticket', targetId: t._id, summary: t.subject });
  res.json({ ticket: ticketOut(t, await names([t.user, ...t.messages.map((m) => m.author).filter(Boolean)])) });
});

router.patch('/tickets/:id', perm('tickets'), async (req, res) => {
  const status = req.body?.status;
  if (!['open', 'answered', 'closed'].includes(status)) throw new HttpError(400, 'Invalid status');
  const t = await Ticket.findByIdAndUpdate(oid(req.params.id, 'ticket'), { status }, { new: true }).lean();
  if (!t) throw new HttpError(404, 'Ticket not found');
  await logAdmin(req, `ticket.${status}`, { targetType: 'ticket', targetId: t._id, summary: t.subject });
  res.json({ ok: true });
});

// ======================= announcements =======================
// audience: all | candidates | companies (owners + recruiters) | selected (ids)
router.post('/announce', perm('announce'), async (req, res) => {
  const { audience, ids, email } = req.body ?? {};
  const title = text(req.body?.title, 120);
  const body = text(req.body?.body, 1000) || '';
  const link = text(req.body?.link, 200) || '';
  if (!title) throw new HttpError(400, 'Add a title', { field: 'title' });
  if (link && !link.startsWith('/')) throw new HttpError(400, 'The link must be a page on this site, e.g. /company/plans', { field: 'link' });
  const where = { suspended: { $ne: true }, emailVerified: { $ne: false } };
  if (audience === 'candidates') where.role = 'candidate';
  else if (audience === 'companies') where.role = 'company';
  else if (audience === 'selected') {
    const list = (Array.isArray(ids) ? ids : []).filter((x) => mongoose.isValidObjectId(x));
    if (!list.length) throw new HttpError(400, 'Select at least one user');
    // Selecting a company owner reaches the whole team.
    where.$or = [{ _id: { $in: list } }, { companyId: { $in: list } }];
  } else if (audience !== 'all') throw new HttpError(400, 'Choose who should get it');
  const users = await User.find(where).select('_id email name').lean();
  const recipients = users.filter((u) => !isAdminEmail(u.email));
  await Notification.insertMany(recipients.map((u) => ({ user: u._id, type: 'announcement', title, body, link })));
  if (email && recipients.length) {
    // Sent in the background, one by one, so a big list doesn't block the request.
    (async () => {
      for (const u of recipients) {
        await sendMail({ to: u.email, subject: `${title} · Glide Recruit`, text: `Hi ${u.name.split(' ')[0]},\n\n${body}\n\n${link ? `Open: ${config.clientUrls[0]}${link}\n\n` : ''}— Team Glide Recruit` }).catch(() => {});
      }
    })();
  }
  await logAdmin(req, 'announce', { targetType: 'users', summary: `"${title}" to ${audience} (${recipients.length})${email ? ' + email' : ''}` });
  res.json({ ok: true, sent: recipients.length });
});

// ======================= analytics =======================
router.get('/analytics', perm('view'), async (req, res) => {
  const days = Math.max(7, Math.min(90, Number.parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - (days - 1) * 864e5);
  since.setHours(0, 0, 0, 0);
  const byDay = (Model, match = {}, extra = {}) =>
    Model.aggregate([
      { $match: { ...match, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, n: { $sum: 1 }, ...extra } },
    ]);
  const top = (Model, match, field, n = 10) =>
    Model.aggregate([{ $match: match }, { $unwind: `$${field}` }, { $group: { _id: { $toLower: `$${field}` }, label: { $first: `$${field}` }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: n }]);
  const [cand, comp, swipes, rights, msgs, revenue, pipeline, candSkills, jobSkills, candCities, jobCities, totals] = await Promise.all([
    byDay(User, { role: 'candidate' }),
    byDay(User, { role: 'company', companyId: { $exists: false } }),
    byDay(Swipe),
    byDay(Swipe, { action: 'right' }),
    byDay(Message),
    byDay(Payment, { status: 'paid', mode: { $in: ['razorpay', 'manual'] } }, { amount: { $sum: '$amount' } }),
    Swipe.aggregate([{ $match: { action: 'right' } }, { $group: { _id: '$stage', n: { $sum: 1 } } }]),
    top(CandidateProfile, { step: 3 }, 'skills'),
    top(Job, { status: 'open' }, 'requiredSkills'),
    CandidateProfile.aggregate([{ $match: { step: 3, location: { $nin: [null, ''] } } }, { $group: { _id: { $toLower: '$location' }, label: { $first: '$location' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]),
    Job.aggregate([{ $match: { status: 'open', jobLocation: { $nin: [null, ''] } } }, { $group: { _id: { $toLower: '$jobLocation' }, label: { $first: '$jobLocation' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]),
    Promise.all([Swipe.countDocuments(), Swipe.countDocuments({ action: 'right' }), Swipe.countDocuments({ action: 'right', stage: 'hired' })]),
  ]);
  const keys = Array.from({ length: days }, (_, i) => new Date(since.getTime() + i * 864e5 + 12 * 36e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const val = (rows, k, f = 'n') => rows.find((r) => r._id === k)?.[f] || 0;
  const list = (rows) => rows.map((r) => ({ label: r.label, n: r.n }));
  const stages = ['shortlisted', 'contacted', 'task', 'interview', 'hired', 'rejected'];
  res.json({
    days,
    series: keys.map((k) => ({
      day: k,
      candidates: val(cand, k),
      companies: val(comp, k),
      swipes: val(swipes, k),
      shortlists: val(rights, k),
      messages: val(msgs, k),
      revenue: val(revenue, k, 'amount'),
    })),
    pipeline: stages.map((s) => ({ stage: s, n: pipeline.find((p) => p._id === s)?.n || 0 })),
    topCandidateSkills: list(candSkills),
    topJobSkills: list(jobSkills),
    candidatesByCity: list(candCities),
    jobsByCity: list(jobCities),
    rates: { swipes: totals[0], shortlists: totals[1], hired: totals[2] },
  });
});

// ======================= payments: manual & refunds =======================
router.post('/payments/manual', perm('credits'), async (req, res) => {
  const companyId = oid(req.body?.companyId, 'company');
  const amount = Number(req.body?.amount);
  const swipes = Number(req.body?.swipes);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) throw new HttpError(400, 'Enter the amount received (₹)', { field: 'amount' });
  if (!Number.isInteger(swipes) || swipes < 1 || swipes > 100000) throw new HttpError(400, 'Enter the number of swipes to add', { field: 'swipes' });
  const company = await CompanyProfile.findOne({ user: companyId }).select('companyName').lean();
  if (!company) throw new HttpError(404, 'Company not found');
  const orderId = `manual_${crypto.randomBytes(8).toString('hex')}`;
  await Payment.create({ company: companyId, planId: 'manual', amount: Math.round(amount), swipes, orderId, paymentId: text(req.body?.reference, 100) || orderId, mode: 'manual', status: 'paid', note: text(req.body?.note, 300) });
  const updated = await CompanyProfile.findOneAndUpdate({ user: companyId }, { $inc: { swipesLeft: swipes, swipesPurchased: swipes }, $push: { creditedOrders: orderId } }, { new: true }).lean();
  notifyCompany(companyId, { type: 'verified', title: `${swipes} swipes added to your account`, body: 'Thank you for your payment.', link: '/company/plans' });
  await logAdmin(req, 'payment.manual', { targetType: 'company', targetId: companyId, summary: `${company.companyName}: ₹${Math.round(amount)} for ${swipes} swipes` });
  res.status(201).json({ ok: true, swipesLeft: updated.swipesLeft });
});

// Marks a paid order as refunded and (optionally) takes its swipes back. The money itself is
// returned from the Razorpay dashboard (or by bank / UPI for manual payments).
router.post('/payments/:id/refund', perm('credits'), async (req, res) => {
  const p = await Payment.findById(oid(req.params.id, 'payment')).lean();
  if (!p) throw new HttpError(404, 'Payment not found');
  if (p.status !== 'paid') throw new HttpError(400, 'Only paid orders can be refunded');
  await Payment.updateOne({ _id: p._id }, { status: 'refunded', refundedAt: new Date(), note: [p.note, text(req.body?.note, 300)].filter(Boolean).join(' · ') || undefined });
  let swipesLeft;
  if (req.body?.removeSwipes) {
    const c = await CompanyProfile.findOne({ user: p.company }).select('swipesLeft').lean();
    swipesLeft = Math.max(0, (c?.swipesLeft || 0) - p.swipes);
    await CompanyProfile.updateOne({ user: p.company }, { $set: { swipesLeft } });
  }
  await logAdmin(req, 'payment.refund', { targetType: 'payment', targetId: p._id, summary: `₹${p.amount} (${p.orderId})${req.body?.removeSwipes ? `, ${p.swipes} swipes removed` : ''}` });
  res.json({ ok: true, swipesLeft });
});

// ======================= settings =======================
router.get('/settings', perm('settings'), async (_req, res) => {
  res.json({
    site: {
      maintenance: maintenance(),
      showEmailCode: showEmailCodeOn(),
      demoPayments: demoPaymentsOn(),
      requireJobApproval: requireJobApproval(),
      adminTwoStep: adminTwoStep(),
      freeSwipes: getFreeSwipes(),
    },
    overridden: { showEmailCode: getSetting('showEmailCode', null) !== null, demoPayments: getSetting('demoPayments', null) !== null },
    env: { razorpay: razorpayEnabled, email: mailEnabled, production: config.isProd },
    plans: getPlans(),
    content: siteContent(),
    taxonomy: taxonomyExtra(),
  });
});

const bool = (v) => (typeof v === 'boolean' ? v : undefined);
router.put('/settings/site', perm('settings'), async (req, res) => {
  const b = req.body ?? {};
  const done = [];
  if (b.maintenance) {
    await setSetting('maintenance', { on: Boolean(b.maintenance.on), message: text(b.maintenance.message, 300) || '' }, req.user.id);
    done.push(`maintenance ${b.maintenance.on ? 'on' : 'off'}`);
  }
  for (const k of ['showEmailCode', 'demoPayments', 'requireJobApproval', 'adminTwoStep']) {
    if (b[k] === null) {
      await setSetting(k, null, req.user.id);
      done.push(`${k} reset`);
    } else if (bool(b[k]) !== undefined) {
      await setSetting(k, b[k], req.user.id);
      done.push(`${k} ${b[k] ? 'on' : 'off'}`);
    }
  }
  if (b.freeSwipes !== undefined) {
    const n = Number(b.freeSwipes);
    if (!Number.isInteger(n) || n < 0 || n > 1000) throw new HttpError(400, 'Free swipes must be a whole number from 0 to 1000', { field: 'freeSwipes' });
    await setSetting('freeSwipes', n, req.user.id);
    done.push(`free swipes ${n}`);
  }
  if (!done.length) throw new HttpError(400, 'Nothing to change');
  await logAdmin(req, 'settings.site', { targetType: 'setting', summary: done.join(', ') });
  res.json({ ok: true });
});

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
router.put('/settings/plans', perm('settings'), async (req, res) => {
  const input = Array.isArray(req.body?.plans) ? req.body.plans : null;
  if (!input || !input.length) throw new HttpError(400, 'Keep at least one plan');
  if (input.length > 6) throw new HttpError(400, 'You can have up to 6 plans');
  const seen = new Set();
  const plans = input.map((p, i) => {
    const name = text(p.name, 40);
    const price = Number(p.price);
    const swipes = Number(p.swipes);
    if (!name) throw new HttpError(400, `Plan ${i + 1}: add a name`);
    if (!Number.isInteger(price) || price < 1 || price > 1000000) throw new HttpError(400, `${name}: price must be a whole number of rupees (1 or more)`);
    if (!Number.isInteger(swipes) || swipes < 1 || swipes > 100000) throw new HttpError(400, `${name}: swipes must be a whole number (1 or more)`);
    const id = slug(p.id || name) || `plan-${i + 1}`;
    if (seen.has(id)) throw new HttpError(400, `Two plans have the same name or id: ${name}`);
    seen.add(id);
    const perks = (Array.isArray(p.perks) ? p.perks : []).map((x) => text(x, 80)).filter(Boolean).slice(0, 6);
    return { id, name, price, swipes, perks, popular: Boolean(p.popular) };
  });
  await setSetting('plans', plans, req.user.id);
  await logAdmin(req, 'settings.plans', { targetType: 'setting', summary: plans.map((p) => `${p.name} ₹${p.price}/${p.swipes}`).join(', ') });
  res.json({ ok: true, plans });
});

router.put('/settings/content', perm('settings'), async (req, res) => {
  const b = req.body ?? {};
  let faq = null;
  if (Array.isArray(b.faq)) {
    faq = b.faq.map((f) => ({ q: text(f.q, 200), a: text(f.a, 1000) })).filter((f) => f.q && f.a).slice(0, 20);
    if (!faq.length) faq = null;
  }
  // Contact details for the Contact page and the legal pages (also needed for Razorpay).
  const c = b.contact || {};
  const contactEmail = text(c.email, 120) || '';
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new HttpError(400, 'Enter a valid contact email', { field: 'contactEmail' });
  const contact = { business: text(c.business, 120) || '', email: contactEmail, phone: text(c.phone, 20) || '', address: text(c.address, 300) || '' };
  const content = { faq, aboutIntro: text(b.aboutIntro, 1000) || '', contact };
  await setSetting('content', content, req.user.id);
  await logAdmin(req, 'settings.content', { targetType: 'setting', summary: `FAQ: ${faq ? faq.length : 'default'}, about intro ${content.aboutIntro ? 'custom' : 'default'}` });
  res.json({ ok: true, content });
});

router.put('/settings/taxonomy', perm('settings'), async (req, res) => {
  const clean = (list) => [...new Map((Array.isArray(list) ? list : []).map((x) => text(x, 60)).filter(Boolean).map((x) => [x.toLowerCase(), x])).values()].slice(0, 500);
  const taxonomy = { skills: clean(req.body?.skills), cities: clean(req.body?.cities), roles: clean(req.body?.roles) };
  await setSetting('taxonomy', taxonomy, req.user.id);
  await logAdmin(req, 'settings.taxonomy', { targetType: 'setting', summary: `${taxonomy.skills.length} skills, ${taxonomy.cities.length} cities, ${taxonomy.roles.length} roles` });
  res.json({ ok: true, taxonomy });
});

// ---- third-party integrations ----
// Each ID goes into a script URL on the public site, so only the provider's own format is
// accepted. Pasted embed snippets/URLs are reduced to the ID.
const INTEGRATION_IDS = {
  googleAnalytics: { rx: /\b(G-[A-Z0-9]{4,20})\b/i, label: 'Google Analytics ID (G-XXXXXXX)', up: true },
  googleTagManager: { rx: /\b(GTM-[A-Z0-9]{4,12})\b/i, label: 'Tag Manager ID (GTM-XXXXXX)', up: true },
  metaPixel: { rx: /^\s*(\d{6,20})\s*$|fbq\('init',\s*'(\d{6,20})'/, label: 'Meta Pixel ID (numbers only)' },
  clarity: { rx: /clarity\.ms\/tag\/([a-z0-9]{6,20})|^\s*([a-z0-9]{6,20})\s*$/i, label: 'Clarity project ID' },
  tawk: { rx: /([a-f0-9]{24}\/[a-z0-9]{6,12})/i, label: 'Tawk.to property/widget ID (e.g. 64ab…/1h2k3l)' },
  crisp: { rx: /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i, label: 'Crisp website ID' },
};

router.get('/settings/integrations', perm('settings'), (req, res) => {
  res.json({ integrations: integrations(), canEditCode: req.admin.role === 'super' });
});

router.put('/settings/integrations', perm('settings'), async (req, res) => {
  const b = req.body ?? {};
  const next = integrations();
  const changed = [];
  for (const [key, { rx, label, up }] of Object.entries(INTEGRATION_IDS)) {
    if (!b[key]) continue;
    const raw = String(b[key].id ?? next[key].id ?? '').trim();
    let id = '';
    if (raw) {
      const m = raw.match(rx);
      id = m && (m[1] || m[2]);
      if (!id) throw new HttpError(400, `Enter a valid ${label}`, { field: key });
      if (up) id = id.toUpperCase();
    }
    const on = Boolean(b[key].on) && Boolean(id);
    if (on !== next[key].on || id !== next[key].id) changed.push(`${key} ${on ? 'on' : 'off'}`);
    next[key] = { on, id };
  }
  if (b.whatsapp) {
    const number = String(b.whatsapp.number ?? '').replace(/[^\d]/g, '');
    if (number && (number.length < 10 || number.length > 15)) throw new HttpError(400, 'Enter the WhatsApp number with country code, e.g. 919876543210', { field: 'whatsapp' });
    const w = { on: Boolean(b.whatsapp.on) && Boolean(number), number, text: text(b.whatsapp.text, 200) || '' };
    if (JSON.stringify(w) !== JSON.stringify(next.whatsapp)) changed.push(`whatsapp ${w.on ? 'on' : 'off'}`);
    next.whatsapp = w;
  }
  if (b.custom) {
    // Raw code runs on every visitor's browser, so only super admins may change it.
    if (req.admin.role !== 'super') throw new HttpError(403, 'Only a super admin can change custom code', { field: 'custom' });
    const code = String(b.custom.code ?? '').slice(0, 20000);
    const c = { on: Boolean(b.custom.on) && Boolean(code.trim()), code };
    if (JSON.stringify(c) !== JSON.stringify(next.custom)) changed.push(`custom code ${c.on ? 'on' : 'off'}`);
    next.custom = c;
  }
  await setSetting('integrations', next, req.user.id);
  if (changed.length) await logAdmin(req, 'settings.integrations', { targetType: 'setting', summary: changed.join(', ') });
  res.json({ ok: true, integrations: next });
});


// ======================= admin team =======================
router.get('/admins', perm('admins'), async (_req, res) => {
  const [supers, staff] = await Promise.all([
    User.find({ email: { $in: config.adminEmails } }).select('name email emailVerified createdAt').lean(),
    User.find({ adminRole: { $exists: true } }).select('name email adminRole createdAt').lean(),
  ]);
  res.json({
    admins: [
      ...config.adminEmails.map((email) => {
        const u = supers.find((s) => s.email === email);
        return { id: u && String(u._id), name: u?.name || '(no account yet)', email, role: 'super', fixed: true, hasAccount: Boolean(u) };
      }),
      ...staff.filter((u) => !isAdminEmail(u.email)).map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.adminRole, fixed: false, hasAccount: true })),
    ],
  });
});
router.post('/admins', perm('admins'), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = req.body?.role;
  if (!['moderator', 'support', 'finance'].includes(role)) throw new HttpError(400, 'Choose a role', { field: 'role' });
  if (isAdminEmail(email)) throw new HttpError(400, 'This email is already a super admin (set in the server environment)', { field: 'email' });
  const user = await User.findOne({ email }).select('emailVerified suspended').lean();
  if (!user) throw new HttpError(404, 'No account with this email. Ask them to sign up first, then add them here.', { field: 'email' });
  if (user.emailVerified === false) throw new HttpError(400, 'This account has not verified its email yet', { field: 'email' });
  if (user.suspended) throw new HttpError(400, 'This account is suspended', { field: 'email' });
  await User.updateOne({ _id: user._id }, { adminRole: role });
  await logAdmin(req, 'admin.add', { targetType: 'user', targetId: user._id, summary: `${email} as ${role}` });
  res.status(201).json({ ok: true });
});
router.delete('/admins/:id', perm('admins'), async (req, res) => {
  const id = oid(req.params.id, 'user');
  const u = await User.findOneAndUpdate({ _id: id, adminRole: { $exists: true } }, { $unset: { adminRole: 1 } }).lean();
  if (!u) throw new HttpError(404, 'Admin not found');
  await logAdmin(req, 'admin.remove', { targetType: 'user', targetId: id, summary: `${u.email} (${u.adminRole})` });
  res.json({ ok: true });
});

// ======================= activity log =======================
router.get('/logs', perm('logs'), async (req, res) => {
  const p = page(req.query);
  const where = {};
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(q.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    where.$or = [{ action: rx }, { summary: rx }, { adminEmail: rx }];
  }
  const [total, logs] = await Promise.all([AdminLog.countDocuments(where), AdminLog.find(where).sort({ createdAt: -1 }).skip((p - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean()]);
  res.json({ ...paged(total, p), logs: logs.map((l) => ({ id: String(l._id), admin: l.adminEmail, action: l.action, targetType: l.targetType, targetId: l.targetId, summary: l.summary, at: l.createdAt })) });
});

// ======================= CSV export =======================
// Values starting with = + - @ are prefixed so spreadsheets don't run them as formulas.
const cell = (v) => {
  if (v === null || v === undefined) return '';
  let s = Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (head, rows) => [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

router.get('/export/:kind', perm('export'), async (req, res) => {
  const kind = req.params.kind;
  let out;
  if (kind === 'candidates') {
    const [users, profiles] = await Promise.all([User.find({ role: 'candidate' }).select('name email emailVerified suspended createdAt').lean(), CandidateProfile.find().lean()]);
    const by = Object.fromEntries(profiles.map((p) => [String(p.user), p]));
    out = csv(
      ['Name', 'Email', 'Phone', 'Headline', 'Location', 'Experience (yrs)', 'Expected min (LPA)', 'Expected max (LPA)', 'Negotiable', 'Notice', 'Skills', 'Qualification', 'Degree', 'College', 'Profile complete', 'Open to work', 'Suspended', 'Email verified', 'Joined'],
      users.filter((u) => !isAdminEmail(u.email)).map((u) => {
        const p = by[String(u._id)] || {};
        return [u.name, u.email, p.phone, p.headline, p.location, p.experienceYears, p.expectedSalary, p.expectedSalaryMax, p.salaryNegotiable ? 'yes' : 'no', p.noticePeriod, p.skills, p.qualification, p.degree, p.college, p.step >= 3 ? 'yes' : 'no', p.openToWork === false ? 'no' : 'yes', u.suspended ? 'yes' : 'no', u.emailVerified === false ? 'no' : 'yes', u.createdAt];
      }),
    );
  } else if (kind === 'companies') {
    const [owners, profiles, jobs] = await Promise.all([
      User.find({ role: 'company', companyId: { $exists: false } }).select('name email suspended createdAt').lean(),
      CompanyProfile.find().lean(),
      Job.aggregate([{ $group: { _id: '$company', n: { $sum: 1 } } }]),
    ]);
    const by = Object.fromEntries(profiles.map((p) => [String(p.user), p]));
    const jc = Object.fromEntries(jobs.map((j) => [String(j._id), j.n]));
    out = csv(
      ['Company', 'Owner', 'Email', 'Industry', 'Size', 'Location', 'Website', 'Phone', 'Verification', 'GSTIN', 'Swipes left', 'Swipes bought', 'Jobs', 'Suspended', 'Joined'],
      owners.filter((u) => !isAdminEmail(u.email)).map((u) => {
        const c = by[String(u._id)] || {};
        return [c.companyName, u.name, u.email, c.industry, c.companySize, c.location, c.website, c.phone, c.verification?.status || 'none', c.gstin, c.swipesLeft, c.swipesPurchased, jc[String(u._id)] || 0, u.suspended ? 'yes' : 'no', u.createdAt];
      }),
    );
  } else if (kind === 'jobs') {
    const jobs = await Job.find().lean();
    const co = Object.fromEntries((await CompanyProfile.find().select('user companyName').lean()).map((c) => [String(c.user), c.companyName]));
    out = csv(
      ['Title', 'Company', 'Status', 'Approved', 'Location', 'Work mode', 'Job type', 'Salary min (LPA)', 'Salary max (LPA)', 'Exp min', 'Exp max', 'Openings', 'Skills', 'Posted'],
      jobs.map((j) => [j.title, co[String(j.company)], j.status, j.approved === false ? 'no' : 'yes', j.jobLocation, j.workMode, j.jobType, j.salaryMin, j.salaryMax, j.minExperience, j.maxExperience, j.openings, j.requiredSkills, j.createdAt]),
    );
  } else if (kind === 'payments') {
    const pays = await Payment.find().sort({ createdAt: -1 }).lean();
    const co = Object.fromEntries((await CompanyProfile.find().select('user companyName').lean()).map((c) => [String(c.user), c.companyName]));
    out = csv(
      ['Date', 'Company', 'Plan', 'Amount (₹)', 'Swipes', 'Mode', 'Status', 'Order', 'Payment', 'Note'],
      pays.map((p) => [p.createdAt, co[String(p.company)], p.planId, p.amount, p.swipes, p.mode, p.status, p.orderId, p.paymentId, p.note]),
    );
  } else {
    throw new HttpError(404, 'Unknown export');
  }
  await logAdmin(req, 'export', { targetType: 'export', summary: kind });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="glide-recruit-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + out);
});

export default router;
