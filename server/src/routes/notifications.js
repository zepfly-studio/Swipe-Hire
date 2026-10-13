import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ user: req.user.id, readAt: null }),
  ]);
  res.json({
    unread,
    notifications: items.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      at: n.createdAt,
      read: Boolean(n.readAt),
    })),
  });
});

router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user.id, readAt: null }, { readAt: new Date() });
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) {
    await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { readAt: new Date() });
  }
  res.json({ ok: true });
});

export default router;
