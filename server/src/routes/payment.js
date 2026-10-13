import crypto from 'node:crypto';
import { Router } from 'express';
import Razorpay from 'razorpay';
import { auth, requireRole } from '../middleware/auth.js';
import { config, PLANS, razorpayEnabled, demoPayments } from '../config/index.js';
import { Payment } from '../models/Payment.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { HttpError } from '../utils/HttpError.js';
import { withSignedFiles } from '../utils/signedUrl.js';

const router = Router();
const razorpay = razorpayEnabled
  ? new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret })
  : null;

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const safeEqual = (a, b) =>
  typeof a === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Adds the order's swipes exactly once. The check and the credit happen in a
// single atomic update on the company document, so double calls (browser +
// webhook, retries, a crash in between) can never credit twice or lose credits.
async function creditOrder(payment, paymentId) {
  const res = await CompanyProfile.updateOne(
    { user: payment.company, creditedOrders: { $ne: payment.orderId } },
    {
      $inc: { swipesLeft: payment.swipes, swipesPurchased: payment.swipes },
      $push: { creditedOrders: payment.orderId },
    },
  );
  await Payment.updateOne({ _id: payment._id }, { status: 'paid', paymentId: paymentId || payment.paymentId || payment.orderId });
  return res.modifiedCount === 1 ? payment.swipes : 0;
}

router.get('/plans', (_req, res) => {
  res.json({ plans: PLANS, freeSwipes: config.freeSwipes, demoMode: demoPayments });
});

// Razorpay -> server notification. Credits orders even if the buyer closed the tab.
export async function razorpayWebhook(req, res) {
  const secret = config.razorpay.webhookSecret;
  if (!secret) return res.status(503).json({ message: 'Webhook not configured' });
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  if (!safeEqual(req.get('x-razorpay-signature'), hmac(secret, body))) {
    return res.status(400).json({ message: 'Invalid signature' });
  }
  const event = JSON.parse(body.toString('utf8'));
  if (['payment.captured', 'order.paid'].includes(event.event)) {
    const entity = event.payload?.payment?.entity;
    const payment = entity?.order_id && (await Payment.findOne({ orderId: entity.order_id }));
    if (payment && entity.amount === payment.amount * 100) await creditOrder(payment, entity.id);
  }
  res.json({ ok: true });
}

router.use(auth, requireRole('company'));

router.post('/order', async (req, res) => {
  const plan = PLANS.find((p) => p.id === req.body?.planId);
  if (!plan) throw new HttpError(400, 'Please choose a valid plan');
  if (!razorpay && !demoPayments) throw new HttpError(503, 'Payments are not available right now');

  let orderId;
  if (razorpay) {
    const order = await razorpay.orders.create({
      amount: plan.price * 100,
      currency: 'INR',
      receipt: `sh_${Date.now()}`,
      notes: { planId: plan.id, company: req.user.companyId },
    });
    orderId = order.id;
  } else {
    orderId = `demo_${crypto.randomBytes(8).toString('hex')}`;
  }

  await Payment.create({
    company: req.user.companyId,
    planId: plan.id,
    amount: plan.price,
    swipes: plan.swipes,
    orderId,
    mode: razorpay ? 'razorpay' : 'demo',
  });

  res.json({
    mode: razorpay ? 'razorpay' : 'demo',
    orderId,
    amount: plan.price * 100,
    currency: 'INR',
    keyId: config.razorpay.keyId,
    plan,
  });
});

router.post('/verify', async (req, res) => {
  const { orderId, paymentId, signature } = req.body ?? {};
  const payment = await Payment.findOne({ orderId: String(orderId || ''), company: req.user.companyId });
  if (!payment) throw new HttpError(404, 'Order not found');

  if (payment.mode === 'razorpay') {
    if (!razorpay || !safeEqual(signature, hmac(config.razorpay.keySecret, `${orderId}|${paymentId}`))) {
      throw new HttpError(400, 'Payment verification failed');
    }
  } else if (!demoPayments) {
    throw new HttpError(400, 'Payment verification failed');
  }

  const added = await creditOrder(payment, paymentId);
  const profile = await CompanyProfile.findOne({ user: req.user.companyId }).lean();
  res.json({ profile: withSignedFiles(profile), added });
});

export default router;
