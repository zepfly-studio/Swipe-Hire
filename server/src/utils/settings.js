import { Setting } from '../models/Setting.js';
import { config, PLANS, demoPayments, razorpayEnabled } from '../config/index.js';
import { mailEnabled } from './mailer.js';

// Admin-editable settings, kept in memory and saved in the Setting collection.
// Every value falls back to the server environment / code default when no admin has set it.
const cache = new Map();

export async function loadSettings() {
  const all = await Setting.find().lean();
  cache.clear();
  for (const s of all) cache.set(s.key, s.value);
}

export const getSetting = (key, fallback) => (cache.has(key) && cache.get(key) !== null ? cache.get(key) : fallback);

export async function setSetting(key, value, adminId) {
  await Setting.updateOne({ key }, { $set: { value, updatedBy: adminId } }, { upsert: true });
  cache.set(key, value);
}

// ---- typed getters ----
export const getPlans = () => getSetting('plans', PLANS);
export const getFreeSwipes = () => getSetting('freeSwipes', config.freeSwipes);

// Testing switches: the admin value wins; otherwise the environment decides.
export const showEmailCodeOn = () => getSetting('showEmailCode', (!mailEnabled && !config.isProd) || process.env.SHOW_EMAIL_CODE === 'true');
export const demoPaymentsOn = () => !razorpayEnabled && getSetting('demoPayments', demoPayments);

export const maintenance = () => getSetting('maintenance', { on: false, message: '' });
export const requireJobApproval = () => getSetting('requireJobApproval', false);
export const adminTwoStep = () => getSetting('adminTwoStep', true);

// Extra suggestion words added by admins on top of shared/taxonomy.js.
export const taxonomyExtra = () => getSetting('taxonomy', { skills: [], cities: [], roles: [] });
// Editable public content: FAQ (null = the built-in one) and the About page intro.
export const siteContent = () => getSetting('content', { faq: null, aboutIntro: '' });

// What the public website needs (GET /api/site).
export function publicSite() {
  const m = maintenance();
  return {
    maintenance: { on: Boolean(m.on), message: m.message || '' },
    content: siteContent(),
    taxonomy: taxonomyExtra(),
  };
}
