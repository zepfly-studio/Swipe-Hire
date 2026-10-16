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

// Third-party tools switched on from the admin panel (analytics, chat widgets, WhatsApp button).
export const INTEGRATION_DEFAULTS = {
  googleAnalytics: { on: false, id: '' },
  googleTagManager: { on: false, id: '' },
  metaPixel: { on: false, id: '' },
  clarity: { on: false, id: '' },
  tawk: { on: false, id: '' },
  crisp: { on: false, id: '' },
  whatsapp: { on: false, number: '', text: '' },
  custom: { on: false, code: '' },
};
export const integrations = () => ({ ...INTEGRATION_DEFAULTS, ...getSetting('integrations', {}) });

// What the public website needs (GET /api/site).
export function publicSite() {
  const m = maintenance();
  // Only the tools that are on (and set up) are sent, so the website loads nothing extra.
  const live = Object.fromEntries(
    Object.entries(integrations()).filter(([, v]) => v.on && (v.id || v.number || v.code)),
  );
  return {
    maintenance: { on: Boolean(m.on), message: m.message || '' },
    content: siteContent(),
    taxonomy: taxonomyExtra(),
    integrations: live,
  };
}
