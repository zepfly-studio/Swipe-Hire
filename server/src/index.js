import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { UPLOADS_DIR } from './config/paths.js';
import { errorHandler } from './middleware/error.js';
import { apiLimiter, securityHeaders } from './middleware/security.js';
import { verifySignedRequest, uploadHeaders } from './utils/signedUrl.js';
import authRoutes from './routes/auth.js';
import candidateRoutes from './routes/candidate.js';
import companyRoutes from './routes/company.js';
import paymentRoutes, { razorpayWebhook } from './routes/payment.js';
import chatRoutes from './routes/chat.js';
import notificationRoutes from './routes/notifications.js';
import interviewRoutes from './routes/interviews.js';
import taskRoutes from './routes/tasks.js';
import adminRoutes from './routes/admin.js';
import jobRoutes from './routes/jobs.js';
import teamRoutes from './routes/team.js';
import accountRoutes from './routes/account.js';

const app = express();

// How many proxies sit in front of the server, so rate limits see the visitor's real IP:
// 1 = Render alone; 2 = Vercel's /api proxy in front of Render (set TRUST_PROXY=2 there).
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.disable('x-powered-by');
app.use(securityHeaders);
// credentials: the login cookie is only accepted from our own site's origins.
app.use(cors({ origin: config.clientUrls, credentials: true }));
app.use('/api', apiLimiter);
// Webhook needs the raw body to check Razorpay's signature, so it goes before express.json().
app.post('/api/payment/webhook', express.raw({ type: '*/*', limit: '1mb' }), razorpayWebhook);
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', verifySignedRequest, express.static(UPLOADS_DIR, { maxAge: '3h', setHeaders: uploadHeaders }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/candidate', candidateRoutes);
// Jobs first: otherwise /api/company would also run its auth for /api/company/jobs.
app.use('/api/company/jobs', jobRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

await connectDB();
app.listen(config.port, () => console.log(`[api] running on http://localhost:${config.port}`));
