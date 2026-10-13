import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { auth, requireVerified } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { Swipe } from '../models/Swipe.js';
import { User } from '../models/User.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Notification } from '../models/Notification.js';
import { HttpError } from '../utils/HttpError.js';
import { companiesThatContacted, shortlistedPair } from '../utils/pairs.js';
import { notify, notifyCompany } from '../utils/notify.js';
import { signUrl } from '../utils/signedUrl.js';

const router = Router();
router.use(auth, requireVerified);

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user.id,
  message: { message: 'You are sending messages too fast, please slow down' },
});

// A conversation is company <-> candidate. On the company side every team member
// shares it, so "mine" means "sent by our side", not "sent by me".
const sideId = (user) => (user.role === 'company' ? user.companyId : user.id);
const isMine = (user, m) => (user.role === 'company' ? String(m.sender) !== String(m.candidate) : String(m.sender) === user.id);

// Name/subtitle of the person on the other side of each conversation.
async function describe(role, ids) {
  if (role === 'company') {
    const profiles = await CandidateProfile.find({ user: { $in: ids } }).populate('user', 'name avatarUrl').lean();
    return new Map(profiles.filter((p) => p.user).map((p) => [String(p.user._id), { name: p.user.name, subtitle: p.headline, avatarUrl: signUrl(p.user.avatarUrl) }]));
  }
  const profiles = await CompanyProfile.find({ user: { $in: ids } }).lean();
  return new Map(
    profiles.map((p) => [String(p.user), { name: p.companyName, subtitle: p.industry || p.location, verified: p.verification?.status === 'verified', avatarUrl: signUrl(p.logoUrl) }]),
  );
}

// Messages from the other side that we haven't read yet.
const unreadFilter = (user) =>
  user.role === 'company'
    ? { $expr: { $eq: ['$sender', '$candidate'] } }
    : { $expr: { $ne: ['$sender', '$candidate'] } };

// Everyone this user can chat with (shortlisted pairs), newest activity first.
async function contactsOf(me) {
  const mine = me.role === 'company' ? 'company' : 'candidate';
  const theirs = me.role === 'company' ? 'candidate' : 'company';
  const myId = new mongoose.Types.ObjectId(sideId(me));

  let swipes = await Swipe.find({ [mine]: myId, action: 'right' }).sort({ createdAt: -1 }).lean();
  // Candidates only see companies that have contacted them (a shortlist alone stays anonymous).
  if (me.role !== 'company') {
    const contacted = await companiesThatContacted(me.id);
    swipes = swipes.filter((s) => contacted.has(String(s.company)));
  }
  // A candidate shortlisted for two jobs is still one conversation.
  const latestSwipe = new Map();
  for (const s of swipes) if (!latestSwipe.has(String(s[theirs]))) latestSwipe.set(String(s[theirs]), s);
  const otherIds = [...latestSwipe.keys()];

  const [people, last, unread] = await Promise.all([
    describe(me.role, otherIds),
    Message.aggregate([
      { $match: { [mine]: myId } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: `$${theirs}`, text: { $first: '$text' }, at: { $first: '$createdAt' }, sender: { $first: '$sender' }, candidate: { $first: '$candidate' } } },
    ]),
    Message.aggregate([{ $match: { [mine]: myId, readAt: null, ...unreadFilter(me) } }, { $group: { _id: `$${theirs}`, n: { $sum: 1 } } }]),
  ]);
  const lastBy = new Map(last.map((m) => [String(m._id), m]));
  const unreadBy = new Map(unread.map((u) => [String(u._id), u.n]));

  const conversations = otherIds
    .map((id) => {
      const person = people.get(id);
      if (!person) return null;
      const s = latestSwipe.get(id);
      const lm = lastBy.get(id);
      return {
        id,
        ...person,
        stage: s.stage,
        lastMessage: lm ? { text: lm.text, at: lm.at, mine: isMine(me, lm) } : null,
        unread: unreadBy.get(id) ?? 0,
        updatedAt: lm?.at ?? s.createdAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return conversations;
}

// The inbox: only conversations that have messages. Shortlisting alone doesn't
// start one; the company opens a chat from Shortlisted (or "New message").
router.get('/', async (req, res) => {
  res.json({ conversations: (await contactsOf(req.user)).filter((c) => c.lastMessage) });
});

// People you can start a new chat with ("New message" picker).
router.get('/contacts', async (req, res) => {
  const contacts = (await contactsOf(req.user)).map(({ lastMessage, unread, ...c }) => ({ ...c, hasChat: Boolean(lastMessage) }));
  res.json({ contacts });
});

router.get('/unread-count', async (req, res) => {
  const field = req.user.role === 'company' ? 'company' : 'candidate';
  const count = await Message.countDocuments({ [field]: sideId(req.user), readAt: null, ...unreadFilter(req.user) });
  res.json({ count });
});

router.get('/:otherId', async (req, res) => {
  const { pair, otherId } = await shortlistedPair(req.user, req.params.otherId);
  const [messages, people, senders] = await Promise.all([
    Message.find(pair).sort({ createdAt: -1 }).limit(200).lean(),
    describe(req.user.role, [otherId]),
    req.user.role === 'company'
      ? User.find({ $or: [{ _id: req.user.companyId }, { companyId: req.user.companyId }] }).select('name').lean()
      : [],
  ]);
  await Message.updateMany({ ...pair, readAt: null, ...unreadFilter(req.user) }, { readAt: new Date() });
  // Company side: show which teammate wrote each message.
  const nameOf = new Map(senders.map((u) => [String(u._id), u.name.split(' ')[0]]));
  res.json({
    with: { id: otherId, ...people.get(otherId) },
    messages: messages.reverse().map((m) => ({
      id: m._id,
      text: m.text,
      mine: isMine(req.user, m),
      by: req.user.role === 'company' && String(m.sender) !== req.user.id ? nameOf.get(String(m.sender)) : undefined,
      at: m.createdAt,
      read: Boolean(m.readAt),
    })),
  });
});

function messageText(body) {
  const text = String(body?.text ?? '').trim();
  if (!text) throw new HttpError(400, 'Message cannot be empty');
  if (text.length > 2000) throw new HttpError(400, 'Message is too long (max 2000 characters)');
  return text;
}

// Company -> many shortlisted candidates at once (e.g. everyone shortlisted for a job).
// Each one gets their own chat message, plus the usual in-app and email notification.
const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  message: { message: 'You have sent a lot of group messages, please try again in an hour' },
});
const MAX_BULK = 50;

router.post('/bulk', bulkLimiter, async (req, res) => {
  if (req.user.role !== 'company') throw new HttpError(403, 'Only companies can message several candidates at once');
  const text = messageText(req.body);
  const ids = [...new Set((Array.isArray(req.body?.candidateIds) ? req.body.candidateIds : []).map(String))];
  if (!ids.length) throw new HttpError(400, 'Choose at least one candidate');
  if (ids.length > MAX_BULK) throw new HttpError(400, `You can message up to ${MAX_BULK} candidates at once`);
  let sent = 0;
  const skipped = [];
  for (const id of ids) {
    try {
      await deliver(req.user, id, text);
      sent += 1;
    } catch (err) {
      if (!(err instanceof HttpError)) throw err;
      skipped.push(id); // not shortlisted by us, or an invalid id
    }
  }
  res.status(201).json({ sent, skipped });
});

router.post('/:otherId', sendLimiter, async (req, res) => {
  const msg = await deliver(req.user, req.params.otherId, messageText(req.body));
  res.status(201).json({ message: { id: msg._id, text: msg.text, mine: true, at: msg.createdAt, read: false } });
});

// Saves one message and notifies the other side.
async function deliver(user, toId, text) {
  const { pair, otherId } = await shortlistedPair(user, toId);
  const isCompany = user.role === 'company';

  const msg = await Message.create({ ...pair, sender: user.id, text });

  // The first company message moves the candidate to "contacted" (for every job they're shortlisted for).
  if (isCompany) await Swipe.updateMany({ ...pair, action: 'right', stage: 'shortlisted' }, { stage: 'contacted' });

  // One unread "new message" notification per conversation is enough; don't spam.
  const from = isCompany ? pair.company : user.id;
  const pending = await Notification.exists({ user: isCompany ? otherId : pair.company, from, type: 'message', readAt: null });
  if (!pending) {
    const senderName = isCompany
      ? (await CompanyProfile.findOne({ user: pair.company }).lean())?.companyName
      : (await User.findById(user.id).select('name').lean())?.name;
    const payload = {
      type: 'message',
      title: `New message from ${senderName || 'Swipe Hire'}`,
      body: text.length > 120 ? `${text.slice(0, 117)}…` : text,
      link: `/messages?with=${isCompany ? pair.company : user.id}`,
      from,
      email: true,
    };
    if (isCompany) notify(otherId, payload);
    else notifyCompany(pair.company, payload);
  }
  return msg;
}

export default router;
