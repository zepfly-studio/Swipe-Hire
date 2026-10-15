import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

// The secret signs logins and file links, so never fall back to a known value.
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32 || jwtSecret.startsWith('change-me')) {
  throw new Error('Set JWT_SECRET in server/.env to a random string of at least 32 characters');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret,
  jwtExpiresIn: '30d',
  // Login cookie: 'lax' when the site and API share a domain (recommended), 'none' if they're on different domains.
  cookieSameSite: ['strict', 'lax', 'none'].includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'lax',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  freeSwipes: Number(process.env.FREE_SWIPES ?? 5),
  // Accounts with these emails can open the admin page (company verification).
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'Glide Recruit <no-reply@swipehire.in>',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
};

export const razorpayEnabled = Boolean(config.razorpay.keyId && config.razorpay.keySecret);

// Simulated purchases for testing (one click gives the credits, no money). Must be switched
// on explicitly. On the live site it also needs DEMO_PAYMENTS_ON_LIVE=true, for testing before
// Razorpay is set up; anyone could get free credits, so remove both before launch.
export const demoPayments =
  process.env.DEMO_PAYMENTS === 'true' && !razorpayEnabled && (!isProd || process.env.DEMO_PAYMENTS_ON_LIVE === 'true');

// Pricing is still being finalised with the client - edit plans here.
export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 399,
    swipes: 150,
    perks: ['150 candidate swipes', 'Full resume & intro video access', 'Unlimited wishlist', 'Contact details on shortlist'],
  },
];
